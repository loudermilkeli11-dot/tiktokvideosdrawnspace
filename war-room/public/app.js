// War Room dashboard: vanilla JS, live via Server-Sent Events.
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const S = { agents: [], tasks: [], hive: [], approvals: [], warrooms: [], productions: [], open: null, wrOpen: null, prOpen: null, demo: false };
const A = (id) => S.agents.find((a) => a.id === id) || { name: id || 'Commander', emoji: '🎖️', color: '#ffb347' };
const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 60 ? `${s | 0}s` : s < 3600 ? `${(s / 60) | 0}m` : s < 86400 ? `${(s / 3600) | 0}h` : `${(s / 86400) | 0}d`; };
const hhmm = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '');
const api = (p, b) => fetch(p, b === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());

// tiny markdown: headings, bold, code, links, lists, protocol keywords
function md(src) {
  const lines = esc(src || '').split('\n'); let out = '', list = null;
  const inline = (s) => s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(https?:\/\/[^\s)<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/^(SUMMARY|POSITION|WHY|RISK|STRATEGY|BATTLE PLAN|CONSENSUS|OBVIOUS|PRE-MORTEM[^:]*|PREDICTABILITY|DELEGATE|REMEMBER|VERIFIED|LIKELY|SPECULATIVE|ALL CLEAR):/, '<span class="kw">$1:</span>');
  let tbl = null;
  const flushT = () => { if (!tbl) return ''; const [hd, ...rows] = tbl.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r)); tbl = null;
    const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
    return `<table><tr>${cells(hd).map((c) => `<th>${c}</th>`).join('')}</tr>${rows.map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`; };
  for (const l of lines) {
    if (/^\s*\|/.test(l)) { if (list) { out += `</${list}>`; list = null; } (tbl ||= []).push(l); continue; }
    out += flushT();
    const h = l.match(/^(#{1,4})\s+(.*)/), li = l.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)/);
    if (li) { const tag = /^\s*\d/.test(l) ? 'ol' : 'ul'; if (list !== tag) { if (list) out += `</${list}>`; out += `<${tag}>`; list = tag; } out += `<li>${inline(li[1])}</li>`; continue; }
    if (list) { out += `</${list}>`; list = null; }
    if (h) out += `<h4>${inline(h[2])}</h4>`; else if (l.trim()) out += `<p>${inline(l)}</p>`;
  }
  out += flushT();
  return out + (list ? `</${list}>` : '');
}

// ---------------- render: roster ----------------
function renderRoster() {
  for (const a of S.agents) { const mine = S.tasks.filter((t) => t.agent === a.id); a.done = mine.filter((t) => t.status === 'done').length; a.cost = mine.reduce((s, t) => s + (t.cost || 0), 0); }
  const picked = $('#cmdAgent').value;
  $('#roster').innerHTML = S.agents.map((a) => `
    <div class="agent ${a.status} ${picked === a.id ? 'picked' : ''}" style="--c:${a.color}" data-agent="${a.id}" title="Click to give ${esc(a.name)} the next order">
      <div class="orb">${a.emoji}</div>
      <div class="hd"><span class="nm">${esc(a.name)}</span><span class="st">${a.status === 'working' ? '● working' : a.status === 'waiting' ? '◐ waiting' : 'idle'}</span></div>
      <div class="role">${esc(a.role)}</div>
      <div class="stats"><span>✔ ${a.done}</span><span>$${(a.cost || 0).toFixed(2)}</span><span class="mdl">${esc(a.model.replace('claude-', '').replace(/-\d.*$/, ''))}</span></div>
      <div class="last">${esc(a.last || 'Standing by')}</div>
    </div>`).join('');
  const nw = S.agents.filter((a) => a.status === 'working').length; $('#nWorking').textContent = nw ? `${nw} active` : '';
  const sel = $('#cmdAgent'); const v = sel.value;
  sel.innerHTML = '<option value="">⚡ Auto-assign</option>' + S.agents.map((a) => `<option value="${a.id}">${a.emoji} ${esc(a.name)}</option>`).join(''); sel.value = v;
  $('#spend').textContent = '$' + (S.tasks.reduce((s, t) => s + (t.cost || 0), 0) + S.warrooms.reduce((s, w) => s + (w.cost || 0), 0)).toFixed(2);
}
// ---------------- render: board ----------------
function taskCard(t) {
  const a = A(t.agent);
  const dur = t.started ? ((t.finished || Date.now()) - t.started) / 1000 : 0;
  const live = ['queued', 'routing', 'running', 'team'].includes(t.status);
  return `<div class="task ${t.status}" style="--c:${a.color}" data-task="${t.id}">${live ? `<button class="cx" data-stop="${t.id}" data-running="${t.status === 'running' ? 1 : ''}" title="${t.status === 'running' ? 'Stop this task' : 'Cancel this task'}">✕</button>` : ''}
    <div class="t">${a.emoji} ${esc(t.title)}</div>
    ${t.summary ? `<div class="s">${esc(t.summary)}</div>` : t.routeReason ? `<div class="s">→ ${esc(a.name)} · ${esc(t.routeReason)}</div>` : ''}
    ${t.status === 'queued' ? `<div class="why">⏳ ${esc(waitWhy(t))}</div>` : ''}${t.kind === 'team' ? `<div class="why team">👥 ${t.status === 'team' ? (t.plan ? `team at work: ${S.tasks.filter((c) => c.parent === t.id && c.status === 'done').length}/${t.plan.length} done` : 'Producer is planning…') : 'whole-team order'}</div>` : ''}
    <div class="f"><span class="pill">${t.status}</span>${t.deep ? '<span class="pill deep">deep</span>' : ''}${t.playbook ? `<span class="pill pb" title="Runs the ${esc(t.playbook)} playbook (war-room/playbooks/${esc(t.playbook)}.md)">📋 ${esc(t.playbook)}</span>` : ''}${t.by && t.by !== 'Commander' ? `<span>from ${A(t.by).emoji}</span>` : ''}${t.status === 'running' ? `<span data-start="${t.started}">${fmtDur(dur)}</span>` : dur ? `<span>${fmtDur(dur)}</span>` : ''}${t.cost ? `<span>$${t.cost.toFixed(2)}</span>` : ''}<span>${ago(t.created)} ago</span></div>
  </div>`;
}
function waitWhy(t) {
  const u = S.usage || {}, a = A(t.agent);
  if (u.paused === 'limit') return 'Paused: Claude reported a usage limit. Click Resume in the top bar to retry now.';
  if (u.paused === 'cap') return `Paused: the 5-hour soft cap ($${u.cap}) was reached.`;
  if (a.status && a.status !== 'idle') return `Waiting for ${a.name} to finish its current task (one task per agent).`;
  const w = /opus/.test(t.model || a.model || '') ? 2 : /haiku/.test(t.model || a.model || '') ? 0.5 : 1;
  if (u.slots && u.used + w > u.slots) return `Waiting for a free slot (${u.used}/${u.slots} in use).`;
  return 'Starting…';
}
const fmtDur = (d) => (d < 60 ? (d | 0) + 's' : `${(d / 60) | 0}m ${String((d % 60) | 0).padStart(2, '0')}s`);
function renderBoard() {
  const T = [...S.tasks].reverse();
  const q = T.filter((t) => t.status === 'queued' || t.status === 'routing'), r = T.filter((t) => t.status === 'running' || t.status === 'team'), d = T.filter((t) => ['done', 'failed', 'stopped'].includes(t.status)).slice(0, 40);
  $('#colQ').innerHTML = q.map(taskCard).join('') || '<div class="empty">Nothing queued.<br>Type an order above, or tap a quick order.</div>';
  $('#colR').innerHTML = r.map(taskCard).join('') || '<div class="empty">All agents standing by.</div>';
  $('#colD').innerHTML = d.map(taskCard).join('') || '<div class="empty">Finished work lands here.</div>';
  $('#nQ').textContent = q.length || ''; $('#nR').textContent = r.length || ''; $('#nD').textContent = d.length || '';
}
// ---------------- render: approvals + hive ----------------
function renderApprovals() {
  $('#nA').textContent = S.approvals.length || '';
  $('#apPanel').classList.toggle('hot', S.approvals.length > 0);
  $('#approvals').innerHTML = S.approvals.map((ap) => { const a = A(ap.agent); return `<div class="ap">
      <div class="w">${a.emoji} <b>${esc(a.name)}</b> wants to use <b>${esc(ap.tool)}</b> · ${esc(ap.taskTitle || '')}</div>
      <pre>${esc(ap.summary)}</pre>
      <div class="b"><button class="ok" data-ap="${ap.id}" data-allow="1">Allow</button><button class="no" data-ap="${ap.id}" data-allow="0">Deny</button></div></div>`; }).join('')
    || `<p class="muted small">${S.mode === 'plan' ? 'Agents work inside their own folders. Anything else comes back as a NEEDS APPROVAL line in their result.' : 'Nothing waiting. Agents ask here before they edit outside their area or run commands.'}</p>`;
}
const hiveRow = (e) => { const a = e.agent ? A(e.agent) : { emoji: '🎖️', name: 'Commander', color: '#ffb347' }; return `<div class="ev k-${e.kind}" style="--c:${a.color || '#7f8ba0'}"><span class="tm">${hhmm(e.t)}</span><span class="dot"></span><span class="tx"><span class="who">${a.emoji} ${esc(a.name)}</span>${esc(e.text)}</span></div>`; };
function renderHive() { $('#hiveMini').innerHTML = S.hive.slice(0, 60).map(hiveRow).join('') || '<p class="muted small">Quiet so far.</p>'; $('#hiveFull').innerHTML = S.hive.map(hiveRow).join(''); }

// ---------------- task drawer ----------------
async function openTask(id) {
  const t = await api('/api/tasks/' + id); S.open = id; const a = A(t.agent);
  $('#drawerBody').innerHTML = `
    <h3>${a.emoji} ${esc(a.name)} · <span id="dStatus">${t.status}</span></h3>
    <h2 style="margin:0 0 8px;font-size:18px">${esc(t.title)}</h2>
    <p class="muted small">${t.by !== 'Commander' ? `Delegated by ${A(t.by).emoji} ${esc(A(t.by).name)} · ` : ''}${esc(t.routeReason || '')}${t.cost ? ` · $${t.cost.toFixed(3)}` : ''}${t.turns ? ` · ${t.turns} turns` : ''}</p>
    <details ${t.text.length < 300 ? 'open' : ''}><summary class="muted small">Order</summary><div class="md">${md(t.text)}</div></details>
    <h3 style="margin-top:14px">Live log</h3><div class="log" id="dLog">${t.log.map(logRow).join('')}</div>
    <div class="cmdrow">${t.status === 'running' || t.status === 'queued' ? `<button class="no" data-stop="${t.id}">Stop</button>` : `<button class="ghost" data-retry="${t.id}">Run again</button>`}</div>
    ${t.status === 'done' && t.playbook === 'pitch' ? `<div class="glRow"><span class="muted small">Greenlight a pitch:</span>${[1, 2, 3].map((k) => `<button class="ghost" data-gl="${esc(`Pitch #${k} from ${(t.result.match(/pitches\/[\w.-]+\.md/) || ['the latest pitches file in pitches/'])[0]}`)}">🎬 #${k}</button>`).join('')}</div>` : ''}
    ${t.result ? `<h3 style="margin-top:14px">Result</h3><div class="md">${md(t.result)}</div>` : ''}`;
  $('#drawer').classList.add('on'); const L = $('#dLog'); L.scrollTop = L.scrollHeight;
}
const logRow = (e) => `<div class="${e.kind}">${hhmm(e.t)} ${e.kind === 'tool' ? '⚙ ' : e.kind === 'error' ? '✖ ' : ''}${esc(e.text)}</div>`;

// ---------------- war room ----------------
function renderWrForm() {
  const box = $('#wrOfficers'); if (box.dataset.ready) return; box.dataset.ready = 1;
  box.innerHTML = S.agents.filter((a) => a.id !== 'producer').map((a) => `<span class="chip on" style="--c:${a.color}" data-off="${a.id}">${a.emoji} ${esc(a.name)}</span>`).join('');
}
function renderWrList() {
  $('#wrList').innerHTML = [...S.warrooms].reverse().map((w) => `<div class="wrItem ${w.id === S.wrOpen ? 'on' : ''}" data-wr="${w.id}"><b>${esc(w.stage)}</b> · ${esc(w.question.slice(0, 70))}<div class="muted small">${ago(w.created)} ago${w.cost ? ' · $' + w.cost.toFixed(2) : ''}</div></div>`).join('') || '<p class="muted small">None yet.</p>';
}
const STAGE = { convening: 'OFFICERS DELIBERATING', synthesis: 'MARSHAL SYNTHESIZING', dissent: 'TENTH MAN ATTACKING', awaiting: 'AWAITING YOUR CALL', sealed: 'SEALED', stopped: 'STOPPED', failed: 'FAILED' };
function renderWr() {
  const w = S.warrooms.find((x) => x.id === S.wrOpen); const st = $('#wrStage');
  if (!w) { st.className = 'wrStage empty'; st.innerHTML = '<p>⚔️<br>No council in session.<br><span class="small">Put a hard call to the council above.</span></p>'; return; }
  st.className = 'wrStage';
  const n = w.seats.length;
  const seats = w.seats.map((s, i) => { const a = A(s.agent); const ang = -Math.PI / 2 + (i / n) * Math.PI * 2; const x = 50 + Math.cos(ang) * 41, y = 50 + Math.sin(ang) * 41;
    const label = s.role === 'marshal' ? 'Marshal' : s.role === 'tenth' ? 'Tenth Man' : 'Officer';
    return `<div class="seat ${s.status} ${s.role}" style="left:${x}%;top:${y}%;--c:${s.role === 'tenth' ? '#ff6b6b' : s.role === 'marshal' ? '#ffb347' : a.color}"><div class="av">${s.role === 'tenth' ? '🗡️' : s.role === 'marshal' ? '⚖️' : a.emoji}</div><div class="lb">${s.role === 'tenth' ? 'Tenth Man' : esc(a.name)}</div><div class="rl">${s.role === 'tenth' ? 'dissent' : label}</div></div>`; }).join('');
  const cards = w.seats.map((s) => { const a = A(s.agent); const label = s.role === 'marshal' ? 'Marshal · strategy' : s.role === 'tenth' ? 'Tenth Man · how we lose' : 'Officer';
    return `<div class="card ${s.role}" style="--c:${a.color}"><div class="hd"><span>${s.role === 'tenth' ? '🗡️' : s.role === 'marshal' ? '⚖️' : a.emoji}</span><b>${s.role === 'tenth' ? 'Tenth Man' : esc(a.name)}</b><span class="rl">${label}</span></div>
      ${s.role === 'officer' ? `<div class="muted small" style="margin-bottom:6px"><i>${esc(a.lens)}</i></div>` : ''}
      ${s.notes && s.status === 'speaking' ? `<div class="notes">⚙ ${esc(s.notes)}</div>` : ''}
      ${s.text ? `<div class="md">${md(s.text)}</div>` : `<div class="muted small ${s.status === 'speaking' ? 'typing' : ''}">${s.status === 'speaking' ? 'thinking ' : 'waiting'}</div>`}</div>`; });
  const marshalCard = cards.splice(n - 2, 1)[0], tenthCard = cards.pop();
  const verdict = w.stage === 'awaiting' ? `<div class="verdict"><h3>Commander's call</h3>
      <input id="verdictTxt" data-wrdraft="${w.id}" value="${esc((S.drafts || {})[w.id] || '')}" placeholder="Your decision (e.g. “Go with the Marshal's plan, and fix the Tenth Man's failure mode first”)">
      <div class="cmdrow"><button class="ghost" data-wrplan="${w.id}" ${w.planSent ? 'disabled' : ''}>${w.planSent ? 'Battle plan sent ✓' : 'Send battle plan to Mission Control'}</button><button class="primary" data-wrseal="${w.id}">Seal dossier</button></div></div>`
    : w.stage === 'sealed' ? `<div class="verdict"><h3>Sealed</h3><button class="primary" style="float:right" data-gl="${esc(`The sealed War Room decision in ${w.dossier || 'channel/war-room/'}: ${w.question}. Commander's call: ${w.verdict}`)}">🎬 Greenlight</button><p>${esc(w.verdict)}</p><p class="muted small">Dossier saved to <code>${esc(w.dossier || '')}</code></p>${w.planSent ? '' : `<button class="ghost" data-wrplan="${w.id}">Send battle plan to Mission Control</button>`}</div>`
    : w.stage === 'failed' ? `<div class="verdict" style="border-color:rgba(255,93,108,.6)"><h3>Council failed</h3><p>${esc(w.error || 'An officer could not answer.')}</p></div>`
    : ['convening', 'synthesis', 'dissent'].includes(w.stage) ? `<div class="cmdrow"><button class="no" data-wrstop="${w.id}">Stop council</button></div>` : '';
  const order = ['convening', 'synthesis', 'dissent', 'awaiting', 'sealed'], k = order.indexOf(w.stage);
  const steps = ['Officers deliberate', 'Marshal plans', 'Tenth Man attacks', 'Your call'].map((l, i) => `<div class="${k > i || w.stage === 'sealed' ? 'done' : k === i ? 'now' : ''}">${i + 1} · ${l}</div>`).join('');
  st.innerHTML = `<div class="stepper">${steps}</div><div><div class="table ${['convening', 'synthesis', 'dissent'].includes(w.stage) ? '' : 'idle'}"><div class="ring2"></div><div class="ring"></div><div class="sweep"></div><div class="core">${STAGE[w.stage] || w.stage}<small>${esc(w.question.slice(0, 120))}</small></div>${seats}</div></div>
    <div class="transcript">${verdict}${marshalCard}${tenthCard}${cards.join('')}</div>`;
}

// ---------------- events ----------------
function connect() {
  const es = new EventSource('/api/events');
  es.onopen = () => { $('#conn').classList.add('on'); load(); };
  es.onerror = () => $('#conn').classList.remove('on');
  es.addEventListener('agent', (e) => { const d = JSON.parse(e.data); Object.assign(A(d.id), d); renderRoster(); });
  es.addEventListener('task', (e) => { const t = JSON.parse(e.data); const i = S.tasks.findIndex((x) => x.id === t.id);
    const was = i >= 0 ? S.tasks[i].status : null;
    if (was && was !== t.status && t.status === 'done' && t.agent === 'analyst') loadIntel();
    if (was && was !== t.status && ['done', 'failed'].includes(t.status)) { const a = A(t.agent); toast({ c: t.status === 'done' ? a.color : '#ff5d6c', title: `${a.emoji} ${a.name} ${t.status === 'done' ? 'finished' : 'failed'}`, text: t.summary || t.title, task: t.id }); } if (i >= 0) S.tasks[i] = t; else S.tasks.push(t); renderBoard(); renderRoster(); if (S.open === t.id && ['done', 'failed', 'stopped'].includes(t.status)) openTask(t.id); else if (S.open === t.id) $('#dStatus').textContent = t.status; });
  es.addEventListener('log', (e) => { const d = JSON.parse(e.data); if (S.open === d.taskId) { const L = $('#dLog'); if (L) { const stick = L.scrollTop + L.clientHeight > L.scrollHeight - 30; L.insertAdjacentHTML('beforeend', logRow(d.entry)); if (stick) L.scrollTop = L.scrollHeight; } } });
  es.addEventListener('usage', (e) => renderUsage(JSON.parse(e.data)));
  es.addEventListener('production', (e) => { const pr = JSON.parse(e.data); const i = S.productions.findIndex((x) => x.id === pr.id); if (i >= 0) S.productions[i] = pr; else S.productions.push(pr); if (!S.prOpen) S.prOpen = pr.id; if (document.activeElement?.id !== 'apNotes') renderProds(); });
  es.addEventListener('notify', (e) => { const d = JSON.parse(e.data); toast({ c: '#ff7ab6', title: d.title, text: d.text }); });
  es.addEventListener('login', (e) => { const d = JSON.parse(e.data); toast({ c: '#ff5d6c', title: d.title || '🔑 Claude Code needs signing in', text: d.text }); });
  es.addEventListener('hive', (e) => { S.hive.unshift(JSON.parse(e.data)); renderHive(); });
  es.addEventListener('approval', (e) => { const ap = JSON.parse(e.data); S.approvals.push(ap); renderApprovals(); toast({ c: '#ffd166', title: `${A(ap.agent).emoji} ${A(ap.agent).name} needs approval`, text: `${ap.tool}: ${ap.summary.slice(0, 90)}` }); try { navigator.vibrate?.(80); } catch {} });
  es.addEventListener('approval-done', (e) => { const d = JSON.parse(e.data); S.approvals = S.approvals.filter((a) => a.id !== d.id); renderApprovals(); });
  es.addEventListener('warroom', (e) => { const w = JSON.parse(e.data); const i = S.warrooms.findIndex((x) => x.id === w.id); if (i >= 0) S.warrooms[i] = w; else S.warrooms.push(w); renderWrList(); if (S.wrOpen === w.id) renderWr(); renderRoster(); });
  es.addEventListener('seat', (e) => { const d = JSON.parse(e.data); const w = S.warrooms.find((x) => x.id === d.id); const s = w?.seats.find((x) => x.key === d.seat); if (s) { s.notes = d.notes; if (S.wrOpen === w.id) renderWr(); } });
}
function renderUsage(u) {
  if (!u) return; S.usage = u;
  const at = u.resumeAt ? new Date(u.resumeAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  const pct = Math.min(100, (u.window / u.cap) * 100);
  $('#usage').innerHTML = u.paused === 'limit' ? `⏸ plan limit · back ${at} <button class="mini" data-resume>Resume</button>` : u.paused === 'cap' ? `⏸ 5h cap · back ${at}` : `5h · $${u.window.toFixed(2)} / $${u.cap}`;
  renderBoard();
  $('#usageFill').style.width = pct + '%';
  $('#usageBox').className = 'meter' + (u.paused ? ' paused hot' : pct > 80 ? ' hot' : pct > 50 ? ' mid' : '');
  let dots = ''; for (let i = 0; i < u.slots; i++) dots += `<b class="${u.used >= i + 1 ? 'on' : u.used > i ? 'half' : ''}"></b>`;
  $('#slots').innerHTML = dots; $('#slots').title = `${u.used} of ${u.slots} agent slots in use (Haiku 0.5 · Sonnet 1 · Opus 2)`;
  if (u.paused && S.lastPaused !== u.paused) toast({ c: '#ffd166', title: 'New work paused', text: u.paused === 'limit' ? `Your Claude plan's limit was reached. Resumes about ${at}.` : `The 5-hour soft cap was reached. Resumes about ${at}.` });
  S.lastPaused = u.paused;
}
function toast({ c, title, text, task }) {
  const el = document.createElement('div'); el.className = 'toast'; el.style.setProperty('--c', c || '#4fd1ff');
  el.innerHTML = `<b>${esc(title)}</b>${esc(text || '')}`; if (task) el.dataset.task = task;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 6500);
}
async function loadIntel() {
  const d = await api('/api/intel'); $('#brainMd').innerHTML = md(d.brain);
  const latest = {}; for (const r of d.results) latest[r.slug] = r;   // newest snapshot per video
  const rows = Object.values(latest).reverse(), max = Math.max(1, ...rows.map((r) => +r.views || 0));
  const num = (v, f = (x) => x) => (v === '' || v == null ? '<span class="dim">—</span>' : f(v));
  $('#nRes').textContent = rows.length ? `${rows.length} videos` : '';
  $('#resTbl').innerHTML = '<tr><th>video</th><th>views</th><th>len</th><th>avg watch</th><th>full</th><th>likes</th><th>saves</th><th>posted</th></tr>' + rows.map((r) => `<tr class="${/studio film/.test(r.notes) ? 'studio' : ''}" title="${esc(r.notes)}">
    <td>${esc(r.slug)}</td><td><span class="vbar" style="width:${Math.max(3, ((+r.views || 0) / max) * 60)}px"></span>${num(r.views, (v) => (+v).toLocaleString())}</td><td>${num(r.length_s, (v) => v + 's')}</td>
    <td>${num(r.avg_watch_s, (v) => v + 's')}</td><td>${num(r.completion_pct, (v) => v + '%')}</td><td>${num(r.likes)}</td><td>${num(r.saves)}</td><td>${esc(((r.post_utc || '').match(/\d{4}-(\d\d-\d\d)/) || [, ''])[1])}</td></tr>`).join('');
}
async function uploadShots(files) {
  files = [...files].filter((f) => f.type.startsWith('image/')); if (!files.length) return;
  const box = $('#drop'); box.classList.add('busy');
  try {
    const data = await Promise.all(files.map((f) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok({ name: f.name, data: r.result }); r.readAsDataURL(f); })));
    const r = await api('/api/upload', { files: data, note: $('#dropNote').value });
    $('#dropNote').value = '';
    toast({ c: '#4fd1ff', title: r.ok ? `📥 ${r.saved.length} screenshot(s) sent to the Analyst` : 'Upload failed', text: r.ok ? 'The numbers go into results.csv and the brain. Watch Mission Control.' : r.error, task: r.task });
  } finally { box.classList.remove('busy'); }
}
// ---------------- studio: productions ----------------
const PST = [['brief', 'Brief'], ['approval', 'Your approval'], ['build', 'Build'], ['render', 'GPU render'], ['done', 'Film']];
const prStage = (pr) => (pr.stage === 'failed' || pr.stage === 'paused' || pr.stage === 'cancelled' ? pr.stage : (PST.find((x) => x[0] === pr.stage) || [pr.stage, pr.stage])[1]);
function renderProds() {
  const L = [...S.productions].reverse();
  $('#prodList').innerHTML = L.map((pr) => `<div class="wrItem ${pr.id === S.prOpen ? 'on' : ''}" data-pr="${pr.id}"><b class="st-${pr.stage}">${esc(prStage(pr))}</b> · ${esc(pr.title)}<div class="muted small">${pr.eta && !pr.eta.waitingOnYou ? '⏱ ' + new Date(pr.eta.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' · ' : ''}${ago(pr.created)} ago · ${esc(pr.quality)}${pr.slug ? ' · ' + esc(pr.slug) : ''}${pr.cost ? ' · $' + pr.cost.toFixed(2) : ''}</div></div>`).join('') || '<p class="muted small">No productions yet. Greenlight an idea above, or use 🎬 on a pitch.</p>';
  const pr = S.productions.find((x) => x.id === S.prOpen) || L[0]; const st = $('#prodStage');
  if (!pr) { st.innerHTML = '<div class="empty">🎬<br>Greenlit ideas appear here: the brief, your approval, the build, the GPU render and the finished film.</div>'; return; }
  S.prOpen = pr.id;
  const k = PST.findIndex((x) => x[0] === (pr.stage === 'failed' || pr.stage === 'paused' ? pr.failedAt || pr.pausedFrom : pr.stage));
  const steps = PST.map((x, i) => `<div class="${pr.stage === 'done' || k > i ? 'done' : k === i ? (pr.stage === 'failed' ? 'bad' : 'now') : ''}">${i + 1} · ${x[1]}</div>`).join('');
  const busy = ['brief', 'build', 'render'].includes(pr.stage);
  const actions = pr.stage === 'approval' ? `<div class="verdict"><h3>Your call</h3><p class="small">Read the brief below. Approve starts the Director's build, then the GPU render on this PC. Nothing runs until you press it.</p>
      <input id="apNotes" placeholder="Optional changes for the Director, e.g. “swap shot 4 for a city street”">
      <div class="cmdrow"><label class="sel">Quality <select id="apQuality">${['max', 'standard', 'draft'].map((q) => `<option ${q === pr.quality ? 'selected' : ''}>${q}</option>`).join('')}</select></label><label class="sel">Builder <select id="apBuilder"><option value="opus" ${pr.builder !== 'sonnet' ? 'selected' : ''}>Opus</option><option value="sonnet" ${pr.builder === 'sonnet' ? 'selected' : ''}>Sonnet</option></select></label>
      <button class="ghost" data-prcopy="${pr.id}" title="Copy the brief as a prompt for any Claude session">📋 Copy as prompt</button><button class="no" data-pract="cancel" data-id="${pr.id}">Reject</button><button class="primary" data-pract="approve" data-id="${pr.id}">Approve & build ⏎</button></div></div>` : '';
  const e = pr.eta, etaTxt = e ? `${e.waitingOnYou ? 'If approved now, ready' : 'Ready'} ${e.approx ? 'about' : 'at'} ${new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })} · ${e.minutes < 60 ? e.minutes + ' min' : (e.minutes / 60).toFixed(1) + ' h'} left` : '';
  const etaBox = etaTxt ? `<div class="eta">⏱ ${esc(etaTxt)}${pr.stats ? `<span class="muted small"> · ${pr.stats.shots} shots, ${pr.stats.frames} frames, ${esc(pr.quality)}, ${pr.builder === 'sonnet' ? 'Sonnet' : 'Opus'} builder</span>` : ''}</div>` : '';
  const prog = pr.stage === 'render' ? `<div class="pbar"><i style="width:${Math.round((pr.progress || 0) * 100)}%"></i></div><div class="muted small">${pr.waiting ? 'Waiting for the other render (one GPU)…' : `${Math.round((pr.progress || 0) * 100)}% of frames rendered`}</div>` : '';
  const film = pr.stage === 'done' ? `<video class="film" controls loop playsinline src="/api/productions/${pr.id}/video?v=${pr.finished || 0}"></video>
      <div class="cmdrow"><button class="ghost" data-pract="open" data-id="${pr.id}">📂 Show in folder</button><button class="ghost" data-pract="render" data-id="${pr.id}">↻ Render again</button><span class="muted small">projects/${esc(pr.slug)}/out/final.mp4</span></div>` : '';
  const tail = ['failed', 'paused'].includes(pr.stage) ? `<div class="verdict bad"><h3>${pr.stage === 'failed' ? 'Stopped with a problem' : 'Paused'}</h3><p class="small">${esc(pr.error || pr.note || '')}</p><div class="cmdrow"><button class="primary" data-pract="resume" data-id="${pr.id}">Resume</button><button class="no" data-pract="cancel" data-id="${pr.id}">Cancel</button></div></div>` : '';
  st.innerHTML = `<div class="stepper">${steps}</div>
    <div class="prHead"><h2>${esc(pr.title)}</h2>${busy ? `<button class="no" data-pract="cancel" data-id="${pr.id}">Cancel</button>` : ''}</div>
    <p class="muted small">${esc(pr.source.slice(0, 220))}</p>${etaBox}${actions}${tail}${prog}${film}
    <h3 style="margin-top:14px">Production log</h3><div class="log" id="prLog">${(pr.log || []).map((l) => `<div>${hhmm(l.t)} ${esc(l.text)}</div>`).join('')}</div>
    ${pr.slug ? `<details ${pr.stage === 'approval' ? 'open' : ''}><summary class="muted small" style="margin-top:12px;cursor:pointer">Production brief · projects/${esc(pr.slug)}/PRODUCTION.md</summary><div class="md" id="prBrief">loading…</div></details>` : ''}`;
  const L2 = $('#prLog'); if (L2) L2.scrollTop = L2.scrollHeight;
  if (pr.slug) api(`/api/productions/${pr.id}/brief`).then((d) => { const b = $('#prBrief'); if (b) b.innerHTML = md(d.text || '(not written yet)'); S.briefText = d.text; });
}
function greenlight(source, title) { document.querySelector('[data-tab="studio"]').click(); $('#glSource').value = source; if (title) $('#glSource').dataset.title = title; $('#glSource').focus(); }
async function load() {
  const st = await api('/api/state'); Object.assign(S, st); S.mode = st.mode || (st.demo ? 'demo' : 'api');
  const M = { plan: ['PLAN', 'live', 'Real agents through Claude Code on this PC, on your Claude plan'], api: ['API', 'live', 'Real agents billed to the API key in war-room/.env'], demo: ['DEMO', 'demo', 'Simulated agents. Install Claude Code and sign in, then restart, for real ones.'] }[st.mode || (st.demo ? 'demo' : 'api')];
  $('#mode').textContent = M[0]; $('#mode').className = 'badge ' + M[1]; $('#mode').title = M[2];
  renderUsage(st.usage);
  if (document.activeElement !== $('#pinned')) $('#pinned').value = st.pinned || '';
  if (!S.wrOpen && S.warrooms.length) S.wrOpen = S.warrooms[S.warrooms.length - 1].id;
  renderRoster(); renderBoard(); renderApprovals(); renderHive(); renderWrForm(); renderWrList(); renderWr(); renderProds(); loadIntel();
}

