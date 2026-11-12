// Runs one agent turn and streams what it does. Three backends:
//   plan  (default when Claude Code is installed and no API key is set): runs the Claude Code CLI on this PC
//         (`claude -p`, signed in with the Commander's Claude account), so usage counts against the Claude plan.
//         Tools are pre-approved per agent (READ_ONLY + the agent's `writes` folders + its `bash` command prefixes);
//         anything else is refused, and the agent is told to ask the Commander instead.
//   api   (ANTHROPIC_API_KEY set, or WARROOM_BACKEND=api): Claude Agent SDK, billed to the API key, live approvals.
//   demo  (--demo, or neither of the above): simulated agents, free.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function findClaude() {
  if (process.env.CLAUDE_BIN && fs.existsSync(process.env.CLAUDE_BIN)) return process.env.CLAUDE_BIN;
  const win = process.platform === 'win32';
  const known = win ? [path.join(os.homedir(), '.local', 'bin', 'claude.exe')] : [path.join(os.homedir(), '.local', 'bin', 'claude'), '/usr/local/bin/claude'];
  try {
    const out = execFileSync(win ? 'where' : 'which', win ? ['claude'] : ['-a', 'claude'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const list = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const exe = list.find((l) => /\.exe$/i.test(l)) || list.find((l) => /\.cmd$/i.test(l)) || list[0];
    if (exe) return exe;
  } catch {}
  return known.find((k) => fs.existsSync(k)) || null;
}
const CLAUDE = findClaude();
export const MODE = process.argv.includes('--demo') ? 'demo'
  : (process.env.WARROOM_BACKEND || (process.env.ANTHROPIC_API_KEY ? 'api' : CLAUDE ? 'plan' : 'demo'));
export const DEMO = MODE === 'demo';
export const CLAUDE_BIN = CLAUDE;

function toolSummary(b) {
  const i = b.input || {};
  const arg = i.file_path || i.path || i.pattern || i.url || i.query || i.command || i.description || '';
  return `${b.name}${arg ? ' · ' + String(arg).slice(0, 140) : ''}`;
}

/**
 * @param {object} p
 * @param {object} p.agent      agent definition (lib/agents.js)
 * @param {string} p.prompt     the full user prompt for this run
 * @param {string} [p.system]   extra system text appended to the agent's own prompt
 * @param {string} p.cwd        workspace directory the agent works in
 * @param {(e:{kind:string,text:string})=>void} p.onLog
 * @param {Function} p.canUseTool   permission callback (approval queue)
 * @param {AbortController} p.abort
 * @param {string[]} [p.tools]  override the agent's tool list (e.g. [] for pure-reasoning War Room seats)
 * @param {number} [p.maxTurns]
 */
export async function runAgent(p) {
  if (DEMO) return demoRun(p);
  if (MODE === 'plan') return planRun(p);
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const a = p.agent;
  const sys = [a.prompt, p.system].filter(Boolean).join('\n\n');
  const tools = p.tools ?? a.tools;
  let result = null;
  const q = query({
    prompt: p.prompt,
    options: {
      cwd: p.cwd,
      model: a.model,
      effort: a.effort,
      maxTurns: p.maxTurns ?? a.maxTurns,
      maxBudgetUsd: +(process.env.WARROOM_TASK_BUDGET_USD || 3),
      systemPrompt: a.preset ? { type: 'preset', preset: 'claude_code', append: sys } : sys,
      tools,
      canUseTool: p.canUseTool,
      abortController: p.abort,
      settingSources: ['project'], // load the workspace CLAUDE.md, not your personal ~/.claude settings
      persistSession: false,
    },
  });
  for await (const m of q) {
    if (m.type === 'assistant') {
      if (m.error) p.onLog({ kind: 'error', text: `API error: ${m.error}` });
      for (const b of m.message?.content || []) {
        if (b.type === 'text' && b.text.trim()) p.onLog({ kind: 'text', text: b.text });
        else if (b.type === 'tool_use') p.onLog({ kind: 'tool', text: toolSummary(b) });
      }
    } else if (m.type === 'result') result = m;
  }
  if (!result) return { ok: false, text: '', cost: 0, turns: 0, error: 'No result (stopped?)' };
  const ok = result.subtype === 'success' && !result.is_error;
  return {
    ok,
    text: ok ? result.result : (result.result || ''),
    cost: result.total_cost_usd || 0,
    turns: result.num_turns || 0,
    error: ok ? null : [result.subtype, ...(result.errors || [])].join(': '),
  };
}

// ---------------- plan backend: the Claude Code CLI on this PC ----------------
const READ_TOOLS = ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'TodoWrite'];
const ALL_TOOLS = [...READ_TOOLS, 'Bash', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Task'];
const q = (a) => (/[\s"&|<>^()]/.test(a) ? '"' + a.replace(/"/g, '""') + '"' : a);   // cmd.exe quoting (only for a .cmd shim)
function planArgs(a, p, tools) {
  const args = ['-p', '--output-format', 'stream-json', '--verbose', '--model', p.model || a.model, '--max-turns', String(p.maxTurns ?? a.maxTurns), '--setting-sources', 'project', '--strict-mcp-config'];   // no MCP servers: agents don't need them, and their tool lists cost tokens on every call
  const allow = tools.filter((t) => READ_TOOLS.includes(t));
  if (tools.some((t) => ['Write', 'Edit', 'MultiEdit'].includes(t))) for (const w of a.writes || []) allow.push(`Edit(${w.replace(/\/$/, '')}/**)`);
  if (tools.includes('Bash')) for (const b of a.bash || []) allow.push(`Bash(${b}:*)`);
  const deny = ALL_TOOLS.filter((t) => !tools.includes(t));
  // seats without tools (council officers, the router) don't need Claude Code's long coding system prompt: replace it
  if (!tools.length) args.push('--system-prompt', 'You are one member of an AI team that runs a TikTok studio. Answer in plain text, following the instructions in the message.');
  if (allow.length) args.push('--allowedTools', ...allow);
  if (deny.length) args.push('--disallowedTools', ...deny);
  return args;
}
function planRun(p) {
  const a = p.agent, tools = p.tools ?? a.tools;
  const role = [a.prompt, p.system].filter(Boolean).join('\n\n');
  const rules = tools.length
    ? `\n\n# Permissions\nYou may read anything${(a.writes || []).length ? `, and write only under: ${a.writes.join(', ')}` : ''}${(a.bash || []).length ? `. Commands you may run start with: ${a.bash.join(' | ')}` : ''}. Anything else is refused automatically: do not retry it; finish with a line "NEEDS APPROVAL: <exact action and why>" so the Commander can decide.`
    : '\n\nAnswer directly in text. You have no tools in this seat.';
  const prompt = `# Your role\n${role}${rules}\n\n${p.prompt}`;
  const env = { ...process.env }; delete env.ANTHROPIC_API_KEY;   // use the Claude login on this PC, never an API key
  const isCmd = /\.(cmd|bat)$/i.test(CLAUDE);
  const args = planArgs(a, p, tools);
  return new Promise((resolve) => {
    let child;
    try { child = spawn(isCmd ? q(CLAUDE) : CLAUDE, isCmd ? args.map(q) : args, { cwd: p.cwd, env, shell: isCmd, windowsHide: true }); }
    catch (e) { return resolve({ ok: false, text: '', cost: 0, turns: 0, error: `Could not start Claude Code (${CLAUDE}): ${e.message}` }); }
    let buf = '', err = '', result = null;
    const kill = () => { try { if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); else child.kill('SIGTERM'); } catch {} };
    p.abort?.signal.addEventListener('abort', kill);
    child.stdout.on('data', (d) => {
      buf += d; let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.type === 'assistant') {
          for (const b of m.message?.content || []) {
            if (b.type === 'text' && b.text.trim()) p.onLog({ kind: 'text', text: b.text });
            else if (b.type === 'tool_use') p.onLog({ kind: 'tool', text: toolSummary(b) });
          }
        } else if (m.type === 'result') result = m;
      }
    });
    child.stderr.on('data', (d) => { err += d; if (err.length > 8000) err = err.slice(-8000); });
    child.stdin.on('error', () => {});
    child.stdin.end(prompt);
    child.on('error', (e) => { err += e.message; });
    child.on('close', () => {
      for (const d of result?.permission_denials || []) p.onLog({ kind: 'error', text: `refused (not pre-approved): ${toolSummary({ name: d.tool_name, input: d.tool_input })}` });
      const text = result?.result || '';
      const all = `${text}\n${err}`;
      // only Claude's own plan/rate-limit messages pause the queue (never "max turns", which is a normal stop)
      const limited = !(result && (result.subtype === 'success' && !result.is_error || /max_turns/.test(result.subtype || '')))
        && /usage limit|rate[ _-]?limit(ed)?\b|\b429\b|overloaded_error|\b(5-hour|weekly|session) limit/i.test(all);
      const ep = all.match(/\|(\d{10})\b/);
      if (!result) return resolve({ ok: false, text: '', cost: 0, turns: 0, limited, resetAt: ep ? +ep[1] * 1000 : null, error: (err.trim().split('\n').slice(-3).join(' ') || 'Claude Code exited without a result').slice(0, 400) });
      const ok = result.subtype === 'success' && !result.is_error;
      resolve({ ok, text, cost: result.total_cost_usd || 0, turns: result.num_turns || 0, usage: result.usage, limited: limited && !ok, resetAt: ep ? +ep[1] * 1000 : null,
        error: ok ? null : [result.subtype, text.slice(0, 300), err.trim().slice(-300)].filter(Boolean).join(': ') });
    });
  });
}

