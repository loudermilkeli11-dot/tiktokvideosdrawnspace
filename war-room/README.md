# War Room: Invisible Journeys mission control

A private dashboard that opens in your browser, or as its own app window, where a team of AI agents works the channel:

- **Mission Control**: type an order and it is auto-assigned to the right agent. Watch each agent work live, see the results, and let agents hand work to each other.
- **War Room**: put a hard call to the council. Officers answer independently, through their own lens. The **Marshal** turns their answers into a strategy and battle plan. The **Tenth Man** writes the pre-mortem: how that plan loses. You make the call, seal the dossier (saved to `channel/war-room/`) and send the battle plan to Mission Control as tasks.
- **Hive mind**: one shared log of everything every agent did. Every agent reads it before each task, so the team stays in sync.
- **Memory**: pinned standing orders that every agent reads, plus each agent's own `REMEMBER:` notes.
- **Approvals**: agents read and research freely. Anything that edits files outside their area, or runs a command, waits for your **Allow / Deny**.

The team, one Markdown file each in `agents/` (edit the prompt, tools or model, or add an agent by adding a file):

| Agent | Job |
|---|---|
| 🎬 **Producer** | The boss and router. Plans videos, splits the work, keeps the channel formula. Acts as Marshal in the War Room. |
| 🔭 **Scout** | Finds trends and ideas, and verifies the one real fact behind each pitch with sources. |
| ✍️ **Writer** | Writes the script and board: captions with timing, counter maths, shot list. |
| 🛠️ **Studio** | Drives the render engine in this repo: builds shots, renders, assembles, checks. |
| 📊 **Analyst** | Logs results (`channel/results.csv`), writes post-mortems, and reviews like the harshest scroller. Acts as Tenth Man in the War Room. |

## Install on Windows (about 5 minutes)

1. Get the code. Either:
   - On GitHub, open the repo, click **Code → Download ZIP** and extract it (for example to `Documents\tiktokvideosdrawnspace`).
   - Or, if you have Git, run this in a terminal:
     ```bash
     git clone https://github.com/loudermilkeli11-dot/tiktokvideosdrawnspace
     ```
2. Open the `war-room` folder and double-click **`War Room Setup.cmd`**. It:
   - installs Node.js and Git for Windows with `winget` if they're missing;
   - installs the dependencies;
   - installs **Claude Code** and asks you to sign in once with your Claude account. The agents then run through it, on your Claude plan (**PLAN** mode): no API key and no separate bill;
   - adds **auto-start at login**, so the server runs quietly in the background;
   - adds a **War Room** icon on the desktop and in the Start menu. The icon opens the War Room in **its own window**, with no tabs or address bar;
   - starts it and opens the window.
Day to day, click the **War Room** icon. Other controls:
- **Stop:** right-click `windows\stop.ps1`, then choose **Run with PowerShell**.
- **Remove the shortcuts and auto-start:** run `windows\uninstall.ps1` the same way.
- **Logs:** `war-room\data\run.log`, `server.out.log` and `server.err.log`.

The Windows scripts were written for Windows PowerShell 5.1 and later. They haven't been run on a real Windows machine yet, so if a step fails, send me the message it shows.

### Mac or Linux

From the `war-room` folder:
```bash
npm install && npm run demo
```
Open http://localhost:4747. For real agents, copy `.env.example` to `.env`, add your key, and run `npm start`.

## Teaching it (it gets better without code changes)

- **Vote on pitches:** 👍 / 👎 with a short reason. Every 5 votes, the Analyst turns them into rules in `channel/TASTE.md`.
- **Teach & settings → 🎓 Teach the War Room:** write a rule in plain words ("more planes, fewer oceans"). It applies to every agent immediately.
- **Results:** drop analytics screenshots in Intel. The Analyst updates the channel brain's lessons.
- **Every agent reads** the brain and the taste profile before every task, so the next pitches follow your votes and the numbers. You only need Claude Code (in the cloud) for new capabilities: new effects, new tabs, fixes.

## Short orders and playbooks