// ---------------- interactions ----------------
document.addEventListener('click', async (e) => {
  const el = (s) => e.target.closest(s);
  let x;
  if ((x = el('[data-tab]'))) { document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b === x)); document.querySelectorAll('.view').forEach((v) => v.classList.toggle('on', v.id === x.dataset.tab)); try { localStorage.setItem('tab', x.dataset.tab); } catch {} }
  else if ((x = el('[data-stop]'))) { const t = S.tasks.find((y) => y.id === x.dataset.stop); if (x.dataset.running && !confirm(`Stop ${A(t?.agent).name}'s running task?\n\n${t?.title || ''}`)) return; x.disabled = true; await api(`/api/tasks/${x.dataset.stop}/stop`, {}); }
  else if ((x = el('[data-cancel]'))) { const sc = x.dataset.cancel, n = S.tasks.filter((t) => (sc === 'running' ? ['running'] : ['queued', 'routing']).includes(t.status)).length; if (!n) return; if (!confirm(sc === 'running' ? `Stop all ${n} running task(s)?` : `Cancel all ${n} queued task(s)?`)) return; const r = await api('/api/tasks/cancel', { scope: sc }); toast({ c: '#ff5d6c', title: sc === 'running' ? `Stopped ${r.n} task(s)` : `Cancelled ${r.n} task(s)` }); }
  else if ((x = el('[data-task]'))) { openTask(x.dataset.task); x.classList.contains('toast') && x.remove(); }
  else if ((x = el('[data-agent]'))) { const sel = $('#cmdAgent'); sel.value = sel.value === x.dataset.agent ? '' : x.dataset.agent; renderRoster(); $('#cmdText').focus(); }
  else if ((x = el('[data-resume]'))) { await api('/api/resume', {}); }
  else if ((x = el('[data-gl]'))) { $('#drawer').classList.remove('on'); greenlight(x.dataset.gl); }
  else if ((x = el('[data-pr]'))) { S.prOpen = x.dataset.pr; renderProds(); }
  else if ((x = el('[data-prcopy]'))) { const txt = `Build this approved Invisible Journeys production in the repo (read CLAUDE.md first), render it, and check it:\n\n${S.briefText || ''}`; try { await navigator.clipboard.writeText(txt); toast({ title: '📋 Copied', text: 'Paste it into any Claude Code session.' }); } catch { toast({ title: 'Copy failed', text: 'Open the brief and copy it by hand.' }); } }
  else if ((x = el('[data-pract]'))) { const a = x.dataset.pract; if (a === 'cancel' && !confirm('Cancel this production?')) return; x.disabled = true;
    await api(`/api/productions/${x.dataset.id}/${a}`, a === 'approve' ? { quality: $('#apQuality')?.value, builder: $('#apBuilder')?.value, notes: $('#apNotes')?.value } : {}); }
  else if ((x = el('#dz'))) $('#dropFile').click();
  else if ((x = el('#refreshBrain'))) { await api('/api/tasks', { agent: 'analyst', text: 'Refresh channel/BRAIN.md: re-read channel/results.csv, channel/analytics/, channel/postmortems/, channel/war-room/ (sealed dossiers) and channel/references/. Update Evidence, Lessons and Open questions so they match the data exactly. Keep it under ~1,000 words.' }); toast({ c: '#4fd1ff', title: '↻ Analyst is refreshing the brain' }); }
  else if ((x = el('[data-q]'))) { const t = $('#cmdText'); t.value = x.dataset.q; autosize(); t.focus(); }
  else if ((x = el('[data-goto]'))) { document.querySelector(`[data-tab="${x.dataset.goto}"]`)?.click(); setTimeout(() => $('#wrQ').focus(), 50); }
  else if ((x = el('[data-ap]'))) { x.parentElement.querySelectorAll('button').forEach((b) => (b.disabled = true)); await api('/api/approvals/' + x.dataset.ap, { allow: x.dataset.allow === '1' }); }
  else if ((x = el('[data-retry]'))) { const t = await api(`/api/tasks/${x.dataset.retry}/retry`, {}); openTask(t.id); }
  else if ((x = el('#drawerX')) || e.target.id === 'drawer') { $('#drawer').classList.remove('on'); S.open = null; }
  else if ((x = el('[data-off]'))) x.classList.toggle('on');
  else if ((x = el('[data-wr]'))) { S.wrOpen = x.dataset.wr; renderWrList(); renderWr(); }
  else if ((x = el('[data-wrseal]'))) { x.disabled = true; await api(`/api/warroom/${x.dataset.wrseal}/seal`, { verdict: (S.drafts || {})[x.dataset.wrseal] || $('#verdictTxt')?.value || 'Approved as proposed' }); }
  else if ((x = el('[data-wrplan]'))) { x.disabled = true; const r = await api(`/api/warroom/${x.dataset.wrplan}/plan`, {}); x.textContent = `Sent ${r.tasks} tasks ✓`; }
  else if ((x = el('[data-wrstop]'))) await api(`/api/warroom/${x.dataset.wrstop}/stop`, {});
});
$('#cmd').addEventListener('submit', async (e) => { e.preventDefault(); const text = $('#cmdText').value.trim(); if (!text) return; $('#cmdText').value = ''; await api('/api/tasks', { text, agent: $('#cmdAgent').value, deep: $('#cmdDeep').checked, team: $('#cmdTeam').checked }); $('#cmdDeep').checked = false; });
$('#cmdText').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#cmd').requestSubmit(); } });
function autosize() { const t = $('#cmdText'); t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight) + 'px'; }
$('#cmdText').addEventListener('input', autosize);
$('#cmdAgent').addEventListener('change', renderRoster);
// keyboard: Ctrl+K or / = new order, Alt+1..4 = tabs, Esc = close
document.addEventListener('keydown', (e) => {
  const typing = /TEXTAREA|INPUT|SELECT/.test(document.activeElement?.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' || (!typing && e.key === '/')) { e.preventDefault(); document.querySelector('[data-tab="mission"]').click(); $('#cmdText').focus(); }
  else if ((e.altKey || !typing) && /^[1-5]$/.test(e.key) && !e.ctrlKey && !e.metaKey) { const b = document.querySelectorAll('[data-tab]')[+e.key - 1]; if (b && (e.altKey || !typing)) { e.preventDefault(); b.click(); } }
  else if (e.key === 'Escape') { $('#drawer').classList.remove('on'); S.open = null; }
});
setInterval(() => { for (const el of document.querySelectorAll('[data-start]')) el.textContent = fmtDur((Date.now() - +el.dataset.start) / 1000); }, 1000);
$('#wrForm').addEventListener('submit', async (e) => { e.preventDefault(); const question = $('#wrQ').value.trim(); if (!question) return;
  const officers = [...document.querySelectorAll('[data-off].on')].map((c) => c.dataset.off); $('#wrQ').value = '';
  const w = await api('/api/warroom', { question, officers }); S.wrOpen = w.id; if (!S.warrooms.find((x) => x.id === w.id)) S.warrooms.push(w); renderWrList(); renderWr(); });
document.addEventListener('input', (e) => { const d = e.target.dataset?.wrdraft; if (d) (S.drafts ||= {})[d] = e.target.value; });
$('#savePinned').addEventListener('click', async () => { await api('/api/memory', { text: $('#pinned').value }); $('#pinnedSaved').textContent = 'Saved ' + new Date().toLocaleTimeString(); });
const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); }; tick(); setInterval(tick, 10000);
setInterval(renderBoard, 15000);
try { const t = localStorage.getItem('tab'); if (t) document.querySelector(`[data-tab="${t}"]`)?.click(); } catch {}
connect();

