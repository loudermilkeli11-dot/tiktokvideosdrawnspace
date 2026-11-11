// War Room dashboard: vanilla JS, live via Server-Sent Events.
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const S = { agents: [], tasks: [], hive: [], approvals: [], warrooms: [], open: null, wrOpen: null, demo: false };
const A = (id) => S.agents.find((a) => a.id === id) || { name: id || 'Commander', emoji: '🎖️', color: '#ffb347' };
const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 60 ? `${s | 0}s` : s < 3600 ? `${(s / 60) | 0}m` : s < 86400 ? `${(s / 3600) | 0}h` : `${(s / 86400) | 0}d`; };
const hhmm = (t) => new Date(t).toISOString().slice(11, 16);
const api = (p, b) => fetch(p, b === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());

// tiny markdown: headings, bold, code, links, lists, protocol keywords
function md(src) {
  const lines = esc(src || '').split('\n'); let out = '', list = null;
  const inline = (s) => s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(https?:\/\/[^\s)<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/^(SUMMARY|POSITION|WHY|RISK|STRATEGY|BATTLE PLAN|CONSENSUS|OBVIOUS|PRE-MORTEM[^:]*|PREDICTABILITY|DELEGATE|REMEMBER|VERIFIED|LIKELY|SPECULATIVE|ALL CLEAR):/, '<span class="kw">$1:</span>');
  for (const l of lines) {
    const h = l.match(/^(#{1,4})\s+(.*)/), li = l.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)/);
    if (li) { const tag = /^\s*\d/.test(l) ? 'ol' : 'ul'; if (list !== tag) { if (list) out += `</${list}>`; out += `<${tag}>`; list = tag; } out += `<li>${inline(li[1])}</li>`; continue; }
    if (list) { out += `</${list}>`; list = null; }
    if (h) out += `<h4>${inline(h[2])}</h4>`; else if (l.trim()) out += `<p>${inline(l)}</p>`;
  }
  return out + (list ? `</${list}>` : '');
}

// ---------------- render: roster ----------------
function renderRoster() {
  for (const a of S.agents) { const mine = S.tasks.filter((t) => t.agent === a.id); a.done = mine.filter((t) => t.status === 'done').length; a.cost = mine.reduce((s, t) => s + (t.cost || 0), 0); }
  $('#roster').innerHTML = S.agents.map((a) => `
    <div class="agent ${a.status}" style="--c:${a.color}" data-agent="${a.id}">
      <div class="hd"><span class="em">${a.emoji}</span><span class="nm">${esc(a.name)}</span><span class="st">${a.status}</span></div>
      <div class="role">${esc(a.role)}</div>
      <div class="last">${esc(a.last || '—')}</div>
      <div class="stats"><span>✔ ${a.done}</span><span>$${(a.cost || 0).toFixed(2)}</span><span>${esc(a.model.replace('claude-', ''))}</span></div>
    </div>`).join('');
  const sel = $('#cmdAgent'); const v = sel.value;
  sel.innerHTML = '<option value="">⚡ Auto-assign</option>' + S.agents.map((a) => `<option value="${a.id}">${a.emoji} ${esc(a.name)}</option>`).join(''); sel.value = v;
  $('#spend').textContent = '$' + (S.tasks.reduce((s, t) => s + (t.cost || 0), 0) + S.warrooms.reduce((s, w) => s + (w.cost || 0), 0)).toFixed(2);
}
// ---------------- render: board ----------------
function taskCard(t) {
  const a = A(t.agent);
  const dur = t.started ? ((t.finished || Date.now()) - t.started) / 1000 : 0;
  return `<div class="task ${t.status}" style="--c:${a.color}" data-task="${t.id}">
    <div class="t">${a.emoji} ${esc(t.title)}</div>
    ${t.summary ? `<div class="s">${esc(t.summary)}</div>` : t.routeReason ? `<div class="s">→ ${esc(a.name)} · ${esc(t.routeReason)}</div>` : ''}
    <div class="f"><span class="pill">${t.status}</span>${t.by && t.by !== 'Commander' ? `<span>from ${A(t.by).emoji}</span>` : ''}${dur ? `<span>${dur < 60 ? (dur | 0) + 's' : ((dur / 60) | 0) + 'm'}</span>` : ''}${t.cost ? `<span>$${t.cost.toFixed(2)}</span>` : ''}<span>${ago(t.created)} ago</span></div>
  </div>`;
}
function renderBoard() {
  const T = [...S.tasks].reverse();
  const q = T.filter((t) => t.status === 'queued' || t.status === 'routing'), r = T.filter((t) => t.status === 'running'), d = T.filter((t) => ['done', 'failed', 'stopped'].includes(t.status)).slice(0, 40);
  $('#colQ').innerHTML = q.map(taskCard).join('') || '<p class="muted small">Empty. Give an order above.</p>';
  $('#colR').innerHTML = r.map(taskCard).join('') || '<p class="muted small">No agent is working.</p>';
  $('#colD').innerHTML = d.map(taskCard).join('');
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
    || '<p class="muted small">Nothing waiting. Agents ask here before they edit outside their area or run commands.</p>';
}
const hiveRow = (e) => { const a = e.agent ? A(e.agent) : { emoji: '🎖️', name: 'Commander' }; return `<div class="ev ${e.kind}"><span class="tm">${hhmm(e.t)}</span><span class="who">${a.emoji} ${esc(a.name)}</span><span>${esc(e.text)}</span></div>`; };
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
    ${t.result ? `<h3 style="margin-top:14px">Result</h3><div class="md">${md(t.result)}</div>` : ''}`;
  $('#drawer').classList.add('on'); const L = $('#dLog'); L.scrollTop = L.scrollHeight;
}
const logRow = (e) => `<div class="${e.kind}">${hhmm(e.t)} ${e.kind === 'tool' ? '⚙ ' : e.kind === 'error' ? '✖ ' : ''}${esc(e.text)}</div>`;

// ---------------- war room ----------------
function renderWrForm() {
  const box = $('#wrOfficers'); if (box.dataset.ready) return; box.dataset.ready = 1;
  box.innerHTML = S.agents.filter((a) => a.id !== 'producer').map((a) => `<span class="chip ${a.id !== 'engineer' ? 'on' : ''}" style="--c:${a.color}" data-off="${a.id}">${a.emoji} ${esc(a.name)}</span>`).join('');
}
function renderWrList() {
  $('#wrList').innerHTML = [...S.warrooms].reverse().map((w) => `<div class="wrItem ${w.id === S.wrOpen ? 'on' : ''}" data-wr="${w.id}"><b>${esc(w.stage)}</b> · ${esc(w.question.slice(0, 70))}<div class="muted small">${ago(w.created)} ago${w.cost ? ' · $' + w.cost.toFixed(2) : ''}</div></div>`).join('') || '<p class="muted small">None yet.</p>';
}
const STAGE = { convening: 'OFFICERS DELIBERATING', synthesis: 'MARSHAL SYNTHESIZING', dissent: 'TENTH MAN ATTACKING', awaiting: 'AWAITING YOUR CALL', sealed: 'SEALED', stopped: 'STOPPED', failed: 'FAILED' };
function renderWr() {
  const w = S.warrooms.find((x) => x.id === S.wrOpen); const st = $('#wrStage');
  if (!w) { st.className = 'wrStage empty'; st.innerHTML = '<p class="muted">No council in session. Put a hard call to the council above.</p>'; return; }
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
    : w.stage === 'sealed' ? `<div class="verdict"><h3>Sealed</h3><p>${esc(w.verdict)}</p><p class="muted small">Dossier saved to <code>${esc(w.dossier || '')}</code></p>${w.planSent ? '' : `<button class="ghost" data-wrplan="${w.id}">Send battle plan to Mission Control</button>`}</div>`
    : ['convening', 'synthesis', 'dissent'].includes(w.stage) ? `<div class="cmdrow"><button class="no" data-wrstop="${w.id}">Stop council</button></div>` : '';
  st.innerHTML = `<div><div class="table"><div class="ring"></div><div class="core">${STAGE[w.stage] || w.stage}<small>${esc(w.question.slice(0, 120))}</small></div>${seats}</div></div>
    <div class="transcript">${verdict}${marshalCard}${tenthCard}${cards.join('')}</div>`;
}

// ---------------- events ----------------
function connect() {
  const es = new EventSource('/api/events');
  es.onopen = () => { $('#conn').classList.add('on'); load(); };
  es.onerror = () => $('#conn').classList.remove('on');
  es.addEventListener('agent', (e) => { const d = JSON.parse(e.data); Object.assign(A(d.id), d); renderRoster(); });
  es.addEventListener('task', (e) => { const t = JSON.parse(e.data); const i = S.tasks.findIndex((x) => x.id === t.id); if (i >= 0) S.tasks[i] = t; else S.tasks.push(t); renderBoard(); renderRoster(); if (S.open === t.id && ['done', 'failed', 'stopped'].includes(t.status)) openTask(t.id); else if (S.open === t.id) $('#dStatus').textContent = t.status; });
  es.addEventListener('log', (e) => { const d = JSON.parse(e.data); if (S.open === d.taskId) { const L = $('#dLog'); if (L) { const stick = L.scrollTop + L.clientHeight > L.scrollHeight - 30; L.insertAdjacentHTML('beforeend', logRow(d.entry)); if (stick) L.scrollTop = L.scrollHeight; } } });
  es.addEventListener('hive', (e) => { S.hive.unshift(JSON.parse(e.data)); renderHive(); });
  es.addEventListener('approval', (e) => { S.approvals.push(JSON.parse(e.data)); renderApprovals(); try { navigator.vibrate?.(80); } catch {} });
  es.addEventListener('approval-done', (e) => { const d = JSON.parse(e.data); S.approvals = S.approvals.filter((a) => a.id !== d.id); renderApprovals(); });
  es.addEventListener('warroom', (e) => { const w = JSON.parse(e.data); const i = S.warrooms.findIndex((x) => x.id === w.id); if (i >= 0) S.warrooms[i] = w; else S.warrooms.push(w); renderWrList(); if (S.wrOpen === w.id) renderWr(); renderRoster(); });
  es.addEventListener('seat', (e) => { const d = JSON.parse(e.data); const w = S.warrooms.find((x) => x.id === d.id); const s = w?.seats.find((x) => x.key === d.seat); if (s) { s.notes = d.notes; if (S.wrOpen === w.id) renderWr(); } });
}
async function load() {
  const st = await api('/api/state'); Object.assign(S, st);
  $('#mode').textContent = st.demo ? 'DEMO' : 'LIVE'; $('#mode').className = 'badge ' + (st.demo ? 'demo' : 'live');
  $('#mode').title = st.demo ? 'Simulated agents. Add ANTHROPIC_API_KEY to warroom/.env and restart for real ones.' : 'Real agents via the Claude Agent SDK';
  if (document.activeElement !== $('#pinned')) $('#pinned').value = st.pinned || '';
  if (!S.wrOpen && S.warrooms.length) S.wrOpen = S.warrooms[S.warrooms.length - 1].id;
  renderRoster(); renderBoard(); renderApprovals(); renderHive(); renderWrForm(); renderWrList(); renderWr();
}

// ---------------- interactions ----------------
document.addEventListener('click', async (e) => {
  const el = (s) => e.target.closest(s);
  let x;
  if ((x = el('[data-tab]'))) { document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b === x)); document.querySelectorAll('.view').forEach((v) => v.classList.toggle('on', v.id === x.dataset.tab)); try { localStorage.setItem('tab', x.dataset.tab); } catch {} }
  else if ((x = el('[data-task]'))) openTask(x.dataset.task);
  else if ((x = el('[data-agent]'))) { const sel = $('#cmdAgent'); sel.value = x.dataset.agent; $('#cmdText').focus(); }
  else if ((x = el('[data-ap]'))) { x.parentElement.querySelectorAll('button').forEach((b) => (b.disabled = true)); await api('/api/approvals/' + x.dataset.ap, { allow: x.dataset.allow === '1' }); }
  else if ((x = el('[data-stop]'))) await api(`/api/tasks/${x.dataset.stop}/stop`, {});
  else if ((x = el('[data-retry]'))) { const t = await api(`/api/tasks/${x.dataset.retry}/retry`, {}); openTask(t.id); }
  else if ((x = el('#drawerX')) || e.target.id === 'drawer') { $('#drawer').classList.remove('on'); S.open = null; }
  else if ((x = el('[data-off]'))) x.classList.toggle('on');
  else if ((x = el('[data-wr]'))) { S.wrOpen = x.dataset.wr; renderWrList(); renderWr(); }
  else if ((x = el('[data-wrseal]'))) { x.disabled = true; await api(`/api/warroom/${x.dataset.wrseal}/seal`, { verdict: (S.drafts || {})[x.dataset.wrseal] || $('#verdictTxt')?.value || 'Approved as proposed' }); }
  else if ((x = el('[data-wrplan]'))) { x.disabled = true; const r = await api(`/api/warroom/${x.dataset.wrplan}/plan`, {}); x.textContent = `Sent ${r.tasks} tasks ✓`; }
  else if ((x = el('[data-wrstop]'))) await api(`/api/warroom/${x.dataset.wrstop}/stop`, {});
});
$('#cmd').addEventListener('submit', async (e) => { e.preventDefault(); const text = $('#cmdText').value.trim(); if (!text) return; $('#cmdText').value = ''; await api('/api/tasks', { text, agent: $('#cmdAgent').value }); });
$('#cmdText').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#cmd').requestSubmit(); } });
$('#wrForm').addEventListener('submit', async (e) => { e.preventDefault(); const question = $('#wrQ').value.trim(); if (!question) return;
  const officers = [...document.querySelectorAll('[data-off].on')].map((c) => c.dataset.off); $('#wrQ').value = '';
  const w = await api('/api/warroom', { question, officers }); S.wrOpen = w.id; if (!S.warrooms.find((x) => x.id === w.id)) S.warrooms.push(w); renderWrList(); renderWr(); });
document.addEventListener('input', (e) => { const d = e.target.dataset?.wrdraft; if (d) (S.drafts ||= {})[d] = e.target.value; });
$('#savePinned').addEventListener('click', async () => { await api('/api/memory', { text: $('#pinned').value }); $('#pinnedSaved').textContent = 'Saved ' + new Date().toISOString().slice(11, 19) + ' UTC'; });
setInterval(() => { $('#clock').textContent = new Date().toISOString().slice(11, 19) + ' UTC'; }, 1000);
setInterval(renderBoard, 15000);
try { const t = localStorage.getItem('tab'); if (t) document.querySelector(`[data-tab="${t}"]`)?.click(); } catch {}
connect();
