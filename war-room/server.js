// Invisible Journeys: War Room + Mission Control.
// One small Node server: serves the dashboard, runs agents through the Claude Agent SDK, streams everything live (SSE).
//   npm start            -> real agents (needs ANTHROPIC_API_KEY in .env)
//   npm run demo         -> simulated agents, free, to explore the dashboard
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn as spawnProc, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// minimal .env loader (no dependency)
try { for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}

const { loadAgents, READ_ONLY } = await import('./lib/agents.js');
const { Store } = await import('./lib/store.js');
const { createNotifier } = await import('./lib/notify.js');
const { runAgent, DEMO, MODE, CLAUDE_BIN, rateBus, probeUsage } = await import('./lib/runner.js');

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
// The Commander's rule: never go above PLAN_CAP (default 80%) of the plan's current 5-hour window. Real readings come from
// Claude Code (rate_limit_event). At the cap: new work waits, running agents pause and re-queue (their saved files stay),
// and everything resumes on its own when the 5-hour window resets.
const PLAN_CAP = +(process.env.WARROOM_PLAN_CAP || 0.8);
const plan = { five: null, fiveReset: null, seven: null, t: 0 };
let capUntil = 0;
const MAX_DEPTH = 2; // how many delegation hops an agent chain may take on its own

const gitHead = () => { try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return '?'; } };
const VERSION = gitHead();   // the code this server is running; if the folder moves ahead (git pull without a restart), the UI says so
const agents = loadAgents(path.join(ROOT, 'agents'));
// Playbooks (playbooks/*.md): a short Commander order that matches a playbook's `match` regex runs that playbook's full
// method on its agent, so "pitch 3 ideas for the next tiktok" is enough. Edit or add a playbook file to change a method.
const playbooks = loadAgents(path.join(ROOT, 'playbooks')).map((p) => ({ ...p, re: new RegExp(p.match || '^$', 'i'), agentId: p.agent }));
const findPlaybook = (text, agent) => playbooks.find((p) => p.re.test(text) && (!agent || agent === p.agentId));
if (!agents.length) { console.error(`No agents loaded from ${path.join(ROOT, 'agents')}: the War Room cannot route orders.`); }
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
  const paused = limitedUntil > Date.now() ? 'limit' : capUntil > Date.now() ? 'plan' : (MODE !== 'plan' || plan.five == null) && w >= WINDOW_USD ? 'cap' : '';
  return { mode: MODE, window: +w.toFixed(2), cap: WINDOW_USD, slots: SLOTS, used, paused, plan: { ...plan, cap: PLAN_CAP }, resumeAt: paused === 'limit' ? limitedUntil : paused === 'plan' ? capUntil : paused === 'cap' && oldest ? oldest.t + WINDOW_MS : null };
}
function onRate(info) {
  const f = info.unifiedWindows?.five_hour, sv = info.unifiedWindows?.seven_day;
  if (f && typeof f.utilization === 'number') { plan.five = f.utilization; plan.fiveReset = f.resetsAt ? f.resetsAt * 1000 : null; }
  else if (info.rateLimitType === 'five_hour' && typeof info.utilization === 'number') { plan.five = info.utilization; plan.fiveReset = info.resetsAt ? info.resetsAt * 1000 : null; }
  if (sv && typeof sv.utilization === 'number') plan.seven = sv.utilization;
  plan.t = Date.now();
  if (plan.five != null && plan.five >= PLAN_CAP && capUntil <= Date.now()) capHit();
  else if (plan.five != null && plan.five < PLAN_CAP && capUntil > Date.now() && (!plan.fiveReset || plan.fiveReset < capUntil - 60e3)) capUntil = 0;   // the window already reset
  emit('usage', usage());
}
function capHit() {
  capUntil = Math.max(Date.now() + 5 * 60e3, (plan.fiveReset || Date.now() + 30 * 60e3) + 60e3);
  const n = store.tasks.filter((t) => t.status === 'running');
  for (const t of n) { t.capStop = true; aborts.get(t.id)?.abort(); }
  const at = new Date(capUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  hive({ agent: null, kind: 'info', text: `Usage reached ${Math.round(plan.five * 100)}% of the 5-hour window (cap ${Math.round(PLAN_CAP * 100)}%): ${n.length} running task(s) paused, everything resumes about ${at}` });
  notifier.send('usage', `⏸ Paused at ${Math.round(PLAN_CAP * 100)}% usage`, `Your 5-hour usage is at ${Math.round(plan.five * 100)}%. Work resumes on its own about ${at}.`, { photo: alertImg('usage'), buttons: [{ text: '▶ Resume anyway', data: 'unpause' }] });
  emit('login', { title: `⏸ Paused at ${Math.round(PLAN_CAP * 100)}% usage`, text: `Your 5-hour usage is at ${Math.round(plan.five * 100)}%. Work resumes on its own about ${at}.` });
}
rateBus.fn = onRate;
let probing = false;
async function refreshPlan(force) {   // keep the reading fresh while there is work, so we never start blind
  if (MODE !== 'plan' || probing) return; const busy = store.tasks.some((t) => ['queued', 'running', 'team'].includes(t.status));
  if (!force && (!busy || Date.now() - plan.t < 4 * 60e3)) return;
  probing = true; try { await probeUsage(WORKSPACE); } catch {} probing = false; pump();
}
setInterval(() => refreshPlan(false), 60e3); setTimeout(() => refreshPlan(true), 3000);
function noteResult(r) {
  addSpend(r.cost);
  if (r.needsLogin) { emit('login', { text: r.error }); notifier.send('setup', '🔑 Claude Code needs signing in on your PC', r.error, { photo: alertImg('setup') }); }
  if (r.needsUpdate && !globalThis.__updWarned) { globalThis.__updWarned = 1; emit('login', { title: '⬆️ Update Claude Code', text: r.updateNote }); hive({ agent: null, kind: 'info', text: r.updateNote }); }
  if (r.limited) { limitedUntil = Math.max(limitedUntil, r.resetAt && r.resetAt > Date.now() ? r.resetAt : Date.now() + 30 * 60e3); hive({ agent: null, kind: 'info', text: `Claude usage limit reached: new work waits until ${new Date(limitedUntil).toLocaleTimeString()}` }); }
  emit('usage', usage());
}
setInterval(() => { emit('usage', usage()); pump(); for (const pr of store.productions) if (['brief', 'approval', 'build', 'render'].includes(pr.stage)) emit('production', { ...pr, log: (pr.log || []).slice(-80), eta: etaOf(pr) }); }, 60e3);

// ---------------- context every agent gets ----------------
const BRAIN_F = () => path.join(WORKSPACE, 'channel', 'BRAIN.md');
function brain() { try { return fs.readFileSync(BRAIN_F(), 'utf8').slice(0, 12000); } catch { return '(channel/BRAIN.md is missing)'; } }
// ---------------- taste: the Commander's rules + votes, distilled; every agent reads it ----------------
const TASTE_F = () => path.join(WORKSPACE, 'channel', 'TASTE.md'), FEED_F = () => path.join(WORKSPACE, 'channel', 'feedback.jsonl');
const TASTE_HEAD = '# Taste profile: what the Commander likes (every agent reads this before every task)\n\nFollow it. Rules are the Commander\'s own words. "Learned from votes" is distilled from their 👍 / 👎 by the Analyst.\n';
function tasteRead() { try { return fs.readFileSync(TASTE_F(), 'utf8'); } catch { return `${TASTE_HEAD}\n## Commander's rules\n\n## Learned from votes\n- (no votes yet)\n\n## Recent votes\n`; } }
function tasteSection(md, name) { const m = md.match(new RegExp(`## ${name}\\n([\\s\\S]*?)(?=\\n## |$)`)); return m ? m[1].trim() : ''; }
function tasteWrite({ rules, learned, recent }) {
  const md = tasteRead();
  const out = `${TASTE_HEAD}\n## Commander's rules\n${rules ?? tasteSection(md, "Commander's rules")}\n\n## Learned from votes\n${learned ?? (tasteSection(md, 'Learned from votes') || '- (no votes yet)')}\n\n## Recent votes\n${recent ?? tasteSection(md, 'Recent votes')}\n`;
  fs.mkdirSync(path.dirname(TASTE_F()), { recursive: true }); fs.writeFileSync(TASTE_F(), out);
}
function feedback() { try { return fs.readFileSync(FEED_F(), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } }
function addFeedback(e) {
  fs.mkdirSync(path.dirname(FEED_F()), { recursive: true }); fs.appendFileSync(FEED_F(), JSON.stringify({ t: Date.now(), ...e }) + '\n');
  const all = feedback(), votes = all.filter((x) => x.type === 'vote');
  // newest vote per item wins
  const latest = new Map(); for (const v of votes) latest.set(v.key, v);
  const recent = [...latest.values()].slice(-20).reverse().map((v) => `- ${v.vote > 0 ? '👍' : '👎'} "${v.title}"${v.reason ? `: ${v.reason}` : ''}`).join('\n');
  const rules = all.filter((x) => x.type === 'rule').reverse().map((r) => `- ${new Date(r.t).toISOString().slice(0, 10)}: ${r.text}`).join('\n');
  tasteWrite({ rules, recent });
  emit('taste', { md: tasteRead() });
  // every 5 new votes, the Analyst (cheap) re-distills the patterns
  const sinceDistill = votes.filter((v) => v.t > (calib.tasteAt || 0)).length;
  if (e.type === 'vote' && sinceDistill >= 5 && byId.analyst) { calib.tasteAt = Date.now(); saveCalib(); createTask({ agent: 'analyst', playbook: 'taste', by: 'producer', text: 'Update the taste profile from the Commander\'s latest votes.' }); }
}
function teamContext(agentId) {
  const roster = agents.map((a) => `- @${a.id} (${a.name}): ${a.role}`).join('\n');
  const h = store.recentHive(15).map((e) => `- ${new Date(e.t).toISOString().slice(5, 16).replace('T', ' ')} ${e.agent ? byId[e.agent]?.name || e.agent : 'Commander'}: ${e.text}`).join('\n') || '- (nothing yet)';
  const pinned = store.pinned().trim() || '(none)';
  const mine = store.agentMemory(agentId).trim() || '(none)';
  const taste = tasteRead().replace(TASTE_HEAD, '').trim().slice(0, 5000);
  return `# Channel brain (what we know works)\n${brain()}\n\n# Taste profile (what the Commander likes: follow it)\n${taste}\n\n# Your team
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
- Orders are often short ("pitch 3 ideas"). Don't ask for clarification: use the Channel brain and sensible defaults, state any assumption in one line, and deliver the full job.
- Decide by what the DATA shows works (cite it), with the Commander's stated taste and instructions as inputs. Where they conflict, follow the instruction and flag the data.
- Never start work the Commander hasn't chosen yet (e.g. boarding or building a pitch before they pick one). Delegate only what your own order needs.
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
  const pb = findPlaybook(text); if (pb && byId[pb.agentId]) return { agent: pb.agentId, reason: `${pb.name}` };
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
async function createTask({ text, agent, parent = null, depth = 0, by = 'Commander', deep = false, playbook = null, model = null, production = null, demoText = null, usePlaybooks = false }) {
  const task = { deep: !!deep, production, demoText, id: uid(), title: text.split('\n')[0].slice(0, 90), text, agent: agent || null, status: 'routing', created: Date.now(), started: null, finished: null, result: '', cost: 0, turns: 0, log: [], parent, depth, by, routeReason: '' };
  store.tasks.push(task); store.save(); emit('task', publicTask(task));
  try { if (!task.agent) { const r = await route(text); task.agent = r.agent; task.routeReason = r.reason; task.cost += r.cost || 0; } }
  catch (e) { task.status = 'failed'; task.summary = `Could not route this order: ${e?.message || e}`; task.log.push({ t: Date.now(), kind: 'error', text: task.summary }); store.save(); emit('task', publicTask(task)); hive({ agent: null, kind: 'failed', text: task.summary }); return task; }
  if (!byId[task.agent]) { task.status = 'failed'; task.summary = `No agent "${task.agent}" is loaded (check war-room/agents).`; store.save(); emit('task', publicTask(task)); hive({ agent: null, kind: 'failed', text: task.summary }); return task; }
  else task.routeReason = by === 'Commander' ? 'assigned by the Commander' : `delegated by ${by}`;
  if (playbook) task.playbook = playbook; else if (by === 'Commander' || usePlaybooks) { const pb = findPlaybook(text, task.agent); if (pb) task.playbook = pb.id; }
  task.model = model || (deep ? DEEP_MODEL : byId[task.agent].model);
  task.status = 'queued'; store.save(); emit('task', publicTask(task));
  hive({ agent: by === 'Commander' ? null : by, kind: 'task', text: `→ @${task.agent}: ${task.title}` });
  pump();
  return task;
}
function logTo(task, e) { const entry = { t: Date.now(), ...e }; task.log.push(entry); if (task.log.length > 400) task.log.shift(); emit('log', { taskId: task.id, entry }); if (e.kind === 'text' || e.kind === 'tool') setAgent(task.agent, { last: e.text.split('\n')[0].slice(0, 160) }); }
function pump() {
  const u = usage();
  if (u.paused) return;
  if (MODE === 'plan' && plan.five != null && plan.five >= PLAN_CAP) { capHit(); return; }
  // production work (an approved video) goes first; other orders never take a slot a waiting Builder needs
  const ready = (t) => t.status === 'queued' && (byId[t.agent]?.multi || live[t.agent]?.status === 'idle') && u.used + weight(t.model || byId[t.agent].model) <= SLOTS;
  const prodWaiting = store.tasks.some((t) => t.status === 'queued' && t.production);
  const next = store.tasks.find((t) => ready(t) && t.production) || (!prodWaiting && store.tasks.find(ready));
  if (next) { runTask(next); pump(); }
}
const waiters = new Map();   // taskId -> resolve(task) for team orders
const settle = (t) => { const w = waiters.get(t.id); if (w) { waiters.delete(t.id); w(t); } };
const waitFor = (t) => (['done', 'failed', 'stopped'].includes(t.status) ? Promise.resolve(t) : new Promise((r) => waiters.set(t.id, r)));
async function runTask(task) {
  const agent = byId[task.agent];
  task.status = 'running'; task.started = Date.now(); store.save(); emit('task', publicTask(task));
  live[agent.id].n = (live[agent.id].n || 0) + 1;
  setAgent(agent.id, { status: 'working', taskId: task.id, last: live[agent.id].n > 1 ? `${live[agent.id].n} tasks at once` : 'Starting…' });
  const abort = new AbortController(); aborts.set(task.id, abort);
  let r;
  try {
    const pb = task.playbook && playbooks.find((x) => x.id === task.playbook);
    r = await runAgent({ agent: { ...agent, model: task.model || agent.model, maxTurns: pb?.maxTurns || agent.maxTurns }, prompt: `${teamContext(agent.id)}${pb ? `\n\n${pb.prompt}` : ''}\n\n# Task from ${task.by === 'Commander' ? 'the Commander' : '@' + task.by}\n${task.text}`, cwd: WORKSPACE, onLog: (e) => logTo(task, e), canUseTool: makeCanUseTool(task, agent), abort, taskText: task.text, demoText: task.demoText ? () => task.demoText : undefined });
  } catch (e) { r = { ok: false, text: '', cost: 0, turns: 0, error: String(e?.message || e) }; }
  aborts.delete(task.id); noteResult(r);
  if (task.capStop) { task.capStop = false; task.status = 'queued'; task.log.push({ t: Date.now(), kind: 'info', text: `Paused at ${Math.round(PLAN_CAP * 100)}% of your 5-hour usage; it runs again (from its saved files) when the window resets.` }); store.save(); emit('task', publicTask(task)); live[agent.id].n = Math.max(0, (live[agent.id].n || 1) - 1); setAgent(agent.id, { status: live[agent.id].n ? 'working' : 'idle', taskId: null, last: 'paused at the usage cap' }); return; }
  if (r.limited && !abort.signal.aborted) { task.status = 'queued'; task.log.push({ t: Date.now(), kind: 'info', text: 'Paused by the Claude usage limit; it runs again when the limit resets.' }); store.save(); emit('task', publicTask(task)); setAgent(agent.id, { status: 'idle', taskId: null, last: 'waiting for the usage limit to reset' }); return; }
  task.finished = Date.now(); task.result = r.text; task.cost += r.cost; task.turns = r.turns;
  task.status = abort.signal.aborted ? 'stopped' : r.ok ? 'done' : 'failed';
  if (r.error) logTo(task, { kind: 'error', text: r.error });
  const summary = (r.text.match(/^SUMMARY:\s*(.+)$/m) || [])[1] || r.text.split('\n').find((l) => l.trim())?.slice(0, 200) || r.error || task.status;
  task.summary = summary; store.save(); emit('task', publicTask(task));
  if (!task.production && !abort.signal.aborted) { if (task.status === 'failed') notifier.send('failed', `⚠️ ${agent.name} failed`, `${task.title}\n${(r.error || summary).slice(0, 400)}`); else if (task.status === 'done' && task.by === 'Commander') notifier.send('tasks', `✔ ${agent.name} finished`, `${task.title}\n${summary}`); }
  hive({ agent: agent.id, kind: task.status, text: summary });
  live[agent.id].n = Math.max(0, (live[agent.id].n || 1) - 1);
  setAgent(agent.id, { status: live[agent.id].n ? 'working' : 'idle', taskId: live[agent.id].n ? live[agent.id].taskId : null, last: summary });
  if (task.production) onProductionTask(task, r);
  if (r.ok && !task.production) {
    for (const m of r.text.matchAll(/^REMEMBER:\s*(.+)$/gm)) { store.remember(agent.id, m[1]); hive({ agent: agent.id, kind: 'memory', text: `remembered: ${m[1]}` }); }
    const dels = [...r.text.matchAll(/^DELEGATE\s+@([a-z]+)\s*:\s*(.+)$/gm)].slice(0, 2);
    for (const m of dels) {
      if (!byId[m[1]]) continue;
      if (task.depth + 1 > MAX_DEPTH) { hive({ agent: agent.id, kind: 'info', text: `wanted to delegate to @${m[1]} but the chain limit was reached; waiting for the Commander` }); continue; }
      createTask({ text: m[2], agent: m[1], parent: task.id, depth: task.depth + 1, by: agent.id });
    }
  }
  settle(task);
  pump();
}

// ---------------- team orders: one prompt to the whole War Room ----------------
// The Producer (Opus) plans: NOW lines run in parallel, THEN lines run after them with their results, and the Producer
// writes one answer for the Commander from everything the team produced. Each step is a normal task (playbooks apply).
function startTeam(text, deep) {
  const lead = byId.producer || agents[0];
  const task = { id: uid(), kind: 'team', title: text.split('\n')[0].slice(0, 90), text, agent: lead.id, status: 'team', created: Date.now(), started: Date.now(), finished: null, result: '', cost: 0, turns: 0, log: [], parent: null, depth: 0, by: 'Commander', routeReason: 'whole team', model: DEEP_MODEL, deep };
  Object.defineProperty(task, 'abort', { value: new AbortController(), enumerable: false });
  store.tasks.push(task); store.save(); emit('task', publicTask(task));
  runTeam(task).catch((e) => { task.status = 'failed'; task.summary = String(e?.message || e); task.finished = Date.now(); store.save(); emit('task', publicTask(task)); });
  return task;
}
async function teamCall(task, prompt, maxTurns = 12) {
  const lead = byId[task.agent];
  const r = await runAgent({ agent: { ...lead, model: DEEP_MODEL }, prompt: `${teamContext(lead.id)}\n\n${prompt}`, cwd: WORKSPACE, tools: ['Read', 'Glob', 'Grep'], maxTurns,
    onLog: (e) => logTo(task, e), canUseTool: async (n, i) => (READ_ONLY.has(n) ? { behavior: 'allow', updatedInput: i } : { behavior: 'deny', message: 'read-only' }), abort: task.abort,
    demoText: () => (prompt.startsWith('TEAM PLAN') ? 'SUMMARY: (demo) plan.\nNOW @scout: Pitch 3 ideas for the next TikTok\nNOW @analyst: Review the latest stats\nTHEN @writer: Outline a board for the strongest pitch, using the stats review' : 'SUMMARY: (demo) the team answered.\nHere is the combined answer from the Scout, Analyst and Writer.') });
  noteResult(r); task.cost += r.cost || 0; return r;
}
async function runTeam(task) {
  logTo(task, { kind: 'info', text: 'Producer is planning who does what…' });
  const roster = agents.filter((a) => !['director', 'builder'].includes(a.id)).map((a) => `@${a.id}: ${a.role}`).join('\n');
  const plan = await teamCall(task, `TEAM PLAN. The Commander gave the whole War Room this order:\n${task.text}\n\nYour team:\n${roster}\n\nPlan the smallest set of tasks (1–5) that fully answers it. Use the Channel brain. Write each task on its own line:\nNOW @<id>: <task>   (these run at the same time)\nTHEN @<id>: <task>  (these run after all NOW tasks, with their results)\nIf the order is a simple question you can answer yourself from the brain and files, skip the plan and answer it directly, starting with ANSWER:.\nNever plan building or rendering a video (the Studio tab does that, after the Commander approves).`, 10);
  if (task.abort.signal.aborted) return endTeam(task, 'stopped', 'Stopped by the Commander.');
  if (!plan.ok) return endTeam(task, 'failed', plan.error || 'The plan failed.');
  const lines = [...(plan.text || '').matchAll(/^\s*(NOW|THEN)\s+@([a-z]+)\s*:\s*(.+)$/gim)].filter((m) => byId[m[2].toLowerCase()] && !['director', 'builder'].includes(m[2].toLowerCase())).slice(0, 6);
  if (!lines.length) return endTeam(task, 'done', plan.text);
  task.plan = lines.map((m) => `${m[1].toUpperCase()} @${m[2].toLowerCase()}: ${m[3]}`); store.save(); emit('task', publicTask(task));
  logTo(task, { kind: 'info', text: `Plan: ${task.plan.join(' · ')}` });
  const run = async (m, extra = '') => { const t = await createTask({ text: `${m[3]}\n\n(Part of the Commander's team order: "${task.text.slice(0, 300)}")${extra}`, agent: m[2].toLowerCase(), parent: task.id, depth: 1, by: 'producer', usePlaybooks: true }); return waitFor(t); };
  const now = await Promise.all(lines.filter((m) => /now/i.test(m[1])).map((m) => run(m)));
  if (task.abort.signal.aborted) return endTeam(task, 'stopped', 'Stopped by the Commander.');
  const digest = (ts) => ts.map((t) => `## @${t.agent} (${t.status}): ${t.title}\n${(t.result || t.summary || '').slice(0, 6000)}`).join('\n\n');
  const thenLines = lines.filter((m) => /then/i.test(m[1]));
  const then = thenLines.length ? await Promise.all(thenLines.map((m) => run(m, `\n\nResults from the first wave:\n${digest(now).slice(0, 12000)}`))) : [];
  if (task.abort.signal.aborted) return endTeam(task, 'stopped', 'Stopped by the Commander.');
  logTo(task, { kind: 'info', text: 'Producer is writing the answer…' });
  const fin = await teamCall(task, `TEAM ANSWER. The Commander's order:\n${task.text}\n\nWhat your team produced:\n${digest([...now, ...then]).slice(0, 30000)}\n\nWrite the ONE answer the Commander reads: lead with the answer, then the key numbers and evidence, then any decision they need to make. Name files the team saved. Flag disagreements between agents and where the data is thin. Start with "SUMMARY:".`, 6);
  endTeam(task, fin.ok ? 'done' : 'failed', fin.text || fin.error);
}
function endTeam(task, status, text) {
  task.status = status; task.result = text || ''; task.finished = Date.now();
  task.summary = ((text || '').match(/^SUMMARY:\s*(.+)$/m) || [])[1] || (text || '').replace(/^ANSWER:\s*/, '').split('\n').find((l) => l.trim())?.slice(0, 200) || status;
  store.save(); emit('task', publicTask(task)); hive({ agent: task.agent, kind: status, text: `👥 ${task.summary}` });
}

// ---------------- productions: greenlight -> brief -> Commander approval -> Director build -> GPU render -> QC -> done ----------------
const PSTAGES = ['brief', 'approval', 'build', 'render', 'done'];
const prods = store.productions;
const pub = (pr) => ({ ...pr, log: (pr.log || []).slice(-80), eta: typeof etaOf === 'function' ? etaOf(pr) : null });
function prodAlert(pr) {
  const sig = `${pr.stage}|${pr.error || ''}`; if (pr.alertSig === sig) return; pr.alertSig = sig;
  const eta = etaOf(pr), when = eta ? ` If approved now, ready about ${new Date(eta.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` : '';
  const steps = (k) => ['Brief', 'Approval', 'Build', 'Render', 'Film'].map((x, i) => (i < k ? '✅ ' : i === k ? '▶️ ' : '▫️ ') + x).join('  ');
  if (pr.stage === 'approval') notifier.send('approval', `🎬 Approve "${pr.title}"?`, `The production brief is ready (projects/${pr.slug}/PRODUCTION.md).${pr.stats ? ` ${pr.stats.shots} shots, ${pr.quality} quality.` : ''}${when}`, { photo: alertImg('approval'), steps: steps(1), tab: 'studio', buttons: [{ text: '✅ Approve & build', data: `approve:${pr.id}` }, { text: '✖ Reject', data: `reject:${pr.id}` }] });
  else if (pr.stage === 'done') { notifier.send('done', `🎬 Video ready: ${pr.title}`, `Rendered and passed QC. The video, caption and hashtags are on their way.`, { photo: alertImg('done'), steps: steps(5), tab: 'studio' }); sendToPhone(pr); }
  else if (pr.stage === 'failed') notifier.send('failed', `⚠️ Production stopped: ${pr.title}`, (pr.error || 'Unknown problem').slice(0, 600), { photo: alertImg('failed'), steps: steps(['brief', 'approval', 'build', 'render'].indexOf(pr.failedAt || 'build')), tab: 'studio', buttons: [{ text: '↻ Resume', data: `resume:${pr.id}` }] });
  else if (pr.stage === 'paused') notifier.send('failed', `⏸ Production paused: ${pr.title}`, pr.note || 'The War Room restarted during this stage.', { photo: alertImg('usage'), tab: 'studio', buttons: [{ text: '↻ Resume', data: `resume:${pr.id}` }] });
}
function postInfo(pr) {
  let j = {}; try { j = JSON.parse(fs.readFileSync(path.join(WORKSPACE, 'projects', pr.slug, 'POST.json'), 'utf8')); } catch {}
  if (!j.hashtags?.length) j.hashtags = ((brain().match(/#[a-z][a-z0-9_]+(?:\s+#[a-z][a-z0-9_]+){2,}/i) || [''])[0]).split(/\s+/).filter(Boolean);
  return { title: pr.title, caption: j.caption || pr.title, cover: j.cover || '', hashtags: j.hashtags || [], slot: j.slot || '', notes: j.notes || '' };
}
async function sendToPhone(pr) {
  const out = path.join(WORKSPACE, 'projects', pr.slug, 'out'), f = [path.join(out, 'tiktok.mp4'), path.join(out, 'final.mp4')].find((x) => fs.existsSync(x) && fs.statSync(x).size <= 49.5e6);
  if (!f) return pemit(pr, 'Phone: no copy under 50 MB to send (re-render to make tiktok.mp4).');
  const r = await notifier.sendPackage(f, postInfo(pr)).catch((e) => ({ ok: false, error: e.message }));
  pemit(pr, r.ok ? '📱 Sent the video, caption and hashtags to your phone.' : `📱 Not sent to the phone: ${r.error}`);
}
function approveProd(pr, notes) { if (pr.stage !== 'approval') return `"${pr.title}" is not waiting for approval (stage: ${pr.stage}).`; if (notes) pr.notes = [pr.notes, notes].filter(Boolean).join('\n'); pr.approved = Date.now(); hive({ agent: null, kind: 'order', text: `🎬 approved: ${pr.title}` }); startBuild(pr); return `✅ Approved "${pr.title}". Building now.`; }
function resumeProd(pr) { const from = pr.stage === 'paused' ? pr.pausedFrom : pr.failedAt; pr.error = null; if (!pr.slug) startBrief(pr); else if (!pr.approved) { pr.stage = 'approval'; pemit(pr); } else if (from === 'render') startRender(pr); else startBuild(pr); return `↻ Resumed "${pr.title}".`; }
function pemit(pr, line) { if (line) { (pr.log ||= []).push({ t: Date.now(), text: String(line).slice(0, 400) }); if (pr.log.length > 600) pr.log.splice(0, pr.log.length - 600); } store.save(); emit('production', pub(pr)); try { prodAlert(pr); } catch {} }
async function startBrief(pr) {
  pr.stage = 'brief'; pemit(pr, 'Producer is writing the production brief…');
  const t = await createTask({ agent: byId.producer ? 'producer' : agents[0].id, playbook: 'production', production: pr.id, model: DEEP_MODEL,
    demoText: DEMO ? `SUMMARY: (demo) brief written.\nBRIEF READY: projects/${process.env.WARROOM_DEMO_SLUG || 'gravity-flip'}/PRODUCTION.md` : null,
    text: `Greenlit by the Commander. Write the production brief.\nSource: ${pr.source}${pr.notes ? `\nCommander's notes: ${pr.notes}` : ''}` });
  pr.briefTask = t.id; pemit(pr);
}
const PARALLEL_MIN_SHOTS = +(process.env.WARROOM_PARALLEL_MIN_SHOTS || 8), BUILDERS_N = +(process.env.WARROOM_BUILDERS || 3);
const builderModel = (pr) => (pr.builder === 'sonnet' ? 'claude-sonnet-5-5' : 'claude-opus-5-5');
async function prodTask(pr, agent, text, demoText) {
  const t = await createTask({ agent, production: pr.id, model: builderModel(pr), demoText: DEMO ? demoText : null, text: `${text}${pr.notes ? `\nCommander's notes: ${pr.notes}` : ''}` });
  (pr.buildTasks ||= []).push(t.id); pemit(pr); return waitFor(t);
}
async function startBuild(pr) {
  const open = store.tasks.find((t) => t.production === pr.id && ['director', 'builder'].includes(t.agent) && ['routing', 'queued', 'running'].includes(t.status));
  if (open) return pemit(pr, 'The build is already running.');   // never two builds of one production
  pr.stage = 'build'; pr.buildStarted = Date.now(); pr.buildTasks = [];
  const parallel = !pr.fixNote && (pr.stats?.shots || 0) >= PARALLEL_MIN_SHOTS && byId.builder;
  pr.parallel = !!parallel; const who = pr.builder === 'sonnet' ? 'Sonnet' : 'Opus';
  const base = `the approved production projects/${pr.slug}/PRODUCTION.md (slug: ${pr.slug})`;
  try {
    if (!parallel) {
      pemit(pr, `Director is building projects/${pr.slug} (${who})…`);
      const t = await prodTask(pr, 'director', `Build ${base}.${pr.fixNote ? `\n\nFIX ROUND: the render's QC failed. Fix these problems, then finish with BUILD COMPLETE again:\n${pr.fixNote}` : ''}`, `SUMMARY: (demo) build finished.\nBUILD COMPLETE: projects/${pr.slug}`);
      return buildDone(pr, t);
    }
    // 1. lead: skeleton + shared kit + the split
    pr.buildPhase = 'lead'; pemit(pr, `Parallel build (${who}): the Director writes the law, the shared kit and the split…`);
    const lead = await prodTask(pr, 'director', `PHASE 1 of 3 (lead) of a PARALLEL build of ${base}.
Do build-order steps 1 (skeleton: script.md, src/story.js, shots.txt) and write the SHARED KIT every shot imports (sets, palette, lighting, camera helpers: src/kit.js), checked on one key frame. Do NOT build the shots yourself.
Also write overlay.js (captions + counter, every number from story.js, inside the safe area) and score.json now: they depend only on the law and the board, so the shots can be rendered the moment they are built.
Then write projects/${pr.slug}/BUILDERS.md: split the shots into ${BUILDERS_N} groups named A, B, C… of similar difficulty (keep shots that cut into each other in the same group when you can), give each group its shots, the handshake at every cut (what the frame looks like at the cut), the shared rules and the contract (Builders write only their own shot files and new files named after their group, never shared files, never commit).
Commit. End with SUMMARY and exactly one line per group: "GROUP <letter>: <shot>, <shot>, …", then "PLAN READY".`, `SUMMARY: (demo) skeleton and kit.\nGROUP A: s01, s02, s03\nGROUP B: s04, s05, s06\nGROUP C: s07, s08\nPLAN READY`);
    if (lead.status !== 'done') return buildFail(pr, lead);
    const groups = [...(lead.result || '').matchAll(/^\s*GROUP\s+([A-Z])\s*:\s*(.+)$/gm)].map((m) => ({ g: m[1], shots: m[2].trim() }));
    if (!groups.length) return buildDone(pr, lead);   // the lead built it all itself
    // 2. Builders in parallel, one per group
    pr.buildPhase = 'shots'; pemit(pr, `${groups.length} Builders are building shots in parallel: ${groups.map((x) => `${x.g} (${x.shots})`).join(' · ')}`);
    const done = await Promise.all(groups.map((x) => prodTask(pr, 'builder', `PHASE 2 of 3 of ${base}. You are Builder group ${x.g}. Build ONLY these shots: ${x.shots}. Read projects/${pr.slug}/BUILDERS.md first (your assignment, the handshakes and the contract).`, `SUMMARY: (demo) group ${x.g} built.\nSHOTS DONE: ${x.g}`).then((t) => { if (t.status === 'done' && /SHOTS DONE/i.test(t.result || '')) earlyRender(pr, x.shots.split(/[,\s]+/).filter(Boolean)); return t; })));
    const bad = done.filter((t) => t.status !== 'done' || !/SHOTS DONE/i.test(t.result || ''));
    if (bad.length) return buildFail(pr, bad[0], `Builder group(s) ${bad.map((t) => (t.text.match(/group ([A-Z])/) || [])[1]).join(', ')} did not finish`);
    // 3. lead: integrate, consistency pass, captions, score, commit
    pr.buildPhase = 'finish'; pemit(pr, 'All shots built. The Director integrates them, does the consistency pass, captions and score…');
    const fin = await prodTask(pr, 'director', `PHASE 3 of 3 (finish) of the PARALLEL build of ${base}. All Builder groups are done: read projects/${pr.slug}/FINAL/*.txt.
1. Apply any shared-file changes the Builders asked for.
2. Consistency pass: check every cut's handshake and the look across all shots (key frames on the GPU), and fix what doesn't match.
3. Check overlay.js and score.json still fit the finished shots (adjust only if needed), write FINAL.md, commit everything. End with BUILD COMPLETE as usual.
Shots you don't change keep their early GPU renders, so touch shared files (story.js, the kit) only when it is really needed.`, `SUMMARY: (demo) integrated.\nBUILD COMPLETE: projects/${pr.slug}`);
    return buildDone(pr, fin);
  } catch (e) { pr.failedAt = 'build'; pr.stage = 'failed'; pr.error = String(e?.message || e); pemit(pr, pr.error); }
}
function buildFail(pr, t, why) {
  if (pr.stage === 'cancelled') return;
  pr.failedAt = 'build'; pr.stage = 'failed';
  pr.error = (why ? why + ': ' : '') + (((t.result || '').match(/(BUILD|SHOTS) BLOCKED:.*$/m) || [])[0] || `${byId[t.agent]?.name || t.agent} ${t.status}: ${t.summary || ''}`).slice(0, 500);
  pemit(pr, pr.error);
}
function buildDone(pr, t) {
  if (pr.stage === 'cancelled') return;
  if (t.status !== 'done' || !/BUILD COMPLETE/i.test(t.result || '')) return buildFail(pr, t);
  if (!pr.fixes && pr.stats?.shots) { const b = pr.builder === 'sonnet' ? 'sonnet' : 'opus'; const eff = pr.parallel ? pr.stats.shots / BUILDERS_N + 3 : pr.stats.shots;
    calib.buildMinPerShot[b] = ema(calib.buildMinPerShot[b], (Date.now() - pr.buildStarted) / 60e3 / eff); calib.learnedBuild++; saveCalib(); }
  pr.buildPhase = null; pemit(pr, 'Build complete. Rendering on the GPU…'); startRender(pr);
}
function onProductionTask(task, r) {
  const pr = prods.find((x) => x.id === task.production); if (!pr || pr.stage === 'cancelled') return;
  pr.cost = (pr.cost || 0) + (task.cost || 0);
  if (pr.stage === 'build') return pemit(pr);   // handled by startBuild
  if (task.status !== 'done') { pr.failedAt = pr.stage; pr.stage = 'failed'; pr.error = `${byId[task.agent]?.name || task.agent} ${task.status}: ${r.error || task.summary || ''}`.slice(0, 500); return pemit(pr, pr.error); }
  if (pr.stage === 'brief') {
    const m = (r.text || '').match(/BRIEF READY:\s*(projects\/([a-z0-9-]+))\/PRODUCTION\.md/i);
    if (!m) { pr.stage = 'failed'; pr.error = 'The Producer did not report BRIEF READY.'; return pemit(pr, pr.error); }
    pr.slug = m[2]; pr.title = (fs.existsSync(briefPath(pr)) ? (fs.readFileSync(briefPath(pr), 'utf8').match(/What if[^\n*]*(\*[^*]+\*)?[^\n]*\?/i) || [])[0] : null)?.replace(/\*/g, '') || pr.title;
    pr.stats = briefStats(pr); calib.briefMin = ema(calib.briefMin, (Date.now() - pr.created) / 60e3); saveCalib();
    pr.stage = 'approval'; pemit(pr, `Brief ready: projects/${pr.slug}/PRODUCTION.md. Waiting for your approval.`);
    hive({ agent: 'producer', kind: 'info', text: `Production brief ready for approval: ${pr.title}` }); emit('notify', { title: '🎬 Brief ready for your approval', text: pr.title, production: pr.id });

  }
}
// One GPU: every render job (early shot renders and final renders) runs through this queue, one at a time.
let gpuChain = Promise.resolve(), gpuBusy = null;
function gpuJob(pr, args, onLine) {
  const job = gpuChain.then(() => new Promise((ok) => {
    if (pr.stage === 'cancelled') return ok(-1);
    gpuBusy = pr.id;
    const ch = spawnProc(process.execPath, [path.join(WORKSPACE, 'tools', 'render_all.js'), `projects/${pr.slug}`, ...args], { cwd: WORKSPACE, env: { ...process.env, IJ_GPU: process.env.IJ_GPU ?? (process.platform === 'win32' ? '1' : '0') }, windowsHide: true });
    pr.pid = ch.pid; let buf = '';
    const onData = (d) => { buf += d; let i; while ((i = buf.search(/\r?\n/)) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1).replace(/^\n/, ''); if (line) onLine(line); } };
    ch.stdout.on('data', onData); ch.stderr.on('data', onData);
    ch.on('close', (code) => { gpuBusy = null; pr.pid = null; ok(code); }); ch.on('error', () => { gpuBusy = null; ok(-1); });
  }));
  gpuChain = job.catch(() => {}); return job;
}
// a Builder group finished: render its shots on the GPU right away, while the others keep building (the final render reuses them)
function earlyRender(pr, shots) {
  if (pr.quality === 'draft' || !shots.length) return;
  pemit(pr, `Rendering ${shots.join(', ')} early on the GPU while the rest is built…`);
  pr.early = (pr.early || Promise.resolve()).then(() => gpuJob(pr, ['--quality', pr.quality, '--shots', shots.join(','), '--no-assemble'], (line) => { if (/^(RESULT|reusing)/.test(line) || /error/i.test(line)) pemit(pr, `early render: ${line}`); }));
}
async function startRender(pr) {
  pr.stage = 'render'; pr.waiting = gpuBusy && gpuBusy !== pr.id; pr.progress = 0; pemit(pr, pr.waiting ? 'Waiting for the GPU (another render is running)…' : `Rendering at quality ${pr.quality}…`);
  await (pr.early || Promise.resolve()).catch(() => {});
  let result = '';
  const code = await gpuJob(pr, ['--quality', pr.quality, '--reuse'], (line) => {
    if (!pr.renderStarted || pr.waiting) { pr.renderStarted = Date.now(); pr.waiting = false; }
    const pg = line.match(/^PROGRESS (\d+)\/(\d+)/); if (pg) pr.progress = +pg[1] / +pg[2];
    if (/^RESULT /.test(line)) result = line;
    if (/^(STEP|PROGRESS|RESULT|render_all|reusing|WARN|FAIL|  frames|  loudness|text contrast|safe area|white-flash|  f\d+ )/.test(line) || /error/i.test(line)) pemit(pr, line);
  });
  if (pr.stage === 'cancelled') return pemit(pr, 'Render cancelled.');
  const final = path.join(WORKSPACE, 'projects', pr.slug, 'out', 'final.mp4');
  if (code === 0 && fs.existsSync(final)) {
    if (pr.stats?.frames && pr.quality !== 'draft' && !pr.early) { calib.renderSecPerFrame[pr.quality] = ema(calib.renderSecPerFrame[pr.quality], Math.max(0.02, ((Date.now() - pr.renderStarted) / 1000 - calib.renderOverheadMin * 60) / pr.stats.frames)); calib.learnedRender++; saveCalib(); }
    pr.stage = 'done'; pr.final = final; pr.finished = Date.now(); pemit(pr, `Done: ${final}`);
    hive({ agent: 'director', kind: 'done', text: `Film ready: ${pr.title} → projects/${pr.slug}/out/final.mp4` }); emit('notify', { title: '🎬 Your video is ready', text: pr.title, production: pr.id });
  } else if ((fs.existsSync(final) || /captions/i.test(result)) && (pr.fixes || 0) < 1) {
    pr.fixes = (pr.fixes || 0) + 1; pr.fixNote = (pr.log || []).slice(-25).map((l) => l.text).join('\n'); pr.early = null;
    pemit(pr, /captions/i.test(result) ? 'Captions are outside the safe area: back to the Director for a quick fix (no picture was rendered).' : 'QC failed: sending the report back to the Director for one fix round.'); startBuild(pr);
  } else { pr.failedAt = 'render'; pr.stage = 'failed'; pr.error = result || `Render exited with code ${code}`; pemit(pr, pr.error); }
}
const briefPath = (pr) => path.join(WORKSPACE, 'projects', pr.slug || '_', 'PRODUCTION.md');
function cancelProduction(pr) {
  for (const id of [pr.briefTask, pr.buildTask, ...(pr.buildTasks || [])]) { const t = store.tasks.find((x) => x.id === id); if (t && ['queued', 'running', 'routing'].includes(t.status)) { aborts.get(t.id)?.abort(); if (t.status !== 'running') { t.status = 'stopped'; emit('task', publicTask(t)); } } }
  if (pr.pid) { try { if (process.platform === 'win32') spawnProc('taskkill', ['/pid', String(pr.pid), '/T', '/F']); else process.kill(pr.pid); } catch {} }
  pr.stage = 'cancelled'; pemit(pr, 'Cancelled by the Commander.');
}
function sendVideo(req, res, f) {
  const st = fs.statSync(f), m = (req.headers.range || '').match(/bytes=(\d*)-(\d*)/);
  if (m) { const a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : st.size - 1; res.writeHead(206, { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1 }); return fs.createReadStream(f, { start: a, end: b }).pipe(res); }
  res.writeHead(200, { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-length': st.size }); fs.createReadStream(f).pipe(res);
}

// ---------------- ETA: estimates that learn from real runs (data/calib.json) ----------------
const CALIB_F = path.join(ROOT, 'data', 'calib.json');
// v2 defaults include the speed-ups (cheat sheet, 2 shots at a time on the GPU, early renders). Learned values are kept;
// defaults saved by an older version (nothing learned yet) are replaced.
const CALIB_DEF = { v: 2, briefMin: 5, buildMinPerShot: { opus: 10, sonnet: 7 }, renderSecPerFrame: { max: 0.65, standard: 0.16, draft: 0.08 }, renderOverheadMin: 3, learnedBuild: 0, learnedRender: 0 };
const calib = (() => { let c = {}; try { c = JSON.parse(fs.readFileSync(CALIB_F, 'utf8')); } catch {}
  if ((c.v || 1) < 2) { if (!c.learnedBuild) delete c.buildMinPerShot; if (!c.learnedRender) delete c.renderSecPerFrame; delete c.renderOverheadMin; c.v = 2; }
  return Object.assign({}, CALIB_DEF, c); })();
const saveCalib = () => { try { fs.writeFileSync(CALIB_F, JSON.stringify(calib, null, 1)); } catch {} };
const ema = (old, v) => +(old * 0.6 + v * 0.4).toFixed(3);
function briefStats(pr) {   // shots and frames from the board table in PRODUCTION.md
  try { const md = fs.readFileSync(briefPath(pr), 'utf8'); const rows = md.split('\n').filter((l) => /^\|\s*`?s?\d{1,2}/i.test(l));
    const frames = rows.map((l) => +((l.split('|')[2] || '').match(/\d{2,4}/) || [0])[0]).reduce((a, b) => a + b, 0);
    return { shots: rows.length || 11, frames: frames > 300 ? frames : (rows.length || 11) * 100 }; } catch { return { shots: 11, frames: 1100 }; }
}
function etaOf(pr) {   // minutes left per stage -> finish time
  const now = Date.now(), st = pr.stats || { shots: 11, frames: 1100 }, b = pr.builder === 'sonnet' ? 'sonnet' : 'opus';
  const par = (st.shots >= PARALLEL_MIN_SHOTS && byId.builder) || pr.parallel, build = (par ? st.shots / BUILDERS_N + 3 : st.shots) * calib.buildMinPerShot[b];
  const render = (st.frames * (calib.renderSecPerFrame[pr.quality] || 1) * (par && pr.quality !== 'draft' ? 1 / BUILDERS_N : 1)) / 60 + calib.renderOverheadMin;   // early renders cover the other groups
  let left = 0;
  if (pr.stage === 'brief') left = Math.max(1, calib.briefMin - (now - pr.created) / 60e3) + build + render;
  else if (pr.stage === 'approval') left = build + render;
  else if (pr.stage === 'build') left = Math.max(2, build - (now - (pr.buildStarted || now)) / 60e3) + render;
  else if (pr.stage === 'render') left = pr.progress > 0.03 ? ((now - pr.renderStarted) / 60e3) * (1 - pr.progress) / pr.progress + 2 : render;
  else return null;
  return { minutes: Math.round(left), at: now + left * 60e3, approx: pr.stage !== 'render' || !(pr.progress > 0.03), waitingOnYou: pr.stage === 'approval' };
}

// ---------------- phone (Telegram): alerts out, commands in ----------------
const fmtT = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
async function phoneCommand(raw) {
  const [cmd, arg] = String(raw).trim().split(/[:\s]+/, 2), c = cmd.replace(/^\//, '').replace(/@\w+$/, '').toLowerCase();
  const pick = (stage) => (arg && prods.find((x) => x.id === arg)) || [...prods].reverse().find((x) => !stage || stage.includes(x.stage));
  if (c === 'approve') { const pr = pick(['approval']); return pr ? approveProd(pr) : 'Nothing is waiting for approval.'; }
  if (c === 'reject') { const pr = pick(['approval']); if (!pr) return 'Nothing is waiting for approval.'; cancelProduction(pr); return `✖ Rejected "${pr.title}".`; }
  if (c === 'resume') { const pr = pick(['failed', 'paused']); if (pr) return resumeProd(pr); if (limitedUntil || capUntil) { limitedUntil = 0; capUntil = 0; pump(); return '▶ Queue resumed.'; } return 'Nothing to resume.'; }
  if (c === 'unpause') { limitedUntil = 0; capUntil = 0; hive({ agent: null, kind: 'info', text: 'Commander resumed the queue from the phone' }); pump(); return '▶ Queue resumed (usage cap overridden until the next reading).'; }
  if (c === 'status' || c === 'start') {
    const u = usage(), run = store.tasks.filter((t) => ['running', 'team'].includes(t.status)), q = store.tasks.filter((t) => t.status === 'queued').length;
    const live = prods.filter((x) => !['done', 'cancelled'].includes(x.stage)).slice(-4).map((x) => { const e = etaOf(x); return `🎬 ${x.title}: ${x.stage}${x.buildPhase ? ' (' + x.buildPhase + ')' : ''}${e && !e.waitingOnYou ? ', ready about ' + fmtT(e.at) : ''}`; });
    return [`War Room · ${MODE.toUpperCase()}`, u.plan?.five != null ? `Usage: ${Math.round(u.plan.five * 100)}% of the 5-hour window (cap ${Math.round(PLAN_CAP * 100)}%)${u.paused ? ' · PAUSED' : ''}` : (u.paused ? 'Queue: PAUSED' : ''),
      `Working: ${run.map((t) => `${byId[t.agent]?.emoji || ''} ${t.title}`).join(' · ') || 'nobody'}${q ? ` · ${q} queued` : ''}`, ...live].filter(Boolean).join('\n');
  }
  return 'Commands: /status · /approve · /reject · /resume';
}
const ACT_KEY = crypto.randomBytes(12).toString('hex');   // action links in desktop notifications (this run only)
let AUMID = '';
if (process.platform === 'win32') setTimeout(() => { try { const r = spawnProc('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', path.join(ROOT, 'windows', 'register-toast.ps1')], { windowsHide: true }); let o = ''; r.stdout.on('data', (d) => (o += d)); r.on('close', () => { AUMID = o.trim().split(/\r?\n/).pop() || ''; }); } catch {} }, 1500);
function desktopToast(kind, title, text, extra = {}) {
  if ([...clients].some((c) => c.notif)) return emit('alert', { kind, title, text: text.slice(0, 300), tab: extra.tab || '', buttons: (extra.buttons || []).map((b) => ({ text: b.text, data: b.data })) });
  if (process.platform !== 'win32') return;
  const base = `http://localhost:${PORT}`, act = (d) => { const [c, id] = String(d).split(':'); return `${base}/act/${ACT_KEY}/${c}/${id || '-'}`; };
  const buttons = (extra.buttons || []).map((b) => ({ text: b.text.replace(/^[^\w]+\s*/u, ''), url: act(b.data) })).slice(0, 2);
  buttons.push({ text: 'Open War Room', url: `${base}/${extra.tab ? '#' + extra.tab : ''}` });
  const dir = path.join(ROOT, 'data', 'toast'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.json`);
  fs.writeFileSync(f, JSON.stringify({ title, body: text.slice(0, 300), attribution: `War Room · ${kind === 'approval' ? 'needs you' : kind}`, hero: path.join(ROOT, 'public', 'alerts', `${kind}.png`), logo: path.join(ROOT, 'public', 'icon-192.png'), buttons: buttons.slice(0, 3), scenario: kind === 'approval' ? 'reminder' : 'default', open: `${base}/`, aumid: AUMID }));
  spawnProc('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', path.join(ROOT, 'windows', 'toast.ps1'), '-Json', f], { windowsHide: true, detached: true, stdio: 'ignore' }).unref();
}
const notifier = createNotifier(path.join(ROOT, 'data'), { onCommand: phoneCommand, desktop: desktopToast, log: (m) => console.error(m) });
const alertImg = (kind) => path.join(ROOT, 'public', 'alerts', `${kind}.png`);

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
  const ctx = `# Channel brain (what we know works)\n${brain()}\n\n# Taste profile (what the Commander likes)\n${tasteRead().replace(TASTE_HEAD, '').trim().slice(0, 4000)}\n\n# Context\n${store.recentHive(10).map((e) => `- ${e.agent || 'Commander'}: ${e.text}`).join('\n') || '- (no history yet)'}\nPinned memory: ${store.pinned().trim() || '(none)'}`;
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
  const okOfficers = officers.filter((s) => s.status === 'done');
  if (!okOfficers.length) { wr.error = `No officer could answer: ${(officers[0]?.text || '').slice(0, 300)}`; hive({ agent: null, kind: 'failed', text: wr.error }); return finishWr(wr, 'failed'); }
  // 2) the Marshal synthesizes from the officers' reads
  wr.stage = 'synthesis'; emit('warroom', wr);
  const marshal = wr.seats.find((s) => s.role === 'marshal');
  const reads = okOfficers.map((s) => `## ${byId[s.agent].name}\n${s.text}`).join('\n\n') + (okOfficers.length < officers.length ? `\n\n(${officers.length - okOfficers.length} officer(s) failed to answer and are left out.)` : '');
  await seatRun(marshal, `WAR ROOM. DECISION: ${wr.question}\n\nThe officers' independent reads:\n\n${reads}\n\nAs the Marshal, name the winning course of action from THEIR reads (not your own preference). Format:\nSTRATEGY: one paragraph\nBATTLE PLAN: 3–6 numbered lines, each exactly "N. @<agent-id>: <task>" using these ids: ${agents.map((a) => a.id).join(', ')}\nCONSENSUS: one line naming the emerging majority and who dissented`, [], demoSeat(byId[marshal.agent], 'marshal', wr.question));
  wr.strategy = marshal.text;
  if (wr.abort.signal.aborted) return finishWr(wr, 'stopped');
  if (marshal.status !== 'done') { wr.error = `The Marshal could not answer: ${(marshal.text || '').slice(0, 300)}`; hive({ agent: null, kind: 'failed', text: wr.error }); return finishWr(wr, 'failed'); }
  // 3) the Tenth Man attacks the consensus last (sees only the consensus, not the officers' reasoning)
  wr.stage = 'dissent'; emit('warroom', wr);
  const tenth = wr.seats.find((s) => s.role === 'tenth');
  const consensus = (marshal.text.match(/STRATEGY:[\s\S]*?(?=BATTLE PLAN:|$)/) || [marshal.text])[0] + '\n' + ((marshal.text.match(/CONSENSUS:.*$/m) || [''])[0]);
  await seatRun(tenth, `WAR ROOM. DECISION: ${wr.question}\n\nThe council's consensus:\n${consensus}\n\nYou are the Tenth Man. You SHARED this majority; your duty now is to show how it loses.\nFirst list OBVIOUS: the top-3 objections anyone would predict.\nThen PRE-MORTEM: it is 48 hours after posting and the decision failed. Tell the concrete failure MECHANISM, outside the obvious three if you can. If you can only find obvious ones, say so honestly.\nEnd with PREDICTABILITY: novel | predictable.\nIf you find no grounded attack at all, answer only: ALL CLEAR.`, [], demoSeat(byId[tenth.agent], 'tenth', wr.question));
  wr.dissent = tenth.text;
  finishWr(wr, 'awaiting');
}
function finishWr(wr, stage) {
  if (stage === 'awaiting') notifier.send('approval', '⚔️ The council has a verdict',  `"${wr.question.slice(0, 140)}": open the War Room tab to read the strategy and the Tenth Man, then seal it.`, { photo: alertImg('approval'), tab: 'war' });
  else if (stage === 'failed') notifier.send('failed', '⚠️ Council failed', (wr.error || wr.question).slice(0, 400), { photo: alertImg('failed'), tab: 'war' });
  wr.stage = stage; wr.finished = Date.now(); store.save(); emit('warroom', wr); hive({ agent: null, kind: 'warroom', text: `War Room ${stage === 'awaiting' ? 'returned a verdict on' : stage + ':'} "${wr.question.slice(0, 80)}"` }); }
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
  { const am = url.pathname.match(/^\/act\/([0-9a-f]{24})\/(approve|reject|resume|unpause)\/([\w-]+)$/);
    if (am) { const msg = am[1] === ACT_KEY ? await phoneCommand(`${am[2]}${am[3] !== '-' ? ':' + am[3] : ''}`) : 'This link has expired (the War Room restarted).';
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset=utf-8><title>War Room</title><body style="margin:0;height:100vh;display:grid;place-items:center;background:#05070b;color:#e3e9f3;font:600 18px system-ui"><div style="padding:28px 34px;border:1px solid #4fd1ff55;border-radius:16px;background:#0d121b;max-width:520px">${msg.replace(/[<>&]/g, '')}<p style="color:#7f8ba0;font-size:13px">You can close this tab. <a style="color:#4fd1ff" href="/">Open the War Room</a></p></div><script>setTimeout(()=>window.close(),4000)</script></body>`); } }
  if (TOKEN) {
    const ok = (req.headers.cookie || '').includes(`wr_token=${TOKEN}`) || url.searchParams.get('token') === TOKEN;
    if (!ok) { res.writeHead(401, { 'content-type': 'text/plain' }); return res.end('War Room locked. Open with ?token=YOUR_TOKEN once.'); }
    if (url.searchParams.get('token') === TOKEN) res.setHeader('set-cookie', `wr_token=${TOKEN}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`);
  }
  const p = url.pathname;
  try {
    if (p === '/api/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write('retry: 2000\n\n'); clients.add(res); res.notif = url.searchParams.get('n') === 'granted';
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
    let pm;
    if ((pm = p.match(/^\/api\/productions\/(\w+)\/post$/)) && req.method === 'GET') { const pr = prods.find((x) => x.id === pm[1]); return pr?.slug ? json(res, postInfo(pr)) : json(res, { error: 'not found' }, 404); }
    if ((pm = p.match(/^\/api\/productions\/(\w+)\/(video|brief)$/)) && req.method === 'GET') {
      const pr = prods.find((x) => x.id === pm[1]); if (!pr) return json(res, { error: 'not found' }, 404);
      if (pm[2] === 'video') { const f = path.join(WORKSPACE, 'projects', pr.slug || '_', 'out', 'final.mp4'); return fs.existsSync(f) ? sendVideo(req, res, f) : json(res, { error: 'no video yet' }, 404); }
      return json(res, { text: fs.existsSync(briefPath(pr)) ? fs.readFileSync(briefPath(pr), 'utf8') : '' });
    }
    if (p === '/api/productions' && req.method === 'POST') {
      const b = await body(req); if (!String(b.source || '').trim()) return json(res, { error: 'empty' }, 400);
      const pr = { id: uid(), title: String(b.title || b.source).split('\n')[0].slice(0, 90), source: String(b.source).trim(), notes: String(b.notes || '').trim(), quality: ['draft', 'standard', 'max'].includes(b.quality) ? b.quality : 'max', builder: b.builder === 'sonnet' ? 'sonnet' : 'opus', created: Date.now(), stage: 'brief', log: [], cost: 0 };
      prods.push(pr); hive({ agent: null, kind: 'order', text: `🎬 greenlit: ${pr.title}` }); startBrief(pr); return json(res, pub(pr));
    }
    if (p === '/api/notify' && req.method === 'GET') return json(res, notifier.view());
    if (p === '/api/notify' && req.method === 'POST') { try { return json(res, await notifier.update(await body(req))); } catch (e) { return json(res, { error: e.message }, 400); } }
    if (p === '/api/notify/test-desktop' && req.method === 'POST') {
      if (process.platform !== 'win32') return json(res, { ok: false, error: 'Windows only' });
      const f = path.join(ROOT, 'data', 'toast', `test-${Date.now()}.json`); fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, JSON.stringify({ title: '🛰 War Room test', body: 'If you can see and hear this, Windows notifications work.', attribution: 'War Room', hero: path.join(ROOT, 'public', 'alerts', 'done.png'), logo: path.join(ROOT, 'public', 'icon-192.png'), buttons: [{ text: 'Open War Room', url: `http://localhost:${PORT}/` }], aumid: AUMID }));
      const r = (await import('node:child_process')).spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'windows', 'toast.ps1'), '-Json', f], { encoding: 'utf8', timeout: 20000, windowsHide: true });
      return json(res, { ok: r.status === 0 && !r.stderr, aumid: AUMID || '(PowerShell)', error: (r.stderr || r.error?.message || '').slice(0, 600) });
    }
    if (p === '/api/notify/test' && req.method === 'POST') { await notifier.send('done', '📱 War Room test alert', 'Phone alerts work. You will get approvals, finished videos, failures and usage pauses here.', { force: true }); return json(res, { ok: true }); }
    if ((pm = p.match(/^\/api\/productions\/(\w+)\/(approve|cancel|render|resume|open|phone)$/)) && req.method === 'POST') {
      const b = await body(req); const pr = prods.find((x) => x.id === pm[1]); if (!pr) return json(res, { error: 'not found' }, 404);
      if (b.quality && ['draft', 'standard', 'max'].includes(b.quality)) pr.quality = b.quality;
      if (b.builder) pr.builder = b.builder === 'sonnet' ? 'sonnet' : 'opus';
      if (b.notes) pr.notes = [pr.notes, String(b.notes)].filter(Boolean).join('\n');
      if (pm[2] === 'approve') approveProd(pr);
      else if (pm[2] === 'cancel') cancelProduction(pr);
      else if (pm[2] === 'render' && pr.slug) { pr.fixes = 0; startRender(pr); }
      else if (pm[2] === 'resume') resumeProd(pr);
      else if (pm[2] === 'phone' && pr.stage === 'done') await sendToPhone(pr);
      else if (pm[2] === 'open' && pr.final) { if (process.platform === 'win32') spawnProc('explorer.exe', [`/select,${pr.final}`], { detached: true }); }
      return json(res, pub(pr));
    }
    if (p === '/api/pitches' && req.method === 'GET') {
      const dir = path.join(WORKSPACE, 'pitches'); let files = []; try { files = fs.readdirSync(dir).filter((f) => /\.json$/.test(f)).sort().reverse().slice(0, 40); } catch {}
      const fb = new Map(); for (const v of feedback().filter((x) => x.type === 'vote' || x.type === 'greenlit')) { const o = fb.get(v.key) || {}; if (v.type === 'vote') { o.vote = v.vote; o.reason = v.reason; } else o.greenlit = true; fb.set(v.key, o); }
      const out = [];
      for (const f of files) { try { const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); for (const pt of j.pitches || []) { const key = `${f}#${pt.id}`; out.push({ ...pt, key, file: f, created: j.created || f.slice(0, 10), order: j.order || '', theme: j.theme || '', ...(fb.get(key) || {}) }); } } catch {} }
      const md = (() => { try { return fs.readdirSync(dir).filter((f) => /\.md$/.test(f) && !fs.existsSync(path.join(dir, f.replace(/\.md$/, '.json')))).sort().reverse().slice(0, 6); } catch { return []; } })();
      return json(res, { pitches: out, legacy: md });
    }
    if (p === '/api/taste' && req.method === 'GET') return json(res, { md: tasteRead() });
    if (req.method === 'POST' && ['/api/pitches/vote', '/api/teach', '/api/pitches/generate', '/api/pitches/greenlight'].includes(p)) {
      const b = await body(req);
      if (p === '/api/teach') { const text = String(b.text || '').trim(); if (!text) return json(res, { error: 'empty' }, 400); addFeedback({ type: 'rule', text }); hive({ agent: null, kind: 'memory', text: `🎓 taught: ${text.slice(0, 160)}` }); return json(res, { ok: true }); }
      if (p === '/api/pitches/vote') { addFeedback({ type: 'vote', key: b.key, title: String(b.title || '').replace(/\*/g, ''), vote: b.vote > 0 ? 1 : -1, reason: String(b.reason || '').slice(0, 300) }); return json(res, { ok: true }); }
      if (p === '/api/pitches/generate') {
        const n = [3, 5].includes(+b.n) ? +b.n : 3, theme = String(b.theme || '').trim();
        hive({ agent: null, kind: 'order', text: `💡 pitch ${n}${theme ? ': ' + theme : ''}` });
        const t = await createTask({ agent: 'scout', playbook: 'pitch', deep: !!b.deep, text: `Pitch ${n} ideas for the next TikTok.${theme ? ` Theme or constraint from the Commander: ${theme}` : ''}` });
        return json(res, publicTask(t));
      }
      if (p === '/api/pitches/greenlight') {
        const pt = b.pitch || {}; addFeedback({ type: 'greenlit', key: pt.key, title: String(pt.title || '').replace(/\*/g, '') });
        const source = `Pitch "${String(pt.title || '').replace(/\*/g, '')}" (${pt.key}). Full pitch:\n${JSON.stringify({ title: pt.title, cover: pt.cover, frame1: pt.frame1, beats: pt.beats, law: pt.law, source: pt.source, dramatization: pt.dramatization, risk: pt.risk, build: pt.build }, null, 1)}`;
        const pr = { id: uid(), title: String(pt.title || 'New production').replace(/\*/g, '').slice(0, 90), source, notes: String(b.notes || '').trim(), quality: ['draft', 'standard', 'max'].includes(b.quality) ? b.quality : 'max', builder: b.builder === 'sonnet' ? 'sonnet' : 'opus', created: Date.now(), stage: 'brief', log: [], cost: 0 };
        prods.push(pr); hive({ agent: null, kind: 'order', text: `🎬 greenlit: ${pr.title}` }); startBrief(pr); return json(res, pub(pr));
      }
    }
    if (p === '/api/state') return json(res, {
      demo: DEMO, mode: MODE, usage: usage(), workspace: WORKSPACE, version: VERSION, onDisk: gitHead(),
      agents: agents.map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, color: a.color, role: a.role, model: a.model, tools: a.tools, lens: a.lens, ...live[a.id], done: store.tasks.filter((t) => t.agent === a.id && t.status === 'done').length, cost: store.tasks.filter((t) => t.agent === a.id).reduce((s, t) => s + t.cost, 0) })),
      tasks: store.tasks.slice(-200).map(publicTask), hive: store.recentHive(120),
      approvals: [...approvals.values()].map(({ resolve, ...a }) => a),
      warrooms: store.warrooms.slice(-30).map(({ abort, ...w }) => w), pinned: store.pinned(),
      productions: prods.slice(-30).map(pub),
    });
    if (p.startsWith('/api/tasks/') && req.method === 'GET') { const t = store.tasks.find((x) => x.id === p.split('/')[3]); return t ? json(res, t) : json(res, { error: 'not found' }, 404); }
    if (req.method === 'POST') {
      const b = await body(req);
      if (p === '/api/tasks' && b.team) { if (!b.text?.trim()) return json(res, { error: 'empty' }, 400); hive({ agent: null, kind: 'order', text: `👥 ${b.text.slice(0, 200)}` }); const t = startTeam(b.text.trim(), !!b.deep); return json(res, publicTask(t)); }
      if (p === '/api/tasks') { if (!b.text?.trim()) return json(res, { error: 'empty' }, 400); hive({ agent: null, kind: 'order', text: b.text.slice(0, 200) }); const t = await createTask({ text: b.text.trim(), agent: byId[b.agent] ? b.agent : null, deep: !!b.deep }); return json(res, publicTask(t)); }
      let m;
      if (p === '/api/resume') { limitedUntil = 0; capUntil = 0; hive({ agent: null, kind: 'info', text: 'Commander resumed the queue' }); emit('usage', usage()); pump(); return json(res, { ok: true }); }
      const cancel = (t) => {
        if (!t) return false;
        if (t.status === 'running') { aborts.get(t.id)?.abort(); hive({ agent: null, kind: 'info', text: `stopped @${t.agent}: ${t.title}` }); return true; }
        if (t.status === 'queued' || t.status === 'routing') { t.status = 'stopped'; t.finished = Date.now(); t.log.push({ t: Date.now(), kind: 'info', text: 'Cancelled by the Commander.' }); emit('task', publicTask(t)); hive({ agent: null, kind: 'info', text: `cancelled: ${t.title}` }); settle(t); return true; }
        if (t.status === 'team') { t.abort?.abort(); for (const c of store.tasks.filter((x) => x.parent === t.id)) cancel(c); return true; }
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
  console.log(`  Slots: ${SLOTS} (Haiku 0.5, Sonnet 1, Opus 2)   usage cap: ${Math.round(PLAN_CAP * 100)}% of the plan's 5-hour window${MODE === 'plan' ? '' : ` ($${WINDOW_USD} API-equivalent)`}`);
  console.log(`  Workspace: ${WORKSPACE}\n  Agents: ${agents.map((a) => a.emoji + ' ' + a.name).join('  ')}\n`);
});
