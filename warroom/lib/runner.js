// Runs one agent turn through the Claude Agent SDK and streams what it does.
// DEMO mode (no ANTHROPIC_API_KEY, or --demo) simulates agents so the dashboard can be explored for free.
import { query } from '@anthropic-ai/claude-agent-sdk';

export const DEMO = process.argv.includes('--demo') || !process.env.ANTHROPIC_API_KEY;

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

// ---------------- demo mode ----------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEMO_LINES = {
  producer: ['Reading CLAUDE.md and the latest results…', 'Splitting the job: Scout pitches, Writer boards the winner, Fact Officer verifies, Scroller reviews.'],
  scout: ['Searching for space what-ifs trending this week…', 'Checking the topic test on 7 candidates; 3 survive.'],
  writer: ['Drafting captions on the 61–70 s clock…', 'Counter law: distance halves every 5 s → 11 steps to Roche limit.'],
  factcheck: ['Looking up the Moon’s mean distance and recession rate…', 'Source found: NASA lunar fact sheet; LLR measures 3.8 cm/yr recession.'],
  critic: ['Watching frame 1 muted…', 'Attention risk at 0:07: two steps in a row look the same.'],
  engineer: ['Reading engine/src/moon.js and tools/build_page.py…', 'Building projects/demo/src/s01_hook.js at half size.'],
};
const DEMO_TOOLS = { producer: ['Read · CLAUDE.md'], scout: ['WebSearch · what if moon closer tiktok', 'WebFetch · https://www.tiktok.com/tag/space'], writer: ['Read · PLAYBOOK.md', 'Write · projects/moon-2x/script.md'], factcheck: ['WebSearch · moon distance recession rate', 'WebFetch · https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html'], critic: ['Read · projects/moon-2x/script.md'], engineer: ['Read · engine/src/moon.js', 'Bash · python3 tools/build_page.py projects/demo/src/s01_hook.js'] };
const DEMO_RESULT = {
  producer: (task) => `SUMMARY: Plan set for "${task.slice(0, 50)}".\n\n**Plan (UTC):**\n1. Scout pitches 3 premises (30 min).\n2. War Room picks one (15 min).\n3. Writer boards it; Fact Officer verifies the fuse fact (45 min).\n4. Scroller reviews the board; Engineer builds the look test.\n\nDELEGATE @scout: Pitch 3 premises for the next video that pass the topic test.`,
  scout: () => `SUMMARY: 3 pitches ready; strongest is "What if the Moon got 2x closer every 5 s?"\n\n1. **Moon 2× closer every 5 s**: fact: the Moon recedes 3.8 cm/yr (LLR). Ladder: tides → floods → Roche limit → ring. Hook: a giant Moon over a packed beach.\n2. **Earth spins 2× faster each step**: fact: a day was ~22 h 400 M years ago.\n3. **Sun shrinks by half every 6 s**: fact: the Sun loses 4 M t/s.\n\nVERIFIED: facts 1–3. ASSUMED: retention on space topics.\nREMEMBER: Space what-ifs with a body growing in the sky make the strongest frame 1.`,
  writer: () => `SUMMARY: Board written to projects/moon-2x/script.md (66 s, 11 steps, 3 sets).\n\nCaptions (excerpt): "WHAT IF THE MOON GOT 2× CLOSER" 0.0–3.0 s · "EVERY 5 SECONDS" 3.0–6.0 s…\n\nDELEGATE @factcheck: Verify every number in projects/moon-2x/script.md.`,
  factcheck: () => `SUMMARY: Fuse fact verified; 2 numbers fixed; 4 shots need DRAMATIZATION.\n\nVERIFIED: mean distance 384,400 km (NASA). LIKELY: tides scale with 1/d³. SPECULATIVE: everything after step 3.`,
  critic: () => `SUMMARY: 3 ranked fixes; the biggest is a dead frame at 0:07.\n\n1. 0:07: steps 2 and 3 read the same; make step 3 flood the promenade.\n2. Frame 1 lacks a sound hit; add the braaam on frame 0.\n3. The caption at 0:41 is 9 words; cut "really".`,
  engineer: () => `SUMMARY: Look-test shot built at half size; 2 key frames OK.\n\nChanged: projects/demo/src/s01_hook.js. Verified: page builds, frames at t=0 and 2.5 s render. Weak: crowd reads small at phone size.`,
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
