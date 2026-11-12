// Loads agents/*.md: a small YAML-ish frontmatter block + the system prompt body.
import fs from 'node:fs';
import path from 'node:path';

function parseValue(v) {
  v = v.trim();
  if (v.startsWith('[') && v.endsWith(']')) return v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  if (/^".*"$|^'.*'$/.test(v)) return v.slice(1, -1);
  if (v === 'true' || v === 'false') return v === 'true';
  if (v !== '' && !isNaN(+v)) return +v;
  return v;
}

export function loadAgents(dir) {
  const agents = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');   // Windows checkouts use CRLF
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) continue;
    const meta = {};
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0 && !line.startsWith(' ')) meta[line.slice(0, i).trim()] = parseValue(line.slice(i + 1));
    }
    agents.push({
      id: meta.id || path.basename(f, '.md'),
      name: meta.name || meta.id,
      emoji: meta.emoji || '🤖',
      color: meta.color || '#9aa4b2',
      role: meta.role || '',
      model: meta.model || process.env.WARROOM_MODEL || 'claude-opus-5-5',
      effort: meta.effort || 'medium',
      tools: meta.tools || ['Read', 'Glob', 'Grep'],
      writes: meta.writes || [],
      bash: meta.bash || [],
      preset: !!meta.preset,
      maxTurns: meta.maxTurns || 25,
      lens: meta.lens || '',
      keywords: meta.keywords || [],
      prompt: m[2].trim(),
      order: meta.order ?? 99,
      agent: meta.agent, match: meta.match,
      multi: !!meta.multi,
    });
  }
  return agents.sort((a, b) => a.order - b.order);
}

// Tools that never change anything run without asking the Commander.
export const READ_ONLY = new Set(['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'TodoWrite']);