// ---------------- demo mode ----------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEMO_LINES = {
  producer: ['Reading CLAUDE.md and channel/results.csv…', 'Splitting the job: Scout pitches and sources the fact, Writer boards the winner, Analyst reviews, Studio builds.'],
  scout: ['Searching for space what-ifs trending this week…', 'Checking the topic test on 7 candidates; 3 survive. Sourcing each fact.'],
  writer: ['Drafting captions on the 61–70 s clock…', 'Counter law: distance halves every 5 s → 11 steps to the Roche limit.'],
  studio: ['Reading engine/src/moon.js and tools/build_page.py…', 'Building projects/demo/src/s01_hook.js at half size.'],
  analyst: ['Reading channel/results.csv…', 'Watching frame 1 muted: attention risk at 0:07, where two steps look the same.'],
};
const DEMO_TOOLS = { producer: ['Read · CLAUDE.md'], scout: ['WebSearch · what if moon closer tiktok', 'WebFetch · https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html'], writer: ['Read · PLAYBOOK.md', 'Write · projects/moon-2x/script.md'], studio: ['Read · engine/src/moon.js', 'Bash · python3 tools/build_page.py projects/demo/src/s01_hook.js'], analyst: ['Read · channel/results.csv', 'Read · projects/moon-2x/script.md'] };
const DEMO_RESULT = {
  producer: (task) => `SUMMARY: Plan set for "${task.slice(0, 50)}".\n\n**Plan (UTC):**\n1. Scout pitches 3 premises with sourced facts (30 min).\n2. War Room picks one (15 min).\n3. Writer boards it (45 min), then the Analyst reviews it as the Scroller.\n4. Studio builds the look test.\n\nDELEGATE @scout: Pitch 3 premises for the next video that pass the topic test, each with a sourced fact.`,
  scout: () => `SUMMARY: 3 pitches ready; strongest is "What if the Moon got 2x closer every 5 s?"\n\n1. **Moon 2× closer every 5 s**: the Moon recedes 3.8 cm/yr (NASA/LLR). Ladder: tides → floods → Roche limit → ring. Frame 1: a giant Moon over a packed beach.\n2. **Earth spins 2× faster each step**: a day was ~22 h, 400 M years ago.\n3. **Sun shrinks by half every 6 s**: the Sun loses ~4 M tonnes of mass per second.\n\nVERIFIED: all 3 facts. SPECULATIVE: how space topics retain.\nREMEMBER: Space what-ifs with a body growing in the sky make the strongest frame 1.`,
  writer: () => `SUMMARY: Board written to projects/moon-2x/script.md (66 s, 11 steps, 2 sets).\n\nCaptions (excerpt): "WHAT IF THE MOON GOT 2× CLOSER" 0.0–3.0 s · "EVERY 5 SECONDS" 3.0–6.0 s…\n\nDELEGATE @analyst: Review projects/moon-2x/script.md as the Scroller.`,
  studio: () => `SUMMARY: Look-test shot built at half size; 2 key frames OK.\n\nChanged: projects/demo/src/s01_hook.js. Verified: the page builds and frames at t=0 and 2.5 s render. Weak: the crowd reads small at phone size.`,
  analyst: () => `SUMMARY: 3 ranked fixes; the biggest is a dead frame at 0:07.\n\n1. 0:07: steps 2 and 3 read the same; make step 3 flood the promenade.\n2. Frame 1 lacks a sound hit; put the braaam on frame 0.\n3. The caption at 0:41 is 9 words; cut "really".\n\nREMEMBER: Every step needs its own world reaction, not only a bigger counter.`,
};
async function demoRun(p) {
  const id = p.agent.id;
  for (const line of DEMO_LINES[id] || ['Working…']) { if (p.abort?.signal.aborted) break; await sleep(900 + Math.random() * 900); p.onLog({ kind: 'text', text: line }); }
  for (const t of DEMO_TOOLS[id] || []) {
    if (p.abort?.signal.aborted) break;
    await sleep(700 + Math.random() * 700);
    const [name, arg] = t.split(' · ');
    if (!['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch'].includes(name) && (p.tools ?? p.agent.tools).includes(name)) {
      const r = await p.canUseTool(name, name === 'Bash' ? { command: arg } : { file_path: arg }, { signal: p.abort.signal });
      p.onLog({ kind: r.behavior === 'allow' ? 'tool' : 'error', text: r.behavior === 'allow' ? t : `${t} (denied)` });
    } else if ((p.tools ?? p.agent.tools).length) p.onLog({ kind: 'tool', text: t });
  }
  if (p.abort?.signal.aborted) return { ok: false, text: '', cost: 0, turns: 0, error: 'Stopped by the Commander' };
  await sleep(800);
  const text = p.demoText ? p.demoText() : (DEMO_RESULT[id] || (() => 'SUMMARY: Done.'))(p.taskText || '');
  return { ok: true, text, cost: 0, turns: 3, error: null };
}
