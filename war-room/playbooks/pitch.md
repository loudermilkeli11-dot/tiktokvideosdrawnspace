---
id: pitch
name: Pitch playbook
agent: scout
match: \b(pitch|pitches|ideas?|premises?|concepts?)\b
maxTurns: 45
---
# Playbook: pitch the next videos (the Commander's short order is enough; follow this method)

The Commander's order sets the details. **N** is the number of pitches they asked for (default 3), plus any topic, constraint or taste they gave; those override the defaults below.
The goal is the pitches the DATA says will perform best. That is not what the team likes most, and not what sounds clever.

1. **Ground truth (no web yet).** Use the Channel brain you were given: the Evidence, Lessons and the Commander's taste.
   - Open channel/results.csv and channel/references/ if you need a detail.
   - List the 3–5 strongest data signals you will optimise for. Each must cite a number or a file line.
2. **Research what works right now.** Use 6–12 searches, and fetch pages only when needed.
   - Find what-if, science and disaster short videos from the last ~60 days on TikTok, YouTube Shorts and Instagram Reels, with their numbers (views, likes, saves, shares) where visible.
   - Use TikTok/Google search suggestions and "people also search" phrasings as demand signals.
   - Check the patterns the hits share against the brain's niche section. Note anything new.
   - Keep the URL for every claim.
3. **Go wide.** Write 10–12 raw premises in the lane (natural or physics catastrophes with ONE true number, no politics, countries, weapons or real people).
   - Include at least 2 that come straight from the research.
   - Include 1 from a viewer comment or search suggestion if one exists.
   - Include 1 wildcard.
4. **Hard filters.** Drop any premise that:
   - is on the brain's Never list (our past premises and the niche's hits), or is a near-copy;
   - breaks the lane or TikTok policy;
   - has no checkable fact;
   - can't show visible chaos in the first 3 s.
5. **Score the survivors from 0 to 5 on each criterion.** Give one line of evidence per score. Mark it (speculative) when there is no data.
   | criterion | weight | what scores 5 |
   |---|---|---|
   | proven demand | 3 | comparable videos with big numbers or strong search suggestions (cite them) |
   | hook | 3 | a 5–8 word question with a number that a muted scroller gets on frame 1 |
   | chaos and escalation | 3 | the whole frame changes by 0:03, and each step is bigger and in a new place (Commander's taste) |
   | novelty | 2 | nobody in the niche has done it; we add a new angle |
   | honest physics | 2 | one law and one number from an authoritative source (NASA, a journal, a university) |
   | build cost | 2 | mostly existing sets and effects (see the brain's production facts) |
   | loop and ending | 1 | ends huge and cuts cleanly back to frame 1 |
   - Total = the weighted sum (max 80).
   - If the Commander's taste and the data disagree, score by the data and add one line saying so. Never silently drop the Commander's request.
6. **Write up the top N.** Use this exact format for each:
   - **#k · Title question** (sentence case, with one *accent* word) · score /80
   - **Cover line:** a verifiable fact with a number (all caps, ≤ 12 words).
   - **Frame 1:** what is on screen, the counter (label / number / fact line), and the first sound.
   - **Beats:** 5–7 steps with film times (30–38 s total). Each gives the location, what visibly happens and the counter value.
   - **The law:** the one rule and the number, with its source URL, and what must be tagged DRAMATIZATION.
   - **Why the data says it works:** 2–3 bullets with numbers and links (comparable videos, our own results).
   - **Risk:** the one thing most likely to make it flop, and the cheapest fix.
   - **Build:** which existing sets and effects it reuses, what is new, and a rough size (S/M/L).
   - Then a ranking table of all the survivors (premise, score, one-line reason), so the Commander can pick another.
7. **Save and hand off.**
   - Save everything from step 6 to pitches/YYYY-MM-DD-pitches.md (today's date, Central time; add -2, -3… if the file exists).
   - End your answer with exactly one line: `DELEGATE @analyst: Scroller review of pitches/<that file>. Rank the pitches by how a bored muted scroller reacts in the first 3 s, flag any policy or "seen it" risk, and give the one fix per pitch.`

Rules:
- VERIFIED / LIKELY / SPECULATIVE on every factual claim.
- Never promise virality.
- Don't ask the Commander clarifying questions. Pick sensible defaults and state them in one line at the top.
