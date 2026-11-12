// Invisible Journeys: War Room + Mission Control.
// One small Node server: serves the dashboard, runs agents through the Claude Agent SDK, streams everything live (SSE).
//   npm start            -> real agents (needs ANTHROPIC_API_KEY in .env)
//   npm run demo         -> simulated agents, free, to explore the dashboard
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// minimal .env loader (no dependency)
try { for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}

const { loadAgents, READ_ONLY } = await import('./lib/agents.js');
const { Store } = await import('./lib/store.js');
const { runAgent, DEMO, MODE, CLAUDE_BIN } = await import('./lib/runner.js');

const PORT = +(process.env.WARROOM_PORT || 4747);
const HOST = process.env.WARROOM_HOST || '127.0.0.1';
const TOKEN = process.env.WARROOM_TOKEN || '';
const WORKSPACE = path.resolve(ROOT, process.env.WARROOM_WORKSPACE || '..');
// Efficiency: agents share weighted slots (Haiku 0.5, Sonnet 1, Opus 2) out of WARROOM_SLOTS (default 6), so five
// Sonnet agents can work at once while Opus is rationed. A usage governor pauses NEW work when the API-equivalent spend of
// the last 5 hours passes WARROOM_WINDOW_USD (a soft cap on the plan's usage); Claude's own limit message also pauses it.
const SLOTS = +(process.env.WARROOM_SLOTS || 6);
const WINDOW_MS = 5 * 3600e3, WINDOW_USD = +(process.env.WARROOM_WINDOW_USD || 25);
const DEEP_MODEL = process.env.WARROOM_DEEP_MODEL || 'claude-opus-5-5', ROUTER_MODEL = process.env.WARROOM_ROUTER_MODEL || 'claude-haiku-5-5';
const weight = (model) => (/opus/.test(model || '') ? 2 : /haiku/.test(model || '') ? 0.5 : 1);
let limitedUntil = 0;   // set when Claude says the plan's limit is reached
const MAX_DEPTH = 2; // how many delegation hops an agent chain may take on its own

const agents = loadAgents(path.join(ROOT, 'agents'));
const byId = Object.fromEntries(agents.map((a) => [a.id, a]));
const store = new Store(path.join(ROOT, 'data'));
const live = Object.fromEntries(agents.map((a) => [a.id, { status: 'idle', taskId: null, last: '' }]));
const approvals = new Map(); // id -> {id, taskId, agent, tool, summary, resolve}
const aborts = new Map(); // taskId -> AbortController
const uid = () => crypto.randomBytes(5).toString('hex');