// intel: drag and drop, file picker and paste for analytics screenshots
$('#dropFile').addEventListener('change', (e) => { uploadShots(e.target.files); e.target.value = ''; });
['dragenter', 'dragover'].forEach((ev) => $('#drop').addEventListener(ev, (e) => { e.preventDefault(); $('#drop').classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => $('#drop').addEventListener(ev, (e) => { e.preventDefault(); $('#drop').classList.remove('over'); }));
$('#drop').addEventListener('drop', (e) => uploadShots(e.dataTransfer.files));
document.addEventListener('paste', (e) => { if (!$('#intel').classList.contains('on')) return; const f = [...(e.clipboardData?.files || [])]; if (f.length) { e.preventDefault(); uploadShots(f); } });

$('#glForm').addEventListener('submit', async (e) => { e.preventDefault(); const source = $('#glSource').value.trim(); if (!source) return;
  const pr = await api('/api/productions', { source, title: $('#glSource').dataset.title || '', notes: $('#glNotes').value, quality: $('#glQuality').value, builder: $('#glBuilder').value });
  $('#glSource').value = ''; $('#glNotes').value = ''; delete $('#glSource').dataset.title; S.prOpen = pr.id; if (!S.productions.find((x) => x.id === pr.id)) S.productions.push(pr); renderProds(); toast({ c: '#ff7ab6', title: '🎬 Greenlit', text: 'The Producer is writing the brief. You will be asked to approve it.' }); });
