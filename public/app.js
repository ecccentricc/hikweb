'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('hikweb.' + k)) ?? d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem('hikweb.' + k, JSON.stringify(v)); } catch (_) { /* */ } },
};

async function api(url, opts = {}) {
  const r = await fetch(url, { credentials: 'same-origin', ...opts, headers: { 'X-Lang': LANG, ...(opts.headers || {}) } });
  if (r.status === 401 && !url.includes('/api/login')) { showLogin(); throw Object.assign(new Error(_t('err.notLogged')), { status: 401 }); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || _t('err.http', { n: r.status })), { status: r.status });
  return data;
}

/* ---------------- HLS grotuvas ---------------- */
function attachHls(video, url, live, onFatal) {
  if (window.Hls && Hls.isSupported()) {
    const hls = new Hls(live
      ? { liveSyncDurationCount: 2, liveMaxLatencyDurationCount: 6, maxBufferLength: 10, backBufferLength: 10 }
      : { maxBufferLength: 60, backBufferLength: 600 });
    hls.on(Hls.Events.ERROR, (_, d) => {
      if (!d.fatal) return;
      if (d.type === Hls.ErrorTypes.MEDIA_ERROR) { hls.recoverMediaError(); return; }
      onFatal && onFatal(d);
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    video.play().catch(() => {});
    return { destroy: () => hls.destroy() };
  }
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.play().catch(() => {});
    video.onerror = () => onFatal && onFatal();
    return { destroy: () => { video.removeAttribute('src'); video.load(); } };
  }
  throw new Error(_t('err.noHls'));
}

/* ---------------- Prisijungimas ---------------- */
function showLogin() { $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); }
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  $('#loginErr').textContent = '';
  try {
    await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(f)) });
    start();
  } catch (err) { $('#loginErr').textContent = err.message; }
});
$('#logoutBtn').onclick = async () => { await api('/api/logout').catch(() => {}); location.reload(); };

/* ---------------- Įrenginiai ---------------- */
let devices = [];
let me = null;
let currentTab = 'live';
const camKey = (d, c) => `${d}:${c}`;
function camName(dev, ch) {
  const d = devices.find((x) => x.id === dev);
  const c = d && d.channels.find((x) => x.id === ch);
  if (!d) return `${dev} / ${ch}`;
  return d.type === 'nvr' ? `${d.name} · ${c ? c.name : _t('ch.short', { n: ch })}` : (c ? c.name : d.name);
}

async function loadDevices() {
  devices = await api('/api/devices');
  const el = $('#deviceList');
  el.innerHTML = '';
  const sel = $('#recCam');
  sel.innerHTML = '';
  for (const d of devices) {
    const box = document.createElement('div');
    box.className = 'dev';
    box.innerHTML = `<div class="dev-name"><span></span><span class="tag">${_t(d.type === 'nvr' ? 'kind.nvr' : 'kind.camera')}</span></div>`;
    $('.dev-name span', box).textContent = d.name;
    if (d.error) { const e = document.createElement('div'); e.className = 'dev-err'; e.textContent = d.error; box.append(e); }
    for (const c of d.channels) {
      const row = document.createElement('div');
      row.className = 'ch';
      row.dataset.key = camKey(d.id, c.id);
      row.innerHTML = '<span class="ch-name"></span><span class="ch-off"></span>';
      $('.ch-name', row).textContent = c.name;
      $('.ch-off', row).textContent = _t('ch.offline');
      row.classList.toggle('off', c.online === false);
      row.onclick = () => onCameraClick(d.id, c.id);
      box.append(row);
      const o = document.createElement('option');
      o.value = camKey(d.id, c.id);
      o.textContent = camName(d.id, c.id);
      sel.append(o);
    }
    el.append(box);
  }
  if (!devices.length) el.innerHTML = `<div class="muted pad">${_t('dev.none')}</div>`;
  const lastRec = store.get('recCam');
  if (lastRec && [...sel.options].some((o) => o.value === lastRec)) sel.value = lastRec;
  initRecCams();
}

function onCameraClick(dev, ch) {
  setDrawer(false);
  if (currentTab === 'rec') {
    $('#recCam').value = camKey(dev, ch);
    searchRecordings();
  } else {
    setTile(selectedTile, { dev, ch });
    const next = tiles.findIndex((t, i) => i > selectedTile && !t.cam);
    selectTile(next >= 0 ? next : selectedTile);
  }
}

/** Kas minutę atnaujina kamerų būseną (neperpiešiant sąrašo). */
async function refreshStatus() {
  if (document.hidden) return;
  let list;
  try { list = await api('/api/devices?refresh=1'); } catch (_) { return; }
  for (const d of list) {
    for (const c of d.channels) {
      const row = document.querySelector(`.ch[data-key="${CSS.escape(camKey(d.id, c.id))}"]`);
      if (row) row.classList.toggle('off', c.online === false);
      const dv = devices.find((x) => x.id === d.id);
      const dc = dv && dv.channels.find((x) => x.id === c.id);
      const was = dc && dc.online;
      if (dc) dc.online = c.online;
      // kamera vėl prisijungė – iškart bandome rodyti
      if (was === false && c.online !== false && currentTab === 'live') {
        tiles.filter((t) => t.cam && t.cam.dev === d.id && t.cam.ch === c.id).forEach((t) => playTile(t));
      }
    }
  }
}
setInterval(refreshStatus, 60000);

/* ---------------- Tiesioginis vaizdas ---------------- */
let layout = store.get('layout', 4);
let tiles = [];
let selectedTile = 0;
let saved = store.get('tiles', []);

function buildGrid() {
  const grid = $('#grid');
  tiles.forEach((t) => stopTile(t));
  grid.innerHTML = '';
  grid.className = 'grid l' + layout;
  tiles = [];
  for (let i = 0; i < layout; i++) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.innerHTML = `<div class="empty">+</div><video muted playsinline class="hidden"></video>
      <div class="status"></div>
      <div class="bar"><span class="t"></span>
        <span class="mode hidden"></span>
        <button data-a="hq" title="${_t('tile.quality')}">SD</button>
        <button data-a="snap" title="${_t('tile.snap')}">📷</button>
        <button data-a="rec" title="${_t('tile.rec')}">⏪</button>
        <button data-a="fs" title="${_t('tile.fs')}">⛶</button>
        <button data-a="x" title="${_t('tile.close')}">✕</button></div>`;
    const t = { i, el, video: $('video', el), cam: null, main: false, player: null, sid: null, retry: null };
    el.onclick = () => selectTile(i);
    el.ondblclick = () => toggleFs(t);
    $('.bar', el).onclick = (e) => {
      const a = e.target.dataset.a;
      if (!a) return;
      e.stopPropagation();
      if (a === 'x') setTile(i, null);
      if (a === 'hq') { t.main = !t.main; playTile(t); }
      if (a === 'fs') toggleFs(t);
      if (a === 'snap' && t.cam) window.open(`/api/snapshot?device=${encodeURIComponent(t.cam.dev)}&ch=${t.cam.ch}&_=${Date.now()}`, '_blank');
      if (a === 'rec' && t.cam) { $('#recCam').value = camKey(t.cam.dev, t.cam.ch); switchTab('rec'); searchRecordings(); }
    };
    tiles.push(t);
    grid.append(el);
  }
  $$('#layoutSel button').forEach((b) => b.classList.toggle('active', +b.dataset.l === layout));
  saved.slice(0, layout).forEach((c, i) => c && setTile(i, c, true));
  selectTile(Math.min(selectedTile, layout - 1));
}

