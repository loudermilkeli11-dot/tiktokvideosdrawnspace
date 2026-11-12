---
id: pitch
name: Pitch playbook
agent: scout
match: \b(pitch|pitches|ideas?|premises?|concepts?)\b
maxTurns: 40
---
# Playbook: pitch the next videos (the Commander's short order is enough; follow this method)

The Commander's order sets the details. **N** is the number of pitches they asked for (default 3), plus any topic, constraint or taste they gave; those override the defaults below.
The goal is the pitches that the DATA and the Commander's TASTE PROFILE say will perform best. That is not what sounds clever.

**Usage discipline:** this playbook runs often. Be efficient: no padding, no repeated searches, no reading files you don't need.

1. **Taste first.** Read the Taste profile you were given: the Commander's rules, what they 👍 and 👎, and why.
   - Never pitch anything close to a 👎 pitch, or anything that breaks a rule.
   - Lean toward the patterns of 👍 pitches and greenlit ideas.
2. **Ground truth.** Use the Channel brain you were given: Evidence, Lessons, the Never list and what is cheap to build.
3. **Research, cached per day.**
   - If `channel/research/<today>.md` exists, read it and reuse it, and do at most 2 new searches for this order's theme.
   - Otherwise do 4–8 focused searches: trending what-if, science and disaster shorts in the last ~60 days and their numbers, plus search-suggestion phrasings. Save the findings with URLs to `channel/research/<today>.md` (≤ 400 words) so later orders reuse them.
4. **Go wide in your head, write little.** Consider 8–12 premises internally and drop the weak ones. Write up ONLY the top N.
   Hard filters:
   - in the lane (natural or physics catastrophes, ONE true number; no politics, weapons or real people);
   - not on the Never list;
   - visible chaos by 0:03;
   - buildable (prefer existing sets).
5. **Score each survivor 0–80.** Weights:
   - demand ×3;
   - hook ×3;
   - chaos and escalation ×3;
   - novelty ×2;
   - honest physics ×2;
   - build cost ×2;
   - loop ×1.
   Add **taste fit**: −20 if it resembles a 👎, +5 if it matches a 👍 pattern.
   Give one short evidence line per pitch, and mark guesses (speculative).
6. **Save the pitches as JSON** (the War Room shows them as cards). Write `pitches/<today>.json`; if the file exists, use `<today>-2.json`, `-3`… Exact shape:
```json
{ "created": "<ISO time>", "order": "<the Commander's order>", "theme": "<theme or ''>",
  "pitches": [ { "id": "p1", "title": "What if the air *vanished* for 5 seconds?", "cover": "WITHOUT AIR FOR 5 SECONDS YOUR EARDRUMS WOULD BURST",
    "score": 67, "scores": { "demand": 4, "hook": 5, "chaos": 5, "novelty": 3, "physics": 4, "cost": 3, "loop": 4, "taste": 5 },
    "frame1": "<what is on screen at 0:00 and the counter>", "beats": [ { "t": "0:03", "where": "city plaza", "what": "<what visibly happens>", "counter": "<label · value>" } ],
    "law": "<the one rule and the number>", "source": "<URL>", "dramatization": "<the one liberty>",
    "why": [ "<data point with number or link>" ], "risk": "<the one flop risk + cheapest fix>",
    "build": { "size": "S|M|L", "reuse": [ "city.js plaza", "clouds.js" ], "new": [ "<new effect>" ] } } ] }
```
   5–7 beats per pitch, 30–38 s in total. The title uses *one accent word*. The cover is a verifiable fact with a number.
7. **Answer briefly:** SUMMARY, then one line per pitch (title · score), then the file path. Do NOT delegate a review; the Commander rates the pitches in the War Room.

Rules:
- Never promise virality.
- Don't ask the Commander questions. Pick defaults and state them in one line.