// ---------------- live events (SSE) ----------------
const clients = new Set();
function emit(type, data) { const s = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`; for (const c of clients) c.write(s); }
const publicTask = (t) => ({ ...t, log: undefined, logCount: t.log.length });
function setAgent(id, patch) { Object.assign(live[id], patch); emit('agent', { id, ...live[id] }); }
function hive(entry) { emit('hive', store.addHive(entry)); }
const SPEND_F = path.join(ROOT, 'data', 'spend.json');
const spendLog = (() => { try { return JSON.parse(fs.readFileSync(SPEND_F, 'utf8')); } catch { return []; } })();
function addSpend(cost) { if (!cost) return; spendLog.push({ t: Date.now(), c: cost }); while (spendLog.length && spendLog[0].t < Date.now() - 24 * 3600e3) spendLog.shift(); try { fs.writeFileSync(SPEND_F, JSON.stringify(spendLog)); } catch {} }
const windowSpend = () => spendLog.filter((e) => e.t > Date.now() - WINDOW_MS).reduce((a, e) => a + e.c, 0);
function usage() {
  const w = windowSpend(), used = store.tasks.filter((t) => t.status === 'running').reduce((a, t) => a + weight(t.model || byId[t.agent]?.model), 0);
  const oldest = spendLog.find((e) => e.t > Date.now() - WINDOW_MS);
  const paused = limitedUntil > Date.now() ? 'limit' : w >= WINDOW_USD ? 'cap' : '';
  return { mode: MODE, window: +w.toFixed(2), cap: WINDOW_USD, slots: SLOTS, used, paused, resumeAt: paused === 'limit' ? limitedUntil : paused === 'cap' && oldest ? oldest.t + WINDOW_MS : null };
}
function noteResult(r) {
  addSpend(r.cost);
  if (r.limited) { limitedUntil = Math.max(limitedUntil, r.resetAt && r.resetAt > Date.now() ? r.resetAt : Date.now() + 30 * 60e3); hive({ agent: null, kind: 'info', text: `Claude usage limit reached: new work waits until ${new Date(limitedUntil).toLocaleTimeString()}` }); }
  emit('usage', usage());
}
setInterval(() => { emit('usage', usage()); pump(); }, 60e3);

// ---------------- context every agent gets ----------------
const BRAIN_F = () => path.join(WORKSPACE, 'channel', 'BRAIN.md');
function brain() { try { return fs.readFileSync(BRAIN_F(), 'utf8').slice(0, 12000); } catch { return '(channel/BRAIN.md is missing)'; } }
function teamContext(agentId) {
  const roster = agents.map((a) => `- @${a.id} (${a.name}): ${a.role}`).join('\n');
  const h = store.recentHive(15).map((e) => `- ${new Date(e.t).toISOString().slice(5, 16).replace('T', ' ')} ${e.agent ? byId[e.agent]?.name || e.agent : 'Commander'}: ${e.text}`).join('\n') || '- (nothing yet)';
  const pinned = store.pinned().trim() || '(none)';
  const mine = store.agentMemory(agentId).trim() || '(none)';
  return `# Your team
${roster}

# Hive mind: what the team did recently (newest first)
${h}

# Pinned memory (from the Commander)
${pinned}

# Your own memory
${mine}

# Team protocol
- Start your final answer with one line: "SUMMARY: <what you did / found, one sentence>".
- To hand work to a teammate, put on its own line: "DELEGATE @<agent-id>: <task>" (at most 2 per answer, only when needed).
- To keep a durable lesson for future tasks: "REMEMBER: <fact>" on its own line.
- The Commander makes final calls. Never claim results you did not verify.`;
}

// ---------------- approvals (Commander gate for anything that changes files or runs commands) ----------------
function makeCanUseTool(task, agent) {
  return async (toolName, input, { signal }) => {
    if (READ_ONLY.has(toolName)) return { behavior: 'allow', updatedInput: input };
    const fp = String(input.file_path || input.notebook_path || '');
    if (['Write', 'Edit', 'MultiEdit'].includes(toolName) && fp) {
      const rel = path.relative(WORKSPACE, path.resolve(WORKSPACE, fp)).replace(/\\/g, '/');
      if (!rel.startsWith('..') && agent.writes.some((w) => rel.startsWith(w))) return { behavior: 'allow', updatedInput: input };
    }
    const id = uid();
    const summary = toolName === 'Bash' ? String(input.command || '') : fp || JSON.stringify(input).slice(0, 300);
    const ap = { id, taskId: task.id, taskTitle: task.title, agent: agent.id, tool: toolName, summary, t: Date.now() };
    emit('approval', ap);
    setAgent(agent.id, { status: 'waiting' });
    const decision = await new Promise((resolve) => {
      approvals.set(id, { ...ap, resolve });
      const to = setTimeout(() => resolve(false), 15 * 60 * 1000);
      signal?.addEventListener('abort', () => { clearTimeout(to); resolve(false); });
    });
    approvals.delete(id);
    emit('approval-done', { id, allowed: decision });
    setAgent(agent.id, { status: 'working' });
    return decision ? { behavior: 'allow', updatedInput: input } : { behavior: 'deny', message: 'The Commander denied this action. Continue without it or explain what you need.' };
  };
}

// ---------------- routing ----------------
function keywordRoute(text) {
  const lc = text.toLowerCase();
  let best = byId.producer ? 'producer' : agents[0].id, score = 0;
  for (const a of agents) { const s = a.keywords.reduce((n, k) => n + (lc.includes(String(k).toLowerCase()) ? 1 : 0), 0); if (s > score) { score = s; best = a.id; } }
  return { agent: best, reason: score ? 'matched keywords' : 'default to Producer' };
}
async function route(text) {
  const at = text.match(/@([a-z]+)/i);
  if (at && byId[at[1].toLowerCase()]) return { agent: at[1].toLowerCase(), reason: 'named by the Commander' };
  const kw = keywordRoute(text);
  if (DEMO || kw.reason === 'matched keywords') return kw;   // free: only unclear orders go to the (cheap) router model
  try {
    const r = await runAgent({
      agent: { ...byId.producer || agents[0], model: ROUTER_MODEL, effort: 'low', preset: false, prompt: 'You route tasks to the right specialist. Reply with ONE line of JSON only: {"agent":"<id>","reason":"<5-10 words>"}' },
      prompt: `Agents:\n${agents.map((a) => `${a.id}: ${a.role}`).join('\n')}\n\nTask: ${text}`,
      cwd: WORKSPACE, tools: [], maxTurns: 1, onLog: () => {}, canUseTool: async () => ({ behavior: 'deny', message: 'no tools' }), abort: new AbortController(),
    });
    const j = JSON.parse((r.text.match(/\{[\s\S]*?\}/) || ['{}'])[0]);
    addSpend(r.cost);
    if (byId[j.agent]) return { agent: j.agent, reason: j.reason || 'routed', cost: r.cost };
  } catch {}
  return keywordRoute(text);
}

// ---------------- tasks ----------------
async function createTask({ text, agent, parent = null, depth = 0, by = 'Commander', deep = false }) {
  const task = { deep: !!deep, id: uid(), title: text.split('\n')[0].slice(0, 90), text, agent: agent || null, status: 'routing', created: Date.now(), started: null, finished: null, result: '', cost: 0, turns: 0, log: [], parent, depth, by, routeReason: '' };
  store.tasks.push(task); store.save(); emit('task', publicTask(task));
  if (!task.agent) { const r = await route(text); task.agent = r.agent; task.routeReason = r.reason; task.cost += r.cost || 0; }
  else task.routeReason = by === 'Commander' ? 'assigned by the Commander' : `delegated by ${by}`;
  task.model = deep ? DEEP_MODEL : byId[task.agent].model;
  task.status = 'queued'; store.save(); emit('task', publicTask(task));
  hive({ agent: by === 'Commander' ? null : by, kind: 'task', text: `→ @${task.agent}: ${task.title}` });
  pump();
  return task;
}
function logTo(task, e) { const entry = { t: Date.now(), ...e }; task.log.push(entry); if (task.log.length > 400) task.log.shift(); emit('log', { taskId: task.id, entry }); if (e.kind === 'text' || e.kind === 'tool') setAgent(task.agent, { last: e.text.split('\n')[0].slice(0, 160) }); }
function pump() {
  const u = usage();
  if (u.paused) return;
  const next = store.tasks.find((t) => t.status === 'queued' && live[t.agent]?.status === 'idle' && u.used + weight(t.model || byId[t.agent].model) <= SLOTS);
  if (next) { runTask(next); pump(); }
}
async function runTask(task) {
  const agent = byId[task.agent];
  task.status = 'running'; task.started = Date.now(); store.save(); emit('task', publicTask(task));
  setAgent(agent.id, { status: 'working', taskId: task.id, last: 'Starting…' });
  const abort = new AbortController(); aborts.set(task.id, abort);
  let r;
  try {
    r = await runAgent({ agent: { ...agent, model: task.model || agent.model }, prompt: `${teamContext(agent.id)}\n\n# Task from ${task.by === 'Commander' ? 'the Commander' : '@' + task.by}\n${task.text}`, cwd: WORKSPACE, onLog: (e) => logTo(task, e), canUseTool: makeCanUseTool(task, agent), abort, taskText: task.text });
  } catch (e) { r = { ok: false, text: '', cost: 0, turns: 0, error: String(e?.message || e) }; }
  aborts.delete(task.id); noteResult(r);
  if (r.limited && !abort.signal.aborted) { task.status = 'queued'; task.log.push({ t: Date.now(), kind: 'info', text: 'Paused by the Claude usage limit; it runs again when the limit resets.' }); store.save(); emit('task', publicTask(task)); setAgent(agent.id, { status: 'idle', taskId: null, last: 'waiting for the usage limit to reset' }); return; }
  task.finished = Date.now(); task.result = r.text; task.cost += r.cost; task.turns = r.turns;
  task.status = abort.signal.aborted ? 'stopped' : r.ok ? 'done' : 'failed';
  if (r.error) logTo(task, { kind: 'error', text: r.error });
  const summary = (r.text.match(/^SUMMARY:\s*(.+)$/m) || [])[1] || r.text.split('\n').find((l) => l.trim())?.slice(0, 200) || r.error || task.status;
  task.summary = summary; store.save(); emit('task', publicTask(task));
  hive({ agent: agent.id, kind: task.status, text: summary });
  setAgent(agent.id, { status: 'idle', taskId: null, last: summary });
  if (r.ok) {
    for (const m of r.text.matchAll(/^REMEMBER:\s*(.+)$/gm)) { store.remember(agent.id, m[1]); hive({ agent: agent.id, kind: 'memory', text: `remembered: ${m[1]}` }); }
    const dels = [...r.text.matchAll(/^DELEGATE\s+@([a-z]+)\s*:\s*(.+)$/gm)].slice(0, 2);
    for (const m of dels) {
      if (!byId[m[1]]) continue;
      if (task.depth + 1 > MAX_DEPTH) { hive({ agent: agent.id, kind: 'info', text: `wanted to delegate to @${m[1]} but the chain limit was reached; waiting for the Commander` }); continue; }
      createTask({ text: m[2], agent: m[1], parent: task.id, depth: task.depth + 1, by: agent.id });
    }
  }
  pump();
}