function selectTile(i) {
  selectedTile = i;
  tiles.forEach((t) => t.el.classList.toggle('sel', t.i === i));
}

function setTile(i, cam, noSave) {
  const t = tiles[i];
  if (!t) return;
  stopTile(t);
  t.cam = cam;
  t.main = layout === 1;
  $('.empty', t.el).classList.toggle('hidden', !!cam);
  t.el.classList.toggle('has-cam', !!cam);
  t.video.classList.toggle('hidden', !cam);
  $('.t', t.el).textContent = cam ? camName(cam.dev, cam.ch) : '';
  if (cam) playTile(t); else $('.status', t.el).textContent = '';
  if (!noSave) {
    saved[i] = cam;
    store.set('tiles', saved);
  }
  markActive();
}

function markActive() {
  const on = new Set(tiles.filter((t) => t.cam).map((t) => camKey(t.cam.dev, t.cam.ch)));
  $$('.ch').forEach((r) => r.classList.toggle('on', on.has(r.dataset.key)));
}

function stopTile(t) {
  clearTimeout(t.retry);
  if (t.player) { t.player.destroy(); t.player = null; }
  if (t.pc) { t.pc.onconnectionstatechange = null; t.pc.close(); t.pc = null; }
  if (t.video.srcObject) t.video.srcObject = null;
  setMode(t, '');
  if (t.sid) {
    const sid = t.sid;
    t.sid = null;
    // jei ta pati kamera rodoma kitame langelyje – serverio srauto nestabdome
    if (!tiles.some((x) => x !== t && x.sid === sid)) api(`/api/stop?id=${sid}`, { method: 'POST' }).catch(() => {});
  }
  t.token = (t.token || 0) + 1;
}

function setMode(t, mode) {
  const el = t.el.querySelector('.mode');
  if (el) { el.textContent = mode; el.classList.toggle('hidden', !mode); el.classList.toggle('rtc', mode === 'RTC'); }
}

/* ---- WebRTC (go2rtc): < 1 s vėlavimas ---- */
const rtcFailed = new Set(); // kameros, kurioms WebRTC šioje sesijoje neveikia (pvz. H.265) – iškart naudojame HLS
const rtcKey = (t) => `${t.cam.dev}:${t.cam.ch}:${t.main ? 'main' : 'sub'}`;

function waitIce(pc, ms) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { clearTimeout(to); pc.removeEventListener('icegatheringstatechange', chk); resolve(); };
    const chk = () => { if (pc.iceGatheringState === 'complete') done(); };
    const to = setTimeout(done, ms);
    pc.addEventListener('icegatheringstatechange', chk);
  });
}

async function playRtc(t, token) {
  const st = $('.status', t.el);
  const pc = new RTCPeerConnection();
  t.pc = pc;
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });
  const ms = new MediaStream();
  pc.ontrack = (ev) => {
    ms.addTrack(ev.track);
    if (t.video.srcObject !== ms) t.video.srcObject = ms;
    t.video.play().catch(() => {});
  };
  await pc.setLocalDescription(await pc.createOffer());
  await waitIce(pc, 1500);
  if (token !== t.token) throw new Error('cancelled');
  const r = await fetch(`/api/webrtc?device=${encodeURIComponent(t.cam.dev)}&ch=${t.cam.ch}&stream=${t.main ? 'main' : 'sub'}`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/sdp', 'X-Lang': LANG }, body: pc.localDescription.sdp,
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw Object.assign(new Error(j.error || 'WebRTC ' + r.status), { status: r.status, offline: j.offline });
  }
  const answer = await r.text();
  if (token !== t.token) throw new Error('cancelled');
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });
  // laukiame pirmo kadro
  await new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('WebRTC timeout')), 8000);
    t.video.onplaying = () => { clearTimeout(to); resolve(); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') { clearTimeout(to); reject(new Error('WebRTC ' + pc.connectionState)); }
    };
  });
  if (token !== t.token) throw new Error('cancelled');
  st.textContent = '';
  setMode(t, 'RTC');
  // nutrūkus ryšiui – jungiamės iš naujo
  pc.onconnectionstatechange = () => {
    if (token !== t.token) return;
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      st.textContent = _t('live.reconnecting');
      clearTimeout(t.retry);
      t.retry = setTimeout(() => playTile(t), pc.connectionState === 'failed' ? 1000 : 4000);
    } else if (pc.connectionState === 'connected') st.textContent = '';
  };
}

async function playTile(t) {
  stopTile(t);
  const token = t.token;
  const st = $('.status', t.el);
  $('[data-a=hq]', t.el).textContent = t.main ? 'HD' : 'SD';
  st.textContent = _t('live.connecting');
  if (me && me.webrtc && window.RTCPeerConnection && !rtcFailed.has(rtcKey(t))) {
    try {
      await playRtc(t, token);
      return;
    } catch (e) {
      if (token !== t.token) return;
      if (t.pc) { t.pc.onconnectionstatechange = null; t.pc.close(); t.pc = null; }
      t.video.srcObject = null;
      if (e.status === 503) {
        st.textContent = e.message;
        t.retry = setTimeout(() => playTile(t), 60000);
        return;
      }
      console.warn('WebRTC nepavyko, naudojamas HLS:', e.message);
      rtcFailed.add(rtcKey(t));
    }
  }
  try {
    const r = await api(`/api/live?device=${encodeURIComponent(t.cam.dev)}&ch=${t.cam.ch}&stream=${t.main ? 'main' : 'sub'}`);
    if (token !== t.token) return;
    t.sid = r.id;
    t.video.onplaying = () => { st.textContent = ''; setMode(t, 'HLS'); };
    t.player = attachHls(t.video, r.url, true, () => {
      st.textContent = _t('live.reconnecting');
      t.retry = setTimeout(() => playTile(t), 3000);
    });
  } catch (e) {
    if (token !== t.token) return;
    st.textContent = e.message;
    // klaida dėl adreso / slaptažodžio nepasitaisys savaime – bandome rečiau
    t.retry = setTimeout(() => playTile(t), (e.status === 404 || e.status === 503 || /404|401/.test(e.message)) ? 60000 : 15000);
  }
}

function toggleFs(t) {
  if (!t.cam) return;
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  const fs = t.el.requestFullscreen || t.el.webkitRequestFullscreen;
  if (fs) { fs.call(t.el); return; }
  // iPhone: per visą ekraną galima rodyti tik patį vaizdo elementą
  if (t.video.webkitEnterFullscreen) t.video.webkitEnterFullscreen();
}
document.addEventListener('fullscreenchange', () => {
  const fs = document.fullscreenElement;
  for (const t of tiles) {
    if (!t.cam) continue;
    const wantMain = fs === t.el || layout === 1;
    if (t.main !== wantMain && (fs === t.el || !fs)) { t.main = wantMain; playTile(t); }
  }
});

