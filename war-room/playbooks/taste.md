---
id: taste
name: Taste update
agent: analyst
match: (?!x)x
maxTurns: 8
---
# Playbook: update the taste profile from the Commander's votes

Read channel/TASTE.md, especially the "Recent votes" section, which holds the pitches the Commander rated 👍 / 👎 and their reasons. Read channel/feedback.jsonl too if you need more history.

Rewrite ONLY the section `## Learned from votes` in channel/TASTE.md. Use 4–10 short, concrete rules that predict what the Commander will like. Name the pattern, not the single idea.
- Good: "Likes: escalation across several places (city → sky → orbit); dislikes: single-location ideas."
- Bad: "Liked the gravity pitch."

Keep any rule that new votes still support, and drop rules the votes now contradict. Don't touch the other sections. Keep the whole section under 200 words. Answer with SUMMARY and the new rules.