// ---------------- War Room ----------------
const demoSeat = (a, role, q) => () => role === 'marshal'
  ? `STRATEGY: Back the giant-Moon pitch, opening on a giant Moon over a packed beach at frame 1, built mostly in the bay set; spend the saved time on the last 15 s in space.\n\nBATTLE PLAN:\n1. @scout: Lock the fuse fact (Moon recession, 3.8 cm/yr) with a NASA source.\n2. @writer: Board the winning premise with 11 steps and the loop.\n3. @analyst: Review the board as the Scroller: first 3 seconds, steps 2–4, the loop.\n4. @studio: Build the hero look-test shot at half size.\n\nCONSENSUS: all 4 officers back the giant-Moon premise; the Analyst warns the middle steps may repeat.`
  : role === 'tenth'
    ? `OBVIOUS: (1) space topics are oversaturated; (2) 66 s is too long; (3) the fact is too nerdy.\n\nPRE-MORTEM (48 h after posting): 2.1k views, 19% completion. The mechanism: the counter changed every 5 s but the WORLD only changed every 10 s, so steps 2, 4 and 6 read as repeats; viewers learned the pattern by 0:12 and swiped. The loop never paid off because nobody reached it.\n\nPREDICTABILITY: novel (not in the obvious three).`
    : (DEMO_OFFICER[a.id] || DEMO_OFFICER.default);