$('#layoutSel').onclick = (e) => {
  const l = +e.target.dataset.l;
  if (!l || l === layout) return;
  layout = l;
  store.set('layout', l);
  buildGrid();
};

/* ---------------- Skirtukai ---------------- */
function switchTab(name) {
  const prev = currentTab;
  currentTab = name;
  setDrawer(false);
  $('#hdrTools').classList.remove('open');
  if (prev !== name) $('main').scrollTop = 0;
  $$('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  for (const t of ['live', 'rec', 'set']) $('#tab-' + t).classList.toggle('hidden', name !== t);
  $('#layoutSel').style.visibility = name === 'live' ? '' : 'hidden';
  if (name !== 'rec') stopPlayback();
  if (name !== 'live') tiles.forEach(stopTile);
  else if (prev !== 'live') tiles.forEach((t) => t.cam && playTile(t));
  if (name === 'set') loadSettings();
}
$$('.tabs button').forEach((b) => { b.onclick = () => switchTab(b.dataset.tab); });
/* Telefone: ištraukiamas kamerų sąrašas ir „⋯“ meniu */
function setDrawer(open) {
  $('#sidebar').classList.toggle('open', open);
  $('#drawerBg').classList.toggle('open', open);
}
$('#menuBtn').onclick = () => setDrawer(!$('#sidebar').classList.contains('open'));
$('#drawerBg').onclick = () => setDrawer(false);
$('#moreBtn').onclick = (e) => { e.stopPropagation(); $('#hdrTools').classList.toggle('open'); };
document.addEventListener('click', (e) => {
  const m = $('#hdrTools');
  if (m.classList.contains('open') && !m.contains(e.target)) m.classList.remove('open');
});
$('#layoutSel').addEventListener('click', () => setTimeout(() => $('#hdrTools').classList.remove('open'), 150));

/* ---------------- Įrašai ---------------- */
const GROUP_GAP_MS = 3000;
const MAX_CAMS = 4;
const LANE_COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#14b8a6'];
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const tStr = (d) => `${dayStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const hms = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const parseT = (s) => new Date(s); // "YYYY-MM-DDTHH:MM:SS" – vietinis laikas
const durStr = (s) => {
  s = Math.round(s);
  return s >= 3600 ? _t('dur.h', { h: Math.floor(s / 3600), m: pad(Math.floor(s % 3600 / 60)) }) : _t('dur.m', { m: Math.floor(s / 60), s: pad(s % 60) });
};
const TYPES = ['CMR', 'MOTION', 'ALARM', 'EDR', 'ALARMANDMOTION', 'Command', 'SMART', 'timing', 'VMD', 'manual'];
const typeName = (ty) => { const k = TYPES.find((x) => x.toLowerCase() === String(ty || '').toLowerCase()); return k ? _t('type.' + k) : (ty || ''); };
/** Įrašo kategorija filtrui: judesys / signalas / nuolatinis */
const catOf = (ty) => {
  const t = String(ty || '');
  if (/MOTION|VMD|SMART/i.test(t)) return 'motion';
  if (/ALARM|EDR/i.test(t)) return 'alarm';
  return 'continuous';
};

let filters = new Set(store.get('recFilters', ['motion', 'continuous', 'alarm']));
let extraCams = []; // papildomos kameros ('dev:ch'), iki 3
let players = []; // {key, dev, ch, slot, el, video, msgEl, segments, visible, groups, pb, token}
let searchSeq = 0;

const splitKey = (v) => { const i = v.lastIndexOf(':'); return [v.slice(0, i), +v.slice(i + 1)]; };
function splitCam() { const v = $('#recCam').value; return v ? splitKey(v) : []; }
const camKeys = () => [$('#recCam').value, ...extraCams].filter(Boolean);

$('#recDate').value = dayStr(new Date());
$('#recSearch').onclick = () => searchRecordings();
$('#recDate').onchange = () => searchRecordings();
const shiftDay = (n) => { const d = new Date($('#recDate').value + 'T12:00:00'); d.setDate(d.getDate() + n); $('#recDate').value = dayStr(d); searchRecordings(); };
$('#dPrev').onclick = () => shiftDay(-1);
$('#dNext').onclick = () => shiftDay(1);

(function hours() {
  const h = $('#tlHours');
  for (let i = 0; i <= 24; i += 2) {
    const s = document.createElement('span');
    s.style.left = (i / 24 * 100) + '%';
    s.textContent = pad(i);
    h.append(s);
  }
}());

const dayStart = () => new Date($('#recDate').value + 'T00:00:00');
const posOf = (d) => (d - dayStart()) / 864e5 * 100;

/* --- kamerų pasirinkimas (iki 4) --- */
function saveCams() { store.set('recCam', $('#recCam').value); store.set('recExtra', extraCams); }
function initRecCams() {
  const opts = new Set([...$('#recCam').options].map((o) => o.value));
  extraCams = store.get('recExtra', []).filter((k) => opts.has(k) && k !== $('#recCam').value).slice(0, MAX_CAMS - 1);
  fillAddCam();
}
function fillAddCam() {
  const sel = $('#addCam');
  const used = new Set(camKeys());
  sel.innerHTML = `<option value="">${esc(_t('rec.addCam'))}</option>`
    + [...$('#recCam').options].filter((o) => !used.has(o.value))
      .map((o) => `<option value="${esc(o.value)}">${esc(o.textContent)}</option>`).join('');
  sel.disabled = camKeys().length >= MAX_CAMS || sel.options.length < 2;
  const box = $('#extraCams');
  box.innerHTML = '';
  extraCams.forEach((k, i) => {
    const c = document.createElement('span');
    c.className = 'chip';
    c.innerHTML = '<i></i><span></span><button type="button">×</button>';
    $('i', c).style.background = LANE_COLORS[i + 1];
    $('span', c).textContent = camName(...splitKey(k));
    $('button', c).onclick = () => { extraCams.splice(i, 1); saveCams(); searchRecordings(); };
    box.append(c);
  });
}
$('#addCam').onchange = () => {
  const v = $('#addCam').value;
  if (!v || camKeys().length >= MAX_CAMS) return;
  extraCams.push(v);
  saveCams();
  searchRecordings();
};
$('#recCam').onchange = () => { extraCams = extraCams.filter((k) => k !== $('#recCam').value); saveCams(); searchRecordings(); };

/* --- filtras --- */
$$('#typeFilter button').forEach((b) => {
  b.classList.toggle('on', filters.has(b.dataset.f));
  b.onclick = () => {
    const f = b.dataset.f;
    if (filters.has(f)) { if (filters.size > 1) filters.delete(f); } else filters.add(f);
    store.set('recFilters', [...filters]);
    $$('#typeFilter button').forEach((x) => x.classList.toggle('on', filters.has(x.dataset.f)));
    stopPlayback();
    applyFilter();
  };
});

/* --- grotuvai --- */
function buildPlayers() {
  stopPlayback();
  const grid = $('#pbGrid');
  grid.innerHTML = '';
  const keys = camKeys();
  grid.className = 'pb-grid n' + keys.length;
  players = keys.map((key, i) => {
    const [dev, ch] = splitKey(key);
    const el = document.createElement('div');
    el.className = 'pb-cell';
    el.innerHTML = `<video playsinline ${i === 0 ? 'controls' : 'muted'}></video>
      <div class="pb-label"><i></i><span></span></div><div class="overlay-msg hidden"></div>`;
    $('.pb-label i', el).style.background = LANE_COLORS[i];
    $('.pb-label span', el).textContent = camName(dev, ch);
    $('.pb-label', el).classList.toggle('hidden', keys.length === 1);
    grid.append(el);
    const p = { key, dev, ch, slot: i, el, video: $('video', el), msgEl: $('.overlay-msg', el), segments: [], visible: [], groups: [], pb: null, token: 0 };
    p.video.addEventListener('timeupdate', () => onTime(p));
    if (i === 0) {
      // pagrindinio grotuvo pauzė / tęsimas / peršokimas valdo ir kitus
      p.video.addEventListener('pause', () => players.slice(1).forEach((x) => x.pb && x.video.pause()));
      p.video.addEventListener('play', () => players.slice(1).forEach((x) => x.pb && x.video.play().catch(() => {})));
      p.video.addEventListener('seeked', () => {
        if (!p.pb || players.length < 2) return;
        const at = new Date(p.pb.start.getTime() + p.video.currentTime * 1000);
        players.slice(1).forEach((x) => playOne(x, at));
      });
    }
    return p;
  });
  fillAddCam();
}

function pmsg(p, t) { p.msgEl.textContent = t || ''; p.msgEl.classList.toggle('hidden', !t); }

async function searchRecordings() {
  if (!$('#recCam').value) return;
  saveCams();
  buildPlayers();
  const seq = ++searchSeq;
  $('#recStatus').textContent = _t('rec.searching');
  $('#segList').innerHTML = '';
  $('#tlLanes').innerHTML = '';
  const date = $('#recDate').value;
  await Promise.all(players.map(async (p) => {
    try {
      p.segments = await api(`/api/recordings?device=${encodeURIComponent(p.dev)}&ch=${p.ch}&date=${date}`);
      p.error = null;
    } catch (e) { p.segments = []; p.error = e.message; }
  }));
  if (seq !== searchSeq) return;
  applyFilter();
}

function applyFilter() {
  const counts = { motion: 0, continuous: 0, alarm: 0 };
  for (const p of players) {
    for (const s of p.segments) counts[catOf(s.type)]++;
    p.visible = p.segments.filter((s) => filters.has(catOf(s.type)));
    p.groups = [];
    for (const sg of p.visible) {
      const a = parseT(sg.start); const b = parseT(sg.end);
      const last = p.groups[p.groups.length - 1];
      if (last && a - last.end <= GROUP_GAP_MS) { if (b > last.end) last.end = b; } else p.groups.push({ start: a, end: b });
    }
  }
  $$('#typeFilter button').forEach((b) => {
    $('b', b).textContent = counts[b.dataset.f] || '';
    b.classList.toggle('empty', !counts[b.dataset.f]);
  });
  renderTimeline();
  renderTable();
}

function renderTimeline() {
  const lanes = $('#tlLanes');
  lanes.innerHTML = '';
  $('#timeline').style.setProperty('--n', players.length);
  $('#timeline').classList.toggle('multi', players.length > 1);
  players.forEach((p, i) => {
    const lane = document.createElement('div');
    lane.className = 'lane';
    if (players.length > 1) lane.style.setProperty('--c', LANE_COLORS[i]);
    for (const s of p.visible) {
      const a = parseT(s.start); const b = parseT(s.end);
      const bar = document.createElement('div');
      bar.className = 's ' + catOf(s.type);
      bar.style.left = Math.max(0, posOf(a)) + '%';
      bar.style.width = (Math.min(100, posOf(b)) - Math.max(0, posOf(a))) + '%';
      lane.append(bar);
    }
    lanes.append(lane);
  });
}

function renderTable() {
  const P = players[0];
  const body = $('#segList');
  body.innerHTML = '';
  if (!P) return;
  const total = P.visible.reduce((a, s) => a + (parseT(s.end) - parseT(s.start)) / 1000, 0);
  $('#recStatus').textContent = P.error ? P.error
    : P.visible.length ? _t('rec.found', { n: P.visible.length, d: durStr(total) }) : _t('rec.noneDay');
  const frag = document.createDocumentFragment();
  for (const s of P.visible) {
    const a = parseT(s.start); const b = parseT(s.end);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${hms(a)}</td><td>${hms(b)}</td><td>${durStr((b - a) / 1000)}</td>
      <td><i class="dot ${catOf(s.type)}"></i>${esc(typeName(s.type))}</td>
      <td><button data-p>${_t('rec.watch')}</button><button data-d class="ghost">${_t('rec.download')}</button></td>`;
    $('[data-p]', tr).onclick = () => playAll(a);
    $('[data-d]', tr).onclick = () => { $('#dlFrom').value = hms(a); $('#dlTo').value = hms(b); download(); };
    frag.append(tr);
  }
  body.append(frag);
  if (P.visible.length) {
    const last = P.visible[P.visible.length - 1];
    const e = parseT(last.end);
    $('#dlFrom').value = hms(new Date(e - 5 * 60000 > parseT(last.start) ? e - 5 * 60000 : parseT(last.start)));
    $('#dlTo').value = hms(e);
  }
}

