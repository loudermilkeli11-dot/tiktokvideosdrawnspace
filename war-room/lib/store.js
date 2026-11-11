// Tiny JSON-file persistence: tasks, the hive mind log, memories, war-room sessions. Lives in war-room/data/.
import fs from 'node:fs';
import path from 'node:path';

export class Store {
  constructor(dir) {
    this.dir = dir;
    fs.mkdirSync(path.join(dir, 'memory'), { recursive: true });
    this.tasks = this._read('tasks.json', []);
    this.warrooms = this._read('warrooms.json', []);
    this.hive = fs.existsSync(this._p('hive.jsonl'))
      ? fs.readFileSync(this._p('hive.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
      : [];
    // tasks that were running when the server stopped can't resume: mark them
    for (const t of this.tasks) if (t.status === 'running' || t.status === 'queued') { t.status = 'stopped'; t.log.push({ t: Date.now(), kind: 'info', text: 'Server restarted while this task was pending.' }); }
    this._timer = null;
  }
  _p(f) { return path.join(this.dir, f); }
  _read(f, d) { try { return JSON.parse(fs.readFileSync(this._p(f), 'utf8')); } catch { return d; } }
  save() { // debounced
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      fs.writeFileSync(this._p('tasks.json'), JSON.stringify(this.tasks.slice(-500), null, 1));
      fs.writeFileSync(this._p('warrooms.json'), JSON.stringify(this.warrooms.slice(-100), null, 1));
    }, 300);
  }
  addHive(entry) {
    const e = { t: Date.now(), ...entry };
    this.hive.push(e);
    fs.appendFileSync(this._p('hive.jsonl'), JSON.stringify(e) + '\n');
    return e;
  }
  recentHive(n = 15) { return this.hive.slice(-n).reverse(); }
  pinned() { try { return fs.readFileSync(this._p('memory/pinned.md'), 'utf8'); } catch { return ''; } }
  setPinned(text) { fs.writeFileSync(this._p('memory/pinned.md'), text); }
  agentMemory(id) { try { return fs.readFileSync(this._p(`memory/${id}.md`), 'utf8'); } catch { return ''; } }
  remember(id, fact) {
    const line = `- ${new Date().toISOString().slice(0, 10)} ${fact.trim()}\n`;
    fs.appendFileSync(this._p(`memory/${id}.md`), line);
    // keep each agent's memory short: newest 60 lines
    const lines = this.agentMemory(id).split('\n').filter(Boolean);
    if (lines.length > 60) fs.writeFileSync(this._p(`memory/${id}.md`), lines.slice(-60).join('\n') + '\n');
  }
}