You don't need to write exact instructions. "pitch 3 ideas for the next tiktok" or "review the latest stats" is enough:
- **Playbooks** (`playbooks/*.md`) hold the full method for common jobs.
  - **Pitch** (Scout): reads the data, researches what is working right now, writes 10–12 premises, filters them against the Never list and the lane, and scores them on a data-weighted rubric. It saves the top pitches to `pitches/`, then hands them to the Analyst for a cold-scroller review.
  - **Stats** (Analyst): compares like with like, finds the ONE bottleneck, and updates the brain.
- Your own words in the order (a topic, a constraint, a taste) override the defaults.
- Edit a playbook file to change a method, or add a file for a new one.

## Whole-team orders (👥 Team)

Switch on **👥 Team** next to Dispatch to send one prompt to the whole War Room. The Producer (Opus) plans the smallest set of tasks. `NOW` tasks run in parallel, then `THEN` tasks run with those results, and the Producer writes ONE combined answer. Each step is a normal task, so playbooks apply (for example, the Scout's pitch method). A simple question gets answered directly, with no fan-out.

## Studio: from an idea to the finished film

The **Studio** tab runs the whole production. Nothing gets built without your approval.
1. **Greenlight.** Use 🎬 on a pitch result (#1, #2 or #3), 🎬 on a sealed council, or type an idea in the Studio tab. Pick the quality (Max by default) and the builder (Opus by default).
2. **Brief.** The Producer writes `projects/<slug>/PRODUCTION.md`, the complete build order: the law and its numbers, the shot board, the build map, sound, look, render and posting.
3. **Your approval.** Read the brief, add notes if you want, then **Approve & build**, or **Reject**. **📋 Copy as prompt** copies the brief so any Claude session can build it instead.
4. **Build.** The Director (a sixth agent) builds the project in the engine, shot by shot. It checks each shot's frames on your GPU, and commits as it goes.
5. **GPU render.** `tools/render_all.js` renders every shot on your graphics card, then the sound, music and captions, assembles the film at −14 LUFS and runs the QC (`check.py`). If QC fails, the report goes back to the Director for one fix round, then it renders again.
6. **Film.** The video plays right in the tab.

**ETA:** each production shows when it should be ready, in your local time. It is based on its shot and frame count, the builder model and the render quality. The estimates learn from every real run (`data/calib.json`), and during the render it is computed from the live progress.

After step 6: You can **Show in folder** (`projects/<slug>/out/final.mp4`) or **Render again**.

**Parallel build** (8 shots or more): the Director writes the law, the shared kit and a split into 3 groups with the handshake at every cut (`BUILDERS.md`). Then 3 **Builders** build their shots at the same time, on the same model as the Director. Finally the Director integrates them, does a consistency pass across every cut, and writes the captions and score. A QC fix round always runs on the single Director.

**Editing a finished video:** open it in Studio, write the change in **✏️ Edit this video** (for example "make the ending at night" or "caption 3 should say …"), then **Apply edit**. Only the Director works on it, changes only what is needed, and only the changed shots re-render. Every finished render is kept as a version (v1, v2…) that you can play and restore. Videos made before the Studio (gravity-flip, moon-2x) can be added with **＋ project** under Productions. From the phone: `/edit <change>` edits the latest finished video.

Quality: **max** uses 16 anti-aliasing and motion-blur sub-samples per frame and a higher-bitrate final; **standard** uses each shot's own setting; **draft** is a quick half-size look.
A full build is the expensive step on your plan (the Director on Opus works for a long time). Rendering is free. One render runs at a time.

## Phone alerts (Telegram)

The War Room can message your phone through your own free Telegram bot. Set it up in **Memory → 📱 Phone alerts**: create a bot with @BotFather, paste its token, then scan the QR code and tap **Start**.
- **What it sends:** briefs waiting for approval, with **Approve / Reject** buttons; finished videos; failures and blocks, with **Resume**; usage pauses, with **Resume anyway**; and sign-in problems. Tick "every finished task" if you want everything.
- **Ready to post:** when a video finishes, the bot sends the video itself (`out/tiktok.mp4`, an upload copy under 45 MB, since bots can send 50 MB), then the caption and hashtags as one message you can long-press and copy, then the cover text and the posting checklist (AI-generated label, slot). The words come from `projects/<slug>/POST.json`, which the Producer writes with the brief. The Studio tab shows the same text with Copy buttons, plus **📱 Send to phone** to send it again.
- **The look:** each alert is a branded card, with a banner image for the kind of alert, a bold title, the stage tracker (✅ Brief ✅ Approval ▶️ Build …) and buttons.
- **Windows notifications:** the same alerts pop up on this PC as native Windows notifications, with the banner and **Approve / Reject / Resume / Open War Room** buttons. Approvals stay on screen until you act. You can turn them off in Memory → Phone alerts. The 📱 in the top bar is lit when phone alerts are connected.
- **Commands:** `/status` (who is working, productions and their ETAs, usage), `/approve`, `/reject`, `/resume`.
- **Who it obeys:** only your linked chat. The token stays on this PC (`war-room/data/notify.json`). It works from anywhere, because the War Room only makes outgoing connections to Telegram.

## Usage and safety

- **PLAN mode (default):** the agents run through Claude Code on this PC, signed in with your Claude account, so their work counts against your Claude plan's usage limits. There is no separate bill. (API mode is still there: put a key in `.env` and agents bill that key instead.)
- **Efficient by design:**
  - Each agent has its own model. The Producer (also the Marshal) uses Opus; the Scout, Writer, Studio and Analyst use Sonnet. Tick **Deep** on an order to run that one task on Opus.
  - Orders are routed by keywords for free. Only an unclear order goes to a quick Haiku router.
  - Agents share **6 slots**: Haiku counts 0.5, Sonnet 1 and Opus 2. So five Sonnet agents can work at once, or Opus plus three or four others. Councils run their officers in parallel too.
  - Agents run without MCP servers, and council seats without Claude Code's long coding instructions, so every call stays small.
- **Usage cap: 80% of your plan's 5-hour window.** Claude Code reports your real plan usage on every agent run, and the top bar shows it (with a marker at the cap). At 80%, new work waits, and running agents pause and re-queue (their saved files stay). Everything resumes on its own after the 5-hour window resets. **Resume** overrides it. Change the cap with `WARROOM_PLAN_CAP` in `.env`.
- **Permissions in PLAN mode:** agents read freely. They write only in their own folders (the Writer and Studio under `projects/`, the Analyst under `channel/`). The Studio runs only the studio's own commands (`node tools/...`, `python tools/...`, the PC render script, `git status/diff/log`). Anything else is refused, and the agent ends with a `NEEDS APPROVAL:` line so you can decide. (Live Allow/Deny pop-ups exist only in API mode.)
- The server only listens on your own computer (`127.0.0.1`). To reach it from your phone, set `WARROOM_TOKEN` to a long random string, set `WARROOM_HOST=0.0.0.0`, and open `http://<computer-ip>:4747/?token=<token>` once. Only do this on a network you trust, or put it behind a tunnel that requires login.
- Agents work inside the studio repo (`WARROOM_WORKSPACE`, default `..`). The Writer and Studio may write under `projects/`, and the Analyst under `channel/`, without asking. Everything else that changes something waits for your approval.
- On Windows, the Studio's commands run through Git Bash. Rendering needs Python and ffmpeg too: `pc/Render PC Setup.cmd` installs them.
- The Agent SDK requires an Anthropic API key. Anthropic doesn't allow apps like this one to run on a claude.ai subscription login.

## How the agents talk to each other

Every agent ends its answer with a `SUMMARY:` line, which goes to the hive mind. It can also write:
- `DELEGATE @writer: <task>` to queue a task for a teammate (chains stop after 2 hops so they can't loop);
- `REMEMBER: <fact>` to save a lesson to its own memory (`data/memory/<agent>.md`).

## Files

```
server.js          the server: task queue, routing, approvals, War Room, live updates
lib/runner.js      runs one agent through the Claude Agent SDK (plus the demo simulator)
lib/agents.js      loads agents/*.md
lib/store.js       saves tasks, the hive mind and memory in data/ (git-ignored)
agents/*.md        the team: one file per agent
public/            the dashboard (plain HTML/CSS/JS, no build step)
windows/           Windows setup, auto-start, open/stop/uninstall scripts
War Room Setup.cmd double-click installer for Windows
```

## Next layers (not built yet)

- **Voice**: talk to the council live. This could be push-to-talk using the browser's built-in speech, or Gemini Live through Pipecat, which needs a key.
- **Phone**: a Telegram bot that forwards orders and approvals.
- **Scheduled runs**: for example, the Scout pitches every Monday at 08:00.