const groupAtP = (p, d) => p.groups.findIndex((g) => g.start <= d && d < g.end);

/** Kiek sekundžių nuo atkūrimo pradžios jau pakrauta naršyklėje. */
function loadedUntil(video) {
  let max = 0;
  for (let i = 0; i < video.buffered.length; i++) max = Math.max(max, video.buffered.end(i));
  return max;
}

function stopOne(p) {
  p.token++;
  if (p.pb) {
    p.pb.player && p.pb.player.destroy();
    api(`/api/stop?id=${p.pb.id}`, { method: 'POST' }).catch(() => {});
    p.pb = null;
  }
}
function stopPlayback() {
  players.forEach(stopOne);
  $('#pbClock').textContent = '';
  $('#tlCursor').classList.add('hidden');
}

/** Visas rodomas kameras paleidžia nuo to paties laiko. */
function playAll(d) {
  if (!players.length) return;
  if (!players.some((p) => groupAtP(p, d) >= 0)) {
    // šiuo laiku įrašo nėra nė vienoje kameroje – artimiausias vėlesnis
    const next = players.map((p) => (p.groups.find((g) => g.start > d) || {}).start).filter(Boolean).sort((a, b) => a - b)[0];
    if (!next) { players.forEach((p) => { stopOne(p); pmsg(p, _t('rec.noneAt')); }); return; }
    d = next;
  }
  players.forEach((p) => playOne(p, d));
}

