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

## Usage and safety

- **PLAN mode (default):** the agents run through Claude Code on this PC, signed in with your Claude account, so their work counts against your Claude plan's usage limits. There is no separate bill. (API mode is still there: put a key in `.env` and agents bill that key instead.)
- **Efficient by design:**
  - Each agent has its own model. The Producer (also the Marshal) uses Opus; the Scout, Writer, Studio and Analyst use Sonnet. Tick **Deep** on an order to run that one task on Opus.
  - Orders are routed by keywords for free. Only an unclear order goes to a quick Haiku router.
  - Agents share **6 slots**: Haiku counts 0.5, Sonnet 1 and Opus 2. So five Sonnet agents can work at once, or Opus plus three or four others. Councils run their officers in parallel too.
  - Agents run without MCP servers, and council seats without Claude Code's long coding instructions, so every call stays small.
- **Usage governor:** the top bar shows the last 5 hours of usage (in API-equivalent dollars) and the slots in use. New work pauses at the soft cap (`WARROOM_WINDOW_USD`, default $25), and running work finishes. If Claude says your plan's limit is reached, the War Room pauses and resumes by itself when the limit resets.
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