const DEMO_OFFICER = {
  scout: 'POSITION: Giant Moon. It is the only pitch whose frame 1 reads with the sound off, and its fact is the most solid.\nWHY:\n- The Moon recedes 3.8 cm/yr, measured by lunar laser ranging (https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html).\n- Body-in-the-sky what-ifs are a crowded but proven format (speculative: channel/results.csv is still empty).\nRISK: we must look far more expensive than the copycats.',
  writer: 'POSITION: Giant Moon, but only if every step changes the whole world, not just the Moon size.\nWHY:\n- 11 steps fit 66 s at ~5.5 s each with captions ≥ 2.8 s (PLAYBOOK.md).\n- Tides, light, crowd and sky give 4 world layers to escalate (speculative).\nRISK: steps 2–4 can look identical; each needs its own reaction.',
  studio: 'POSITION: Giant Moon is the cheapest to build well: the bay set, moon, ocean and crowd already exist.\nWHY:\n- engine/src/moon.js and engine/src/bay.js cover 8 of 11 shots in one set.\n- The space ending needs one new set (Earth from orbit).\nRISK: the flood steps need water rising over the promenade, which is not built yet.',
  analyst: 'POSITION: Giant Moon wins frame 1, but the middle is the danger zone.\nWHY:\n- A giant Moon over a crowd reads instantly on a muted phone (speculative: no channel data yet).\n- Escalation formats lose viewers at 0:15–0:30 if the world stops changing.\nRISK: if the counter outruns the visuals, people swipe at step 3.',
  default: 'POSITION: Giant Moon, with conditions.\nWHY:\n- Strongest frame 1 (speculative).\nRISK: repetition in the middle.',
};