async function playOne(p, d, retry = 0) {
  const idx = groupAtP(p, d);
  if (idx < 0) { stopOne(p); pmsg(p, _t('rec.noneAt')); return; }
  // Jau pakrautoje dalyje peršokame iškart, be naujo srauto iš NVR
  if (p.pb && p.pb.idx === idx && d >= p.pb.start) {
    const off = (d - p.pb.start) / 1000;
    if (off <= loadedUntil(p.video) - 0.5) {
      if (Math.abs(p.video.currentTime - off) > 0.3) p.video.currentTime = off;
      p.video.play().catch(() => {});
      return;
    }
  }
  stopOne(p);
  const token = p.token;
  const end = p.groups[idx].end;
  pmsg(p, _t('rec.loading'));
  try {
    const r = await api(`/api/playback?device=${encodeURIComponent(p.dev)}&ch=${p.ch}&start=${tStr(d)}&end=${tStr(end)}&slot=${p.slot}`);
    if (token !== p.token) { api(`/api/stop?id=${r.id}`, { method: 'POST' }).catch(() => {}); return; }
    p.pb = { id: r.id, start: d, idx };
    p.video.onplaying = () => pmsg(p, '');
    p.video.onended = () => {
      if (!p.pb) return;
      const next = p.groups[p.pb.idx + 1];
      if (p === masterPlayer()) { if (next) playAll(next.start); } else pmsg(p, _t('rec.noneAt'));
    };
    p.pb.player = attachHls(p.video, r.url, false, () => {
      // nutrūkus ryšiui tęsiame nuo tos vietos, kur sustojome
      if (token !== p.token || !p.pb) return;
      const at = new Date(p.pb.start.getTime() + p.video.currentTime * 1000);
      if (retry < 2) { pmsg(p, _t('rec.loading')); setTimeout(() => playOne(p, at, retry + 1), 1500); } else pmsg(p, _t('rec.broken'));
    });
  } catch (e) {
    if (e.status === 409) return; // pakeista naujesne užklausa
    if (token === p.token) pmsg(p, e.message);
  }
}

/** Laikrodį ir žymeklį valdo pirmas grojantis grotuvas. */
const masterPlayer = () => players.find((p) => p.pb) || null;
function onTime(p) {
  if (p !== masterPlayer() || !p.pb) return;
  const now = new Date(p.pb.start.getTime() + p.video.currentTime * 1000);
  $('#pbClock').textContent = `${dayStr(now)} ${hms(now)}`;
  const c = $('#tlCursor');
  c.classList.remove('hidden');
  c.style.left = posOf(now) + '%';
}

/* --- laiko juosta --- */
const tl = $('#timeline');
const timeFromEvent = (e) => {
  const r = tl.getBoundingClientRect();
  const x = Math.min(Math.max(0, e.clientX - r.left), r.width);
  return new Date(dayStart().getTime() + Math.floor(x / r.width * 86400) * 1000);
};
let clickTimer = null;
tl.addEventListener('click', (e) => {
  if (!players.some((p) => p.groups.length)) return;
  const d = timeFromEvent(e);
  const c = $('#tlCursor');
  c.classList.remove('hidden');
  c.style.left = posOf(d) + '%';
  hideThumb();
  // greitai spaudant kelis kartus, NVR prašome tik paskutinės vietos
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => playAll(d), 350);
});

/* --- miniatiūros užvedus pelę --- */
let thumbTimer = null;
let thumbAbort = null;
let thumbShown = '';
function hideThumb() {
  clearTimeout(thumbTimer);
  if (thumbAbort) { thumbAbort.abort(); thumbAbort = null; }
  $('#tlThumb').classList.add('hidden');
  tl.classList.remove('has-thumb');
}
function thumbKey(p, d) {
  const t = new Date(d.getTime() - (d.getSeconds() % 10) * 1000);
  return `/api/thumb?device=${encodeURIComponent(p.dev)}&ch=${p.ch}&t=${tStr(t)}`;
}
async function loadThumb(url) {
  if (url === thumbShown) return;
  if (thumbAbort) thumbAbort.abort();
  const ac = new AbortController();
  thumbAbort = ac;
  const box = $('#tlThumb');
  box.classList.add('loading');
  try {
    const r = await fetch(url, { signal: ac.signal, credentials: 'same-origin' });
    if (!r.ok) throw new Error(r.status);
    const blob = await r.blob();
    const img = $('img', box);
    if (img.dataset.obj) URL.revokeObjectURL(img.dataset.obj);
    img.dataset.obj = URL.createObjectURL(blob);
    img.src = img.dataset.obj;
    thumbShown = url;
    box.classList.remove('loading', 'noimg');
  } catch (e) {
    if (e.name !== 'AbortError') box.classList.remove('loading');
  }
}
tl.addEventListener('mousemove', (e) => {
  const h = $('#tlHover');
  const d = timeFromEvent(e);
  h.classList.remove('hidden');
  h.style.left = posOf(d) + '%';
  h.dataset.t = hms(d);
  const p0 = players[0];
  const box = $('#tlThumb');
  if (!me || !me.thumbnails || !p0 || groupAtP(p0, d) < 0) { hideThumb(); return; }
  const r = tl.getBoundingClientRect();
  const x = Math.min(Math.max(e.clientX - r.left, 90), r.width - 90);
  box.style.left = x + 'px';
  $('span', box).textContent = hms(d);
  const url = thumbKey(p0, d);
  if (url !== thumbShown) box.classList.add('noimg');
  else box.classList.remove('noimg');
  box.classList.remove('hidden');
  tl.classList.add('has-thumb');
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(() => loadThumb(url), 450);
});
tl.addEventListener('mouseleave', () => { $('#tlHover').classList.add('hidden'); hideThumb(); });

function download() {
  const [dev, ch] = splitCam();
  const day = $('#recDate').value;
  const a = $('#dlFrom').value; const b = $('#dlTo').value;
  if (!a || !b) { alert(_t('rec.needTime')); return; }
  const full = (t) => `${day}T${t.length === 5 ? t + ':00' : t}`;
  if (full(b) <= full(a)) { alert(_t('rec.endAfter')); return; }
  const link = document.createElement('a');
  link.href = `/api/download?device=${encodeURIComponent(dev)}&ch=${ch}&start=${full(a)}&end=${full(b)}&lang=${LANG}`;
  link.download = '';
  document.body.append(link);
  link.click();
  link.remove();
}
$('#dlBtn').onclick = download;

/* ---------------- Paleidimas ---------------- */
async function start() {
  await infoReady;
  try { me = await api('/api/me'); } catch (_) { showLogin(); return; }
  $('#whoami').textContent = me.username + (me.role === 'admin' ? ' (admin)' : '');
  $$('.admin-only').forEach((el) => el.classList.toggle('hidden', me.role !== 'admin'));
  showAlerts();
  setupIdle();
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  await loadDevices().catch((e) => { $('#deviceList').innerHTML = ''; $('#deviceList').textContent = e.message; });
  saved = saved.map((c) => (c && devices.some((d) => d.id === c.dev) ? c : null));
  buildGrid();
}
start();


