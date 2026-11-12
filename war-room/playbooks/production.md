---
id: production
name: Production brief
agent: producer
match: (?!x)x
maxTurns: 30
---
# Playbook: write the production brief for a greenlit idea

The Commander greenlit an idea. Turn it into **projects/<slug>/PRODUCTION.md**: one complete, self-contained build order that the Director (or any Claude session) can build from without asking anything.
- Use a short kebab-case slug from the premise (e.g. `air-vanishes`). If that folder exists, add -2.
- Read the source the order names (a pitch file and its number, a sealed dossier, or the Commander's own words), plus channel/BRAIN.md, PLAYBOOK.md and CLAUDE.md (what the engine already has).
- The Commander's words in the order override the pitch.

PRODUCTION.md must contain exactly these sections:

1. **Premise and title:** the title question (one *accent* word), the cover line (a verifiable fact with a number) and the caption.
2. **The law:** the one rule, its numbers and their source URLs, the one stated liberty (DRAMATIZATION), and a table of the key values the counter will show (computed, not guessed; show the arithmetic briefly).
3. **The board:** a table of 9–12 shots with name, frames, film time, location/set, camera (lens mm and move), what visibly happens, caption (≤ 8 words) and counter (label / value / fact line). The total is 30–38 s. Escalate every step in a new place. Payoff or escalation by 0:03. End big, then hard-cut back to frame 1.
4. **Build map:** for each shot, the existing engine modules to reuse (from CLAUDE.md) and what is NEW. Keep new work small and name it. Flag the 1–2 riskiest shots.
5. **Sound:** a beat sheet: ticks, risers, the hits on cuts, and silence as the last beat. No voiceover.
6. **Look:** daylight first, full-colour people at mid-distance, no gore, no fluffy smoke, the TikTok safe area for text.
7. **Render and QC:** quality `max` on the Commander's PC. check.py must PASS: frames, −14 LUFS, no flashes, contrast ≥ 3:1, safe area.
8. **Posting:** the cover, caption, the fixed hashtag set and the slot (from the brain).

Also write **projects/<slug>/POST.json** (machine-readable, used to send the finished video to the Commander's phone):
`{"cover": "<cover line, all caps>", "caption": "<the TikTok caption, no hashtags, no question to the viewer>", "hashtags": ["#whatif", "..."], "slot": "<post time, Central>", "notes": "<anything to do at upload, e.g. turn on the AI-generated label>"}`
Use the brain's fixed hashtag set and posting rules.

Write the files, then answer with SUMMARY, the slug, and the shot table, so the Commander can approve it at a glance. End with one line exactly: `BRIEF READY: projects/<slug>/PRODUCTION.md`