async function convene(wr) {
  const officers = wr.seats.filter((s) => s.role === 'officer');
  const ctx = `# Channel brain (what we know works)\n${brain()}\n\n# Context\n${store.recentHive(10).map((e) => `- ${e.agent || 'Commander'}: ${e.text}`).join('\n') || '- (no history yet)'}\nPinned memory: ${store.pinned().trim() || '(none)'}`;
  const seatRun = async (seat, prompt, tools, demoText) => {
    seat.status = 'speaking'; emit('warroom', wr);
    const a = byId[seat.agent];
    const r = await runAgent({ agent: a, prompt, cwd: WORKSPACE, tools, maxTurns: tools.length ? 8 : 1, onLog: (e) => { if (e.kind === 'tool') { seat.notes = e.text; emit('seat', { id: wr.id, seat: seat.key, notes: e.text }); } }, canUseTool: async (name, input) => (READ_ONLY.has(name) ? { behavior: 'allow', updatedInput: input } : { behavior: 'deny', message: 'War Room seats are read-only.' }), abort: wr.abort, demoText });
    noteResult(r);
    seat.text = r.text || r.error || '(no answer)'; seat.cost = r.cost; seat.status = r.ok ? 'done' : 'failed'; wr.cost += r.cost;
    emit('warroom', wr); return r;
  };
  // 1) officers, in parallel, blind to each other
  await Promise.all(officers.map((s) => {
    const a = byId[s.agent];
    return seatRun(s, `WAR ROOM. The Commander must make a call.\nDECISION: ${wr.question}\n\nYou sit as ${a.name}. Your lens: ${a.lens}\nSee the decision ONLY through that lens. You cannot see the other officers. You may read files or search to ground your view.\n${ctx}\n\nAnswer in ≤ 180 words:\nPOSITION: one line\nWHY: 2–4 bullets, each citing a file path, a URL, or marked (speculative)\nRISK: the one thing that would make you wrong`,
      a.tools.filter((t) => ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch'].includes(t)), demoSeat(a, 'officer', wr.question));
  }));
  if (wr.abort.signal.aborted) return finishWr(wr, 'stopped');
  // 2) the Marshal synthesizes from the officers' reads
  wr.stage = 'synthesis'; emit('warroom', wr);
  const marshal = wr.seats.find((s) => s.role === 'marshal');
  const reads = officers.map((s) => `## ${byId[s.agent].name}\n${s.text}`).join('\n\n');
  await seatRun(marshal, `WAR ROOM. DECISION: ${wr.question}\n\nThe officers' independent reads:\n\n${reads}\n\nAs the Marshal, name the winning course of action from THEIR reads (not your own preference). Format:\nSTRATEGY: one paragraph\nBATTLE PLAN: 3–6 numbered lines, each exactly "N. @<agent-id>: <task>" using these ids: ${agents.map((a) => a.id).join(', ')}\nCONSENSUS: one line naming the emerging majority and who dissented`, [], demoSeat(byId[marshal.agent], 'marshal', wr.question));
  wr.strategy = marshal.text;
  if (wr.abort.signal.aborted) return finishWr(wr, 'stopped');
  // 3) the Tenth Man attacks the consensus last (sees only the consensus, not the officers' reasoning)
  wr.stage = 'dissent'; emit('warroom', wr);
  const tenth = wr.seats.find((s) => s.role === 'tenth');
  const consensus = (marshal.text.match(/STRATEGY:[\s\S]*?(?=BATTLE PLAN:|$)/) || [marshal.text])[0] + '\n' + ((marshal.text.match(/CONSENSUS:.*$/m) || [''])[0]);
  await seatRun(tenth, `WAR ROOM. DECISION: ${wr.question}\n\nThe council's consensus:\n${consensus}\n\nYou are the Tenth Man. You SHARED this majority; your duty now is to show how it loses.\nFirst list OBVIOUS: the top-3 objections anyone would predict.\nThen PRE-MORTEM: it is 48 hours after posting and the decision failed. Tell the concrete failure MECHANISM, outside the obvious three if you can. If you can only find obvious ones, say so honestly.\nEnd with PREDICTABILITY: novel | predictable.\nIf you find no grounded attack at all, answer only: ALL CLEAR.`, [], demoSeat(byId[tenth.agent], 'tenth', wr.question));
  wr.dissent = tenth.text;
  finishWr(wr, 'awaiting');
}
function finishWr(wr, stage) { wr.stage = stage; wr.finished = Date.now(); store.save(); emit('warroom', wr); hive({ agent: null, kind: 'warroom', text: `War Room ${stage === 'awaiting' ? 'returned a verdict on' : stage + ':'} "${wr.question.slice(0, 80)}"` }); }
function dossierMarkdown(wr) {
  const d = new Date(wr.created).toISOString();
  return `# War Room dossier: ${wr.question}\n\n- Convened: ${d}\n- Status: ${wr.stage}${wr.verdict ? `\n- Commander's call: ${wr.verdict}` : ''}\n- Cost: $${wr.cost.toFixed(2)}\n\n` +
    wr.seats.filter((s) => s.role === 'officer').map((s) => `## Officer: ${byId[s.agent].name}\n_Lens: ${byId[s.agent].lens}_\n\n${s.text}\n`).join('\n') +
    `\n## Marshal: strategy\n\n${wr.strategy || ''}\n\n## Tenth Man: how we lose\n\n${wr.dissent || ''}\n`;
}

// ---------------- HTTP ----------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const body = (req, max = 1e6) => new Promise((res) => { let s = ''; req.on('data', (c) => { s += c; if (s.length > max) req.destroy(); }); req.on('end', () => { try { res(JSON.parse(s || '{}')); } catch { res({}); } }); });
const json = (res, data, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (TOKEN) {
    const ok = (req.headers.cookie || '').includes(`wr_token=${TOKEN}`) || url.searchParams.get('token') === TOKEN;
    if (!ok) { res.writeHead(401, { 'content-type': 'text/plain' }); return res.end('War Room locked. Open with ?token=YOUR_TOKEN once.'); }
    if (url.searchParams.get('token') === TOKEN) res.setHeader('set-cookie', `wr_token=${TOKEN}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`);
  }
  const p = url.pathname;
  try {
    if (p === '/api/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write('retry: 2000\n\n'); clients.add(res);
      const ka = setInterval(() => res.write(': ka\n\n'), 20000);
      req.on('close', () => { clients.delete(res); clearInterval(ka); });
      return;
    }
    if (p === '/api/intel') {
      let rows = [];
      try { const L = fs.readFileSync(path.join(WORKSPACE, 'channel', 'results.csv'), 'utf8').trim().split(/\r?\n/); const H = L[0].split(','); rows = L.slice(1).map((l) => { const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((x) => x.replace(/,$/, '').replace(/^"|"$/g, '')); return Object.fromEntries(H.map((h, i) => [h, c[i] ?? ''])); }); } catch {}
      return json(res, { brain: brain(), results: rows });
    }
    if (p === '/api/upload' && req.method === 'POST') {
      const b = await body(req, 60e6);
      const day = new Date().toISOString().slice(0, 10), dir = path.join(WORKSPACE, 'channel', 'analytics', day); fs.mkdirSync(dir, { recursive: true });
      const saved = [];
      for (const f of (b.files || []).slice(0, 12)) {
        const m = String(f.data || '').match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/); if (!m) continue;
        const name = `${Date.now()}-${saved.length + 1}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`; fs.writeFileSync(path.join(dir, name), Buffer.from(m[2], 'base64'));
        saved.push(`channel/analytics/${day}/${name}`);
      }
      if (!saved.length) return json(res, { error: 'no images' }, 400);
      hive({ agent: null, kind: 'order', text: `dropped ${saved.length} analytics screenshot(s)` });
      const note = String(b.note || '').trim();
      const t = await createTask({ agent: byId.analyst ? 'analyst' : null, text: `Log the new analytics screenshots${note ? ` (Commander's note: ${note})` : ''}.\nFiles: ${saved.join(', ')}\n1. Read each image. Identify the video by its cover/caption and the numbers shown.\n2. Append one row per video to channel/results.csv (same columns; a new snapshot is a new row; leave unknown fields empty, never guess).\n3. Update channel/BRAIN.md: the Evidence table, Lessons (what the numbers now show, with the sample-size caveat) and Open questions. Keep it under ~1,000 words.\n4. Finish with SUMMARY and the ONE change the next video should make.` });
      return json(res, { ok: true, saved, task: t.id });
    }
    if (p === '/api/state') return json(res, {
      demo: DEMO, mode: MODE, usage: usage(), workspace: WORKSPACE,
      agents: agents.map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, color: a.color, role: a.role, model: a.model, tools: a.tools, lens: a.lens, ...live[a.id], done: store.tasks.filter((t) => t.agent === a.id && t.status === 'done').length, cost: store.tasks.filter((t) => t.agent === a.id).reduce((s, t) => s + t.cost, 0) })),
      tasks: store.tasks.slice(-200).map(publicTask), hive: store.recentHive(120),
      approvals: [...approvals.values()].map(({ resolve, ...a }) => a),
      warrooms: store.warrooms.slice(-30).map(({ abort, ...w }) => w), pinned: store.pinned(),
    });
    if (p.startsWith('/api/tasks/') && req.method === 'GET') { const t = store.tasks.find((x) => x.id === p.split('/')[3]); return t ? json(res, t) : json(res, { error: 'not found' }, 404); }
    if (req.method === 'POST') {
      const b = await body(req);
      if (p === '/api/tasks') { if (!b.text?.trim()) return json(res, { error: 'empty' }, 400); hive({ agent: null, kind: 'order', text: b.text.slice(0, 200) }); const t = await createTask({ text: b.text.trim(), agent: byId[b.agent] ? b.agent : null, deep: !!b.deep }); return json(res, publicTask(t)); }
      let m;
      if (p === '/api/resume') { limitedUntil = 0; hive({ agent: null, kind: 'info', text: 'Commander resumed the queue' }); emit('usage', usage()); pump(); return json(res, { ok: true }); }
      const cancel = (t) => {
        if (!t) return false;
        if (t.status === 'running') { aborts.get(t.id)?.abort(); hive({ agent: null, kind: 'info', text: `stopped @${t.agent}: ${t.title}` }); return true; }
        if (t.status === 'queued' || t.status === 'routing') { t.status = 'stopped'; t.finished = Date.now(); t.log.push({ t: Date.now(), kind: 'info', text: 'Cancelled by the Commander.' }); emit('task', publicTask(t)); hive({ agent: null, kind: 'info', text: `cancelled: ${t.title}` }); return true; }
        return false;
      };
      if ((m = p.match(/^\/api\/tasks\/(\w+)\/stop$/))) { const ok = cancel(store.tasks.find((x) => x.id === m[1])); store.save(); return json(res, { ok }); }
      if (p === '/api/tasks/cancel') {   // {scope: 'queued' | 'running' | 'all'}
        const sc = b.scope || 'queued', want = (t) => (sc === 'all' ? ['queued', 'routing', 'running'] : sc === 'running' ? ['running'] : ['queued', 'routing']).includes(t.status);
        const n = store.tasks.filter(want).map(cancel).filter(Boolean).length; store.save(); pump(); return json(res, { ok: true, n });
      }
      if ((m = p.match(/^\/api\/tasks\/(\w+)\/retry$/))) { const t = store.tasks.find((x) => x.id === m[1]); if (!t) return json(res, { error: 'not found' }, 404); const n = await createTask({ text: t.text, agent: t.agent }); return json(res, publicTask(n)); }
      if ((m = p.match(/^\/api\/approvals\/(\w+)$/))) { const a = approvals.get(m[1]); if (a) a.resolve(!!b.allow); return json(res, { ok: !!a }); }
      if (p === '/api/memory') { store.setPinned(String(b.text || '')); hive({ agent: null, kind: 'memory', text: 'Commander updated pinned memory' }); return json(res, { ok: true }); }
      if (p === '/api/warroom') {
        if (!b.question?.trim()) return json(res, { error: 'empty' }, 400);
        const officerIds = (b.officers?.length ? b.officers : agents.filter((a) => a.id !== 'producer').map((a) => a.id)).filter((id) => byId[id]);
        const wr = { id: uid(), question: b.question.trim(), created: Date.now(), stage: 'convening', cost: 0,
          seats: [...officerIds.map((id) => ({ key: id, agent: id, role: 'officer', status: 'waiting', text: '' })),
            { key: 'marshal', agent: byId.producer ? 'producer' : agents[0].id, role: 'marshal', status: 'waiting', text: '' },
            { key: 'tenth', agent: byId.analyst ? 'analyst' : agents[agents.length - 1].id, role: 'tenth', status: 'waiting', text: '' }] };
        Object.defineProperty(wr, 'abort', { value: new AbortController(), enumerable: false });
        store.warrooms.push(wr); store.save(); emit('warroom', wr);
        hive({ agent: null, kind: 'warroom', text: `War Room convened: "${wr.question.slice(0, 80)}"` });
        convene(wr).catch((e) => { wr.error = String(e?.message || e); finishWr(wr, 'failed'); });
        return json(res, wr);
      }
      if ((m = p.match(/^\/api\/warroom\/(\w+)\/(seal|plan|stop)$/))) {
        const wr = store.warrooms.find((w) => w.id === m[1]); if (!wr) return json(res, { error: 'not found' }, 404);
        if (m[2] === 'stop') { wr.abort?.abort(); return json(res, { ok: true }); }
        if (m[2] === 'seal') {
          wr.verdict = String(b.verdict || 'Approved as proposed'); wr.stage = 'sealed';
          const dir = path.join(WORKSPACE, 'channel', 'war-room'); fs.mkdirSync(dir, { recursive: true });
          const f = path.join(dir, `${new Date(wr.created).toISOString().slice(0, 10)}-${wr.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48).replace(/-$/, '')}.md`);
          fs.writeFileSync(f, dossierMarkdown(wr)); wr.dossier = path.relative(WORKSPACE, f);
          store.save(); emit('warroom', wr); hive({ agent: null, kind: 'warroom', text: `Commander sealed: ${wr.verdict} → ${wr.dossier}` });
          return json(res, { ok: true, dossier: wr.dossier });
        }
        if (m[2] === 'plan') {
          const steps = [...(wr.strategy || '').matchAll(/^\s*\d+[.)]\s*@([a-z]+)\s*:\s*(.+)$/gm)].filter((s) => byId[s[1]]);
          for (const s of steps) await createTask({ text: `${s[2]}\n\n(From War Room: "${wr.question}". Strategy:\n${(wr.strategy || '').slice(0, 1500)})`, agent: s[1] });
          wr.planSent = true; store.save(); emit('warroom', wr);
          return json(res, { ok: true, tasks: steps.length });
        }
      }
      return json(res, { error: 'unknown' }, 404);
    }
    // static files
    const f = path.join(ROOT, 'public', p === '/' ? 'index.html' : path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
    if (f.startsWith(path.join(ROOT, 'public')) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); return fs.createReadStream(f).pipe(res); }
    res.writeHead(404); res.end('not found');
  } catch (e) { console.error(e); json(res, { error: String(e?.message || e) }, 500); }
});
server.listen(PORT, HOST, () => {
  console.log(`\n  War Room ready → http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}${TOKEN ? '/?token=' + TOKEN : ''}`);
  console.log(`  Mode: ${MODE === 'plan' ? `PLAN (Claude Code on this PC, your Claude plan: ${CLAUDE_BIN})` : MODE === 'api' ? 'API (Claude Agent SDK, billed to ANTHROPIC_API_KEY)' : 'DEMO (simulated agents; install Claude Code and sign in for real ones)'}`);
  console.log(`  Slots: ${SLOTS} (Haiku 0.5, Sonnet 1, Opus 2)   5-hour soft cap: $${WINDOW_USD} API-equivalent`);
  console.log(`  Workspace: ${WORKSPACE}\n  Agents: ${agents.map((a) => a.emoji + ' ' + a.name).join('  ')}\n`);
});