/* ---------------- Nustatymai ---------------- */
const postJson = (url, body, method = 'POST') =>
  api(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let adminDevices = [];
let adminUsers = [];
let sys = null;

$$('dialog [data-close]').forEach((b) => { b.onclick = () => b.closest('dialog').close(); });

async function loadSettings() {
  if (!me || me.role !== 'admin') return;
  try {
    [adminDevices, adminUsers, sys] = await Promise.all([api('/api/admin/devices'), api('/api/admin/users'), api('/api/admin/system')]);
  } catch (e) { alert(e.message); return; }
  renderDevTable();
  renderUserTable();
  renderSystem();
  loadStorage();
  loadReport();
}

function renderDevTable() {
  const tb = $('#devTable');
  tb.innerHTML = adminDevices.length ? '' : `<tr><td colspan="6" class="muted">${_t('set.noDevices')}</td></tr>`;
  for (const d of adminDevices) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${esc(d.name)}</td><td>${_t(d.type === 'nvr' ? 'kind.nvr' : 'kind.camera')}</td>
      <td>${esc(d.host)}:${d.httpPort}</td><td>${esc(d.username)}</td><td>${_t('video.' + d.video)}${d.audio === false ? _t('noAudio') : ''}</td>
      <td><button class="ghost" data-e>${_t('edit')}</button><button class="danger" data-x>${_t('remove')}</button></td>`;
    $('[data-e]', tr).onclick = () => openDevDlg(d);
    $('[data-x]', tr).onclick = async () => {
      if (!confirm(_t('confirm.delDevice', { name: d.name }))) return;
      try { await api(`/api/admin/devices?id=${encodeURIComponent(d.id)}`, { method: 'DELETE' }); } catch (e) { alert(e.message); return; }
      await afterDeviceChange();
    };
    tb.append(tr);
  }
}

function renderUserTable() {
  const tb = $('#userTable');
  tb.innerHTML = '';
  for (const u of adminUsers) {
    const devs = u.role === 'admin' || !u.devices ? _t('all')
      : (u.devices.map((id) => (adminDevices.find((d) => d.id === id) || {}).name).filter(Boolean).join(', ') || '—');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${esc(u.username)}${u.username === me.username ? ` <span class="muted small">${_t('you')}</span>` : ''}</td>
      <td><span class="badge ${u.role === 'admin' ? 'admin' : ''}">${_t(u.role === 'admin' ? 'role.admin' : 'role.viewer')}</span></td>
      <td>${esc(devs)}</td>
      <td><button class="ghost" data-e>${_t('edit')}</button>${u.username === me.username ? '' : `<button class="danger" data-x>${_t('remove')}</button>`}</td>`;
    $('[data-e]', tr).onclick = () => openUserDlg(u);
    const x = $('[data-x]', tr);
    if (x) x.onclick = async () => {
      if (!confirm(_t('confirm.delUser', { name: u.username }))) return;
      try { await api(`/api/admin/users?username=${encodeURIComponent(u.username)}`, { method: 'DELETE' }); } catch (e) { alert(e.message); return; }
      loadSettings();
    };
    tb.append(tr);
  }
}

async function afterDeviceChange() {
  await loadDevices().catch(() => {});
  saved = saved.map((c) => (c && devices.some((d) => d.id === c.dev) ? c : null));
  store.set('tiles', saved);
  buildGrid();
  tiles.forEach(stopTile); // esame nustatymuose – vaizdo nerodome
  loadSettings();
}

/* --- įrenginio forma --- */
function devFormData() {
  const f = $('#devForm');
  const v = (n) => f.elements[n].value;
  return {
    id: v('id') || undefined, name: v('name'), type: v('type'), host: v('host'),
    httpPort: v('httpPort'), rtspPort: v('rtspPort'), username: v('username'), password: v('password'),
    video: v('video'), audio: f.elements.audio.checked,
  };
}
function openDevDlg(d) {
  const f = $('#devForm');
  f.reset();
  $('#devTest').textContent = '';
  $('#devDlgTitle').textContent = _t(d ? 'dlg.editDevice' : 'dlg.newDevice');
  f.elements.id.value = d ? d.id : '';
  f.elements.name.value = d ? d.name : '';
  f.elements.type.value = d ? d.type : 'nvr';
  f.elements.host.value = d ? d.host : '';
  f.elements.httpPort.value = d ? d.httpPort : '';
  f.elements.rtspPort.value = d ? d.rtspPort : '';
  f.elements.username.value = d ? d.username : 'admin';
  f.elements.password.value = '';
  f.elements.password.placeholder = d && d.hasPassword ? _t('unchanged') : '';
  f.elements.password.required = !d;
  f.elements.video.value = d ? d.video : 'copy';
  f.elements.audio.checked = !d || d.audio !== false;
  $('#devDlg').showModal();
}
$('#addDev').onclick = () => openDevDlg(null);
$('#devTestBtn').onclick = async () => {
  const out = $('#devTest');
  out.className = 'small muted';
  out.textContent = _t('dlg.testing');
  try {
    const r = await postJson('/api/admin/test-device', devFormData());
    out.className = 'small ' + (r.ok ? 'ok' : 'err');
    out.textContent = r.ok ? `${_t('dlg.connected')}: ${r.model || ''} ${r.name ? '(' + r.name + ')' : ''} ${r.firmware || ''}` : '✗ ' + r.error;
  } catch (e) { out.className = 'small err'; out.textContent = '✗ ' + e.message; }
};
$('#devForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await postJson('/api/admin/devices', devFormData()); } catch (err) {
    $('#devTest').className = 'small err'; $('#devTest').textContent = err.message; return;
  }
  $('#devDlg').close();
  await afterDeviceChange();
});

/* --- vartotojo forma --- */
function openUserDlg(u) {
  const f = $('#userForm');
  f.reset();
  $('#userErr').textContent = '';
  $('#userDlgTitle').textContent = _t(u ? 'dlg.editUser' : 'dlg.newUser');
  f.elements.original.value = u ? u.username : '';
  f.elements.username.value = u ? u.username : '';
  f.elements.password.value = '';
  f.elements.password.required = !u;
  f.elements.password.placeholder = u ? _t('unchanged') : _t('min6');
  f.elements.role.value = u ? u.role : 'viewer';
  f.elements.allDevices.checked = !u || !u.devices;
  f.elements.noIdleLogout.checked = !!(u && u.noIdleLogout);
  const list = $('#userDevList');
  list.innerHTML = '';
  for (const d of adminDevices) {
    const l = document.createElement('label');
    l.className = 'check';
    l.innerHTML = `<input type="checkbox" value="${esc(d.id)}"> <span></span>`;
    $('span', l).textContent = d.name;
    $('input', l).checked = !!(u && u.devices && u.devices.includes(d.id));
    list.append(l);
  }
  syncUserForm();
  $('#userDlg').showModal();
}
function syncUserForm() {
  const f = $('#userForm');
  const viewer = f.elements.role.value === 'viewer';
  $('#userDevs').classList.toggle('hidden', !viewer);
  $('#userDevList').classList.toggle('hidden', f.elements.allDevices.checked);
}
$('#userForm').elements.role.onchange = syncUserForm;
$('#userForm').elements.allDevices.onchange = syncUserForm;
$('#addUser').onclick = () => openUserDlg(null);
$('#userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = {
    original: f.elements.original.value || undefined,
    username: f.elements.username.value.trim(),
    password: f.elements.password.value || undefined,
    role: f.elements.role.value,
    devices: f.elements.allDevices.checked ? null : $$('#userDevList input:checked').map((x) => x.value),
    noIdleLogout: f.elements.noIdleLogout.checked,
  };
  try { await postJson('/api/admin/users', body); } catch (err) { $('#userErr').textContent = err.message; return; }
  $('#userDlg').close();
  if (body.original === me.username) { me = await api('/api/me'); $('#whoami').textContent = me.username + (me.role === 'admin' ? ' (admin)' : ''); }
  if (me.role !== 'admin') { location.reload(); return; }
  loadSettings();
});

