// Phone alerts: ntfy (one-way push, free, no account) and Telegram (two-way: approve / reject / resume from the phone).
// Settings live in data/notify.json and are edited in the War Room (Memory tab → Phone alerts).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const NTFY = process.env.WARROOM_NTFY_URL || 'https://ntfy.sh';
const TG = process.env.WARROOM_TG_API || 'https://api.telegram.org';
export const EVENTS = {
  approval: 'Needs your approval (a production brief, a council verdict)',
  done: 'Finished (a video is ready)',
  failed: 'Failures and blocks',
  usage: 'Usage pauses (75% cap, plan limit)',
  setup: 'Setup problems (sign-in, update needed)',
  tasks: 'Every finished task (chatty)',
};
const PRIORITY = { approval: 'high', failed: 'high', setup: 'high', done: 'default', usage: 'default', tasks: 'low' };
const TAGS = { approval: 'raised_hand', failed: 'warning', setup: 'key', done: 'clapper', usage: 'pause_button', tasks: 'white_check_mark' };

const escH = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clock = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export function createNotifier(dataDir, { onCommand, desktop, log = () => {} } = {}) {
  const F = path.join(dataDir, 'notify.json');
  let cfg = { ntfy: '', desktop: true, tg: { token: '', chat: '' }, events: { approval: true, done: true, failed: true, usage: true, setup: true, tasks: false } };
  try { const c = JSON.parse(fs.readFileSync(F, 'utf8')); cfg = { ...cfg, ...c, tg: { ...cfg.tg, ...(c.tg || {}) }, events: { ...cfg.events, ...(c.events || {}) } }; } catch {}
  const save = () => { try { fs.writeFileSync(F, JSON.stringify(cfg, null, 1)); } catch {} };
  const recent = new Map();   // de-duplicate identical alerts within 2 minutes

  async function ntfy(kind, title, text, url) {
    if (!cfg.ntfy) return;
    const headers = { Title: encodeURIComponent(title), Priority: PRIORITY[kind] || 'default', Tags: TAGS[kind] || 'bell' };
    headers['X-Title'] = title.replace(/[^\x20-\x7e]/g, '').trim() || 'War Room'; delete headers.Title;   // ntfy wants ASCII headers
    if (url) headers.Click = url;
    await fetch(`${NTFY}/${encodeURIComponent(cfg.ntfy)}`, { method: 'POST', headers, body: `${title}\n${text}`.slice(0, 3900) });
  }
  async function tg(method, body) {
    if (!cfg.tg.token) return null;
    const r = await fetch(`${TG}/bot${cfg.tg.token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return r.json().catch(() => null);
  }
  async function send(kind, title, text = '', extra = {}) {
    if (!cfg.events[kind] && !extra.force) return;
    const key = `${kind}|${title}|${text}`; if (!extra.force && recent.has(key) && Date.now() - recent.get(key) < 120e3) return; recent.set(key, Date.now());
    const jobs = [];
    if (cfg.ntfy) jobs.push(ntfy(kind, title, text, extra.url));
    if (cfg.desktop !== false && desktop) { try { desktop(kind, title, text, extra); } catch (e) { log(`desktop alert: ${e.message}`); } }
    if (cfg.tg.token && cfg.tg.chat) {
      const buttons = (extra.buttons || []).map((b) => ({ text: b.text, callback_data: b.data }));
      const markup = buttons.length ? { inline_keyboard: [buttons] } : undefined;
      const html = `<b>${escH(title)}</b>\n${escH(text)}${extra.steps ? `\n\n${escH(extra.steps)}` : ''}\n\n<i>🛰 War Room · ${clock()}</i>`.slice(0, 1000);
      jobs.push((async () => {
        if (extra.photo && fs.existsSync(extra.photo)) {
          const form = new FormData(); form.append('chat_id', cfg.tg.chat); form.append('caption', html); form.append('parse_mode', 'HTML');
          if (markup) form.append('reply_markup', JSON.stringify(markup));
          form.append('photo', new Blob([fs.readFileSync(extra.photo)], { type: 'image/png' }), 'alert.png');
          const r = await fetch(`${TG}/bot${cfg.tg.token}/sendPhoto`, { method: 'POST', body: form }).then((x) => x.json()).catch(() => null);
          if (r?.ok) return r;
        }
        return tg('sendMessage', { chat_id: cfg.tg.chat, text: html, parse_mode: 'HTML', ...(markup ? { reply_markup: markup } : {}) });
      })());
    }
    for (const r of await Promise.allSettled(jobs)) if (r.status === 'rejected') log(`phone alert failed: ${r.reason?.message || r.reason}`);
  }
  // Telegram: long-poll for commands (outbound only, so it works from home without opening ports). Only the linked chat is obeyed.
  let polling = false, offset = 0, stop = false;
  async function poll() {
    if (polling) return; polling = true;
    while (!stop && cfg.tg.token) {
      try {
        const r = await tg('getUpdates', { timeout: 25, offset, allowed_updates: ['message', 'callback_query'] });
        for (const u of r?.result || []) {
          offset = u.update_id + 1;
          const msg = u.message, cb = u.callback_query, chat = String((msg || cb?.message)?.chat?.id || '');
          if (!chat) continue;
          if (!cfg.tg.chat && msg && /^\/start\b/.test(msg.text || '') && msg.text.includes(cfg.tg.link)) { cfg.tg.chat = chat; save(); await tg('sendMessage', { chat_id: chat, text: '✅ Linked to your War Room. Commands: /status, /approve, /reject, /resume.' }); continue; }
          if (chat !== cfg.tg.chat) { if (msg) await tg('sendMessage', { chat_id: chat, text: 'This War Room is linked to another chat.' }); continue; }
          const cmd = cb ? cb.data : (msg?.text || '').trim();
          const reply = await onCommand?.(cmd).catch((e) => `Error: ${e.message}`);
          if (cb) await tg('answerCallbackQuery', { callback_query_id: cb.id, text: (reply || 'OK').slice(0, 190) });
          if (reply) await tg('sendMessage', { chat_id: chat, text: reply.slice(0, 4000) });
        }
        if (!r?.ok) await new Promise((res) => setTimeout(res, 15000));
      } catch (e) { log(`telegram: ${e.message}`); await new Promise((res) => setTimeout(res, 15000)); }
    }
    polling = false;
  }
  if (cfg.tg.token) poll();
  // the finished film + its posting package, as separate messages so each can be long-pressed and copied
  async function sendPackage(file, { title, cover, caption, hashtags = [], slot, notes } = {}) {
    if (!cfg.tg.token || !cfg.tg.chat) return { ok: false, error: 'Telegram is not linked.' };
    const st = fs.statSync(file); if (st.size > 49.5e6) return { ok: false, error: `The video is ${(st.size / 1e6).toFixed(0)} MB; Telegram bots can send 50 MB.` };
    const form = new FormData();
    form.append('chat_id', cfg.tg.chat); form.append('supports_streaming', 'true');
    form.append('caption', `🎬 ${title || 'Your video'}: ready for TikTok. Save it, then upload.`.slice(0, 1000));
    form.append('video', new Blob([fs.readFileSync(file)], { type: 'video/mp4' }), path.basename(file));
    const r = await fetch(`${TG}/bot${cfg.tg.token}/sendVideo`, { method: 'POST', body: form }).then((x) => x.json()).catch((e) => ({ ok: false, description: e.message }));
    if (!r?.ok) return { ok: false, error: r?.description || 'upload failed' };
    const tags = hashtags.map((h) => (h.startsWith('#') ? h : '#' + h)).join(' ');
    if (caption || tags) await tg('sendMessage', { chat_id: cfg.tg.chat, text: [caption, tags].filter(Boolean).join('\n\n') });
    await tg('sendMessage', { chat_id: cfg.tg.chat, text: ['📋 Before you post:', cover ? `• Cover text: ${cover}` : '', '• Turn ON "AI-generated content" in TikTok\'s settings for this post', slot ? `• Post at: ${slot}` : '', notes ? `• ${notes}` : '', '↑ Long-press the caption message above → Copy, then paste it into TikTok.'].filter(Boolean).join('\n') });
    return { ok: true };
  }
  return {
    send, sendPackage,
    view() { return { ntfy: cfg.ntfy, desktop: cfg.desktop !== false, tg: { set: !!cfg.tg.token, linked: !!cfg.tg.chat, link: cfg.tg.link || '', bot: cfg.tg.bot || '' }, events: cfg.events, labels: EVENTS }; },
    async update(b) {
      if (typeof b.ntfy === 'string') cfg.ntfy = b.ntfy.trim().replace(/^https?:\/\/ntfy\.sh\//, '');
      if (b.newTopic) cfg.ntfy = `ij-warroom-${crypto.randomBytes(9).toString('base64url').toLowerCase()}`;
      if (b.events) for (const k of Object.keys(EVENTS)) if (k in b.events) cfg.events[k] = !!b.events[k];
      if (typeof b.desktop === 'boolean') cfg.desktop = b.desktop;
      if (typeof b.tgToken === 'string' && b.tgToken.trim()) {
        cfg.tg = { token: b.tgToken.trim(), chat: '', link: crypto.randomBytes(4).toString('hex'), bot: '' };
        const me = await tg('getMe', {}).catch(() => null);
        if (!me?.ok) { cfg.tg = { token: '', chat: '' }; save(); throw new Error('Telegram did not accept that bot token.'); }
        cfg.tg.bot = me.result.username; save(); poll();
      }
      if (b.tgUnlink) { cfg.tg = { token: '', chat: '' }; stop = true; setTimeout(() => (stop = false), 30000); }
      save(); return this.view();
    },
  };
}
