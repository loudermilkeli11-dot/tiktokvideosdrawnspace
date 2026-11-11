# War Room: Invisible Journeys mission control

A private dashboard that opens in your browser, or as its own app window, where a team of AI agents works the channel:

- **Mission Control**: type an order and it is auto-assigned to the right agent. Watch each agent work live, see the results, and let agents hand work to each other.
- **War Room**: put a hard call to the council. Officers answer independently, through their own lens. The **Marshal** turns their answers into a strategy and battle plan. The **Tenth Man** writes the pre-mortem: how that plan loses. You make the call, seal the dossier (saved to `channel/war-room/`) and send the battle plan to Mission Control as tasks.
- **Hive mind**: one shared log of everything every agent did. Every agent reads it before each task, so the team stays in sync.
- **Memory**: pinned standing orders that every agent reads, plus each agent's own `REMEMBER:` notes.
- **Approvals**: agents read and research freely. Anything that edits files outside their area, or runs a command, waits for your **Allow / Deny**.

The team is 🎬 Producer, 🔭 Scout, ✍️ Writer, 🧪 Fact Officer, 👁️ Scroller (critic) and 🛠️ Engineer. Each agent is one Markdown file in `agents/`: edit the prompt, tools or model, or add a new agent by adding a file.

## Run it on your computer (5 minutes)

1. Install **Node.js 20 or newer** from https://nodejs.org.
2. Get the code and install it:
   ```bash
   git clone https://github.com/loudermilkeli11-dot/tiktokvideosdrawnspace
   ```
   ```bash
   cd tiktokvideosdrawnspace/warroom && npm install
   ```
3. Try it free in **demo mode**, with simulated agents and no key needed:
   ```bash
   npm run demo
   ```
   Open http://localhost:4747.
4. For **real agents**, create an API key at https://console.anthropic.com/settings/keys. Copy `.env.example` to `.env` and paste the key after `ANTHROPIC_API_KEY=`. Then run:
   ```bash
   npm start
   ```
   The badge at the top right switches from DEMO to LIVE.

**Make it its own window.** In Chrome or Edge, open the menu, then **Cast, save and share → Install page as app** (Edge: **Apps → Install this site as an app**). It then opens in its own window with its own Dock or taskbar icon.

## Costs and safety

- Real agents bill your Anthropic API account. Every task and council shows its cost, and the top bar shows the total.
- Each task stops at `WARROOM_TASK_BUDGET_USD` (default $3). At most `WARROOM_MAX_PARALLEL` agents (default 3) run at once.
- Agents default to `claude-opus-5-5`. To use a cheaper model, change `model:` in an agent's `.md` file (for example `claude-sonnet-5-5`).
- The server only listens on your own computer (`127.0.0.1`). To reach it from your phone, set `WARROOM_TOKEN` to a long random string, set `WARROOM_HOST=0.0.0.0`, and open `http://<computer-ip>:4747/?token=<token>` once. Only do this on a network you trust, or put it behind a tunnel that requires login.
- Agents work inside the studio repo (`WARROOM_WORKSPACE`, default `..`). The Writer and Engineer may write under `projects/` without asking. Everything else that changes something waits for your approval.
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
```

## Next layers (not built yet)

- **Voice**: talk to the council live. This needs a speech service: Gemini Live or OpenAI Realtime, through Pipecat.
- **Phone**: a Telegram bot that forwards orders and approvals.
- **Always on**: start it at login (macOS `launchd`, Windows Task Scheduler), so the War Room is up whenever your computer is.
- **Scheduled runs**: for example, the Scout pitches every Monday at 08:00.