/* --- savo slaptažodis --- */
$('#pwForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const msg = $('#pwMsg');
  if (f.elements.password.value !== f.elements.password2.value) { msg.className = 'small err'; msg.textContent = _t('pw.mismatch'); return; }
  try {
    await postJson('/api/password', { current: f.elements.current.value, password: f.elements.password.value });
    msg.className = 'small ok'; msg.textContent = _t('pw.changed');
    f.reset();
  } catch (err) { msg.className = 'small err'; msg.textContent = err.message; }
});


/* --- sistemos nustatymai --- */
function fillSysSelects() {
  const l = $('#sysLang');
  l.innerHTML = `<option value="auto">${esc(_t('sys.langAuto'))}</option>`
    + Object.entries(LANG_NAMES).map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('');
  $('#sysTheme').innerHTML = (window.THEMES || ['dark', 'light', 'blue', 'auto'])
    .map((th) => `<option value="${th}">${esc(_t('theme.' + th))}</option>`).join('');
}

function uptimeStr(sec) {
  return _t('up.days', { d: Math.floor(sec / 86400), h: Math.floor(sec % 86400 / 3600), m: Math.floor(sec % 3600 / 60) });
}

function renderSystem() {
  if (!sys) return;
  fillSysSelects();
  const f = $('#sysForm');
  const st = sys.settings;
  for (const k of ['siteName', 'port', 'bind', 'language', 'theme', 'sessionHours', 'idleSeconds', 'maxStreams', 'maxDownloadMinutes']) {
    f.elements[k].value = st[k];
  }
  f.elements.secureCookies.checked = st.secureCookies;
  f.elements.fastDownload.checked = st.fastDownload;
  f.elements.thumbnails.checked = st.thumbnails;
  f.elements.idleLogoutMinutes.value = st.idleLogoutMinutes;
  f.elements.webrtc.checked = st.webrtc;
  f.elements.go2rtcUrl.value = st.go2rtcUrl;
  const i = sys.info;
  const streams = i.streams.length
    ? i.streams.map((x) => `${esc(x.device)} · ${x.channel ? _t('ch.short', { n: esc(x.channel) }) + ' · ' : ''}${_t(x.live ? 'sys.live' : 'sys.playback')}`).join('<br>')
    : '0';
  const host = i.listening.bind === '0.0.0.0' || i.listening.bind === '::' ? location.hostname : i.listening.bind;
  $('#sysInfo').innerHTML = `
    <dt>${_t('sys.version')}</dt><dd>HikWeb ${esc(i.version)} · Node ${esc(i.node)} · ffmpeg ${esc(i.ffmpeg)}</dd>
    <dt>${_t('sys.uptime')}</dt><dd>${uptimeStr(i.uptime)}</dd>
    <dt>${_t('sys.listening')}</dt><dd>http://${esc(host)}:${i.listening.port} <span class="muted">(${esc(i.listening.bind)})</span></dd>
    <dt>${_t('sys.streams')}</dt><dd>${streams}</dd>
    <dt>${_t('sys.sessions')}</dt><dd>${i.sessions}</dd>
    <dt>RTSP</dt><dd>${(i.rtsp || []).map((x) => `${esc(x.name)} · ${esc(x.addr)} ${x.ok
      ? '<span class="ok">✓</span>' : `<span class="err">✗ ${esc(x.err || '')}</span>`}`).join('<br>')}</dd>
    <dt>WebRTC (go2rtc)</dt><dd>${!i.go2rtc ? _t('sys.off') : i.go2rtc.ok
      ? `<span class="ok">✓ ${_t('sys.g2rOk')}</span> · go2rtc ${esc(i.go2rtc.version)}`
      : `<span class="err">✗ ${esc(i.go2rtc.error)}</span>`}</dd>
    <dt>${_t('sys.config')}</dt><dd>${esc(i.configPath)}</dd>`;
}

$('#sysForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const msg = $('#sysMsg');
  const body = {};
  for (const k of ['siteName', 'bind', 'language', 'theme']) body[k] = f.elements[k].value;
  for (const k of ['port', 'sessionHours', 'idleSeconds', 'maxStreams', 'maxDownloadMinutes', 'idleLogoutMinutes']) body[k] = Number(f.elements[k].value);
  body.secureCookies = f.elements.secureCookies.checked;
  body.fastDownload = f.elements.fastDownload.checked;
  body.thumbnails = f.elements.thumbnails.checked;
  body.webrtc = f.elements.webrtc.checked;
  body.go2rtcUrl = f.elements.go2rtcUrl.value.trim();
  msg.className = 'small muted';
  msg.textContent = '…';
  let r;
  try { r = await postJson('/api/admin/system', body); } catch (err) { msg.className = 'small err'; msg.textContent = err.message; return; }
  applySiteName(r.settings.siteName);
  if (window.setDefaultTheme) setDefaultTheme(r.settings.theme);
  if (r.portChanged) {
    const host = ['0.0.0.0', '::'].includes(r.settings.bind) ? location.hostname : r.settings.bind;
    const url = `${location.protocol}//${host.includes(':') ? `[${host}]` : host}:${r.port}${location.pathname}`;
    msg.className = 'small ok';
    msg.textContent = _t('sys.switching', { url });
    setTimeout(() => { location.href = url; }, 2500);
    return;
  }
  msg.className = 'small ok';
  msg.textContent = _t('sys.saved');
  if (me) { me.webrtc = r.settings.webrtc; me.thumbnails = r.settings.thumbnails; rtcFailed.clear(); }
  loadSettings();
});

$('#stopAllBtn').onclick = async () => {
  try {
    const r = await api('/api/admin/stop-streams', { method: 'POST' });
    $('#stopMsg').textContent = _t('sys.stopped', { n: r.stopped });
  } catch (e) { $('#stopMsg').textContent = e.message; }
  loadSettings();
};


/* --- NVR diskai --- */
function fmtSize(mb) {
  if (mb >= 1024 * 1024) return (mb / 1024 / 1024).toFixed(2).replace(/\.?0+$/, '') + ' TB';
  if (mb >= 1024) return Math.round(mb / 1024) + ' GB';
  return Math.round(mb) + ' MB';
}
async function loadStorage(force) {
  const box = $('#diskInfo');
  box.textContent = '…';
  let list;
  try { list = await api('/api/admin/storage' + (force ? '?refresh=1' : '')); } catch (e) { box.textContent = e.message; return; }
  box.innerHTML = '';
  for (const d of list) {
    const sec = document.createElement('div');
    sec.className = 'disk-dev';
    if (list.length > 1) sec.innerHTML = `<h3>${esc(d.device)}</h3>`;
    if (d.error && !d.disks.length) {
      sec.innerHTML += `<div class="err small">${esc(_t('disk.error'))}: ${esc(d.error)}</div>`;
      box.append(sec);
      continue;
    }
    let rows = '';
    for (const k of d.disks) {
      const used = k.capacityMB - k.freeMB;
      const pct = k.capacityMB ? Math.round(used / k.capacityMB * 100) : 0;
      rows += `<tr><td>${esc(k.name)}</td>
        <td>${k.ok ? `<span class="ok">✓ ${esc(k.status)}</span>` : `<span class="err">✗ ${esc(k.status)}</span>`}</td>
        <td>${fmtSize(k.capacityMB)}</td>
        <td><div class="usebar"><i style="width:${pct}%"></i></div><span class="small muted">${fmtSize(used)} · ${pct}%</span></td></tr>`;
    }
    const total = d.disks.reduce((a, k) => a + k.capacityMB, 0);
    const free = d.disks.reduce((a, k) => a + k.freeMB, 0);
    let summary = '';
    if (d.oldest) summary += `<div>${esc(_t('disk.oldest', { d: d.oldest.replace('T', ' ') }))} · <b>${esc(_t('disk.retention', { n: Math.round(d.retentionDays) }))}</b></div>`;
    if (d.daysLeft) summary += `<div>${esc(_t('disk.daysLeft', { n: d.daysLeft }))}</div>`;
    else if (total && free < total * 0.02) summary += `<div class="muted">${esc(_t('disk.full'))}</div>`;
    sec.innerHTML += `<table class="list disk-table"><thead><tr><th>${_t('disk.name')}</th><th>${_t('disk.status')}</th><th>${_t('disk.capacity')}</th><th>${_t('disk.used')}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="disk-sum small">${summary}</div>`;
    box.append(sec);
  }
}
$('#diskRefresh').onclick = () => loadStorage(true);

function showAlerts() {
  const b = $('#alertBtn');
  const list = (me && me.alerts) || [];
  b.classList.toggle('hidden', !list.length);
  b.title = list.map((a) => _t('disk.alert', { dev: a.device, disk: a.disk, status: a.status })).join('\n');
  b.onclick = () => { switchTab('set'); setTimeout(() => $('#diskCard').scrollIntoView({ behavior: 'smooth' }), 300); };
}


/* --- Kasdienė ataskaita --- */
async function loadReport() {
  let r;
  try { r = await api('/api/admin/report'); } catch (_) { return; }
  const f = $('#repForm');
  const st = r.settings;
  f.elements.enabled.checked = st.enabled;
  f.elements.time.value = st.time;
  f.elements.onlyProblems.checked = st.onlyProblems;
  f.elements.telegramToken.value = '';
  f.elements.telegramToken.placeholder = st.hasToken ? _t('unchanged') : '123456789:AA…';
  f.elements.telegramChat.value = st.telegramChat || '';
  f.elements.webhookUrl.value = st.webhookUrl || '';
  if (r.last) showReport(r.last);
}
function showReport(rep) {
  const out = $('#repOut');
  out.textContent = rep.text;
  out.classList.remove('hidden');
  const msg = $('#repMsg');
  if (rep.sent && rep.sent.length) {
    msg.className = 'small ' + (rep.sent.every((x) => x.ok) ? 'ok' : 'err');
    msg.textContent = rep.sent.map((x) => `${x.ok ? '✓' : '✗'} ${x.to}${x.error ? ': ' + x.error : ''}`).join(' · ');
  }
}
function repBody() {
  const f = $('#repForm');
  return {
    enabled: f.elements.enabled.checked, time: f.elements.time.value, onlyProblems: f.elements.onlyProblems.checked,
    telegramToken: f.elements.telegramToken.value.trim(), telegramChat: f.elements.telegramChat.value.trim(),
    webhookUrl: f.elements.webhookUrl.value.trim(),
  };
}
$('#repForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#repMsg');
  try {
    await postJson('/api/admin/report/settings', repBody());
    msg.className = 'small ok'; msg.textContent = _t('sys.saved');
    loadReport();
  } catch (err) { msg.className = 'small err'; msg.textContent = err.message; }
});
async function runReportUi(send) {
  const msg = $('#repMsg');
  msg.className = 'small muted';
  msg.textContent = _t('rep.running');
  try {
    if (send) await postJson('/api/admin/report/settings', repBody());
    const rep = await api('/api/admin/report/run' + (send ? '?send=1' : ''), { method: 'POST' });
    msg.textContent = '';
    showReport(rep);
    if (send && (!rep.sent || !rep.sent.length)) { msg.className = 'small err'; msg.textContent = _t('rep.noTarget'); }
  } catch (err) { msg.className = 'small err'; msg.textContent = err.message; }
}
$('#repPreview').onclick = () => runReportUi(false);
$('#repSend').onclick = () => runReportUi(true);

/* --- Automatinis atsijungimas po neveiklumo --- */
let idleLimitMs = 0;
let lastInteraction = Date.now();
let lastPing = 0;
let idleTimer = null;
function setupIdle() {
  idleLimitMs = (me && me.idleLogout ? me.idleLogout : 0) * 60000;
  clearInterval(idleTimer);
  if (!idleLimitMs) return;
  lastInteraction = Date.now();
  idleTimer = setInterval(checkIdle, 1000);
}
function onInteraction() {
  if (!idleLimitMs) return;
  lastInteraction = Date.now();
  if ($('#idleDlg').open) return; // įspėjimą uždaro tik mygtukas
  if (Date.now() - lastPing > 60000) {
    lastPing = Date.now();
    api('/api/ping', { method: 'POST' }).catch(() => {});
  }
}
['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((ev) => document.addEventListener(ev, onInteraction, { passive: true, capture: true }));
function checkIdle() {
  const idle = Date.now() - lastInteraction;
  const left = Math.ceil((idleLimitMs - idle) / 1000);
  const dlg = $('#idleDlg');
  if (left <= 0) { clearInterval(idleTimer); idleLogout(); return; }
  const warnAt = Math.min(60, Math.floor(idleLimitMs / 2000)); // įspėjame likus minutei (trumpai ribai – pusei laiko)
  if (left <= warnAt) {
    $('#idleText').textContent = _t('idle.text', { s: left });
    if (!dlg.open) dlg.showModal();
  } else if (dlg.open) dlg.close();
}
$('#idleStay').onclick = () => {
  lastInteraction = Date.now();
  lastPing = Date.now();
  api('/api/ping', { method: 'POST' }).catch(() => {});
  $('#idleDlg').close();
};
async function idleLogout() {
  $('#idleDlg').open && $('#idleDlg').close();
  tiles.forEach(stopTile);
  stopPlayback();
  await api('/api/logout').catch(() => {});
  try { sessionStorage.setItem('hikweb.idleOut', '1'); } catch (_) { /* */ }
  location.reload();
}
(function idleNotice() {
  try {
    if (sessionStorage.getItem('hikweb.idleOut')) {
      sessionStorage.removeItem('hikweb.idleOut');
      const el = $('#loginErr');
      el.textContent = _t('idle.loggedOut');
      el.classList.add('info');
    }
  } catch (_) { /* */ }
}());
