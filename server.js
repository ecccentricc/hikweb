'use strict';
/*
 * HikWeb – paprastas web serveris Hikvision kameroms ir NVR peržiūrėti.
 * Be išorinių priklausomybių: reikia tik Node.js 18+ ir ffmpeg.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { AsyncLocalStorage } = require('async_hooks');

/* ------------------------------------------------------------------ */
/* Kalbos / Languages / Мови – serverio pranešimai                    */
/* ------------------------------------------------------------------ */
const LANGS = ['lt', 'en', 'uk'];
const MSG = {
  timeout: { lt: 'Įrenginys neatsako (timeout)', en: 'Device not responding (timeout)', uk: 'Пристрій не відповідає (тайм-аут)' },
  badAuth: { lt: 'blogas vartotojas/slaptažodis', en: 'wrong username/password', uk: 'неправильний логін/пароль' },
  ffmpegExit: { lt: 'ffmpeg baigė darbą ({code})', en: 'ffmpeg exited ({code})', uk: 'ffmpeg завершив роботу ({code})' },
  ffmpegStart: { lt: 'Nepavyko paleisti ffmpeg', en: 'Failed to start ffmpeg', uk: 'Не вдалося запустити ffmpeg' },
  ffmpegMissing: { lt: 'ffmpeg nerastas', en: 'ffmpeg not found', uk: 'ffmpeg не знайдено' },
  noVideoForTime: { lt: 'Įrenginys negrąžino vaizdo šiam laikui', en: 'The device returned no video for this time', uk: 'Пристрій не повернув відео за цей час' },
  notReachable: { lt: 'Vaizdas nepasiekiamas per {s} s', en: 'No video within {s} s', uk: 'Немає відео протягом {s} с' },
  noData: { lt: 'įrenginys nesiunčia vaizdo', en: 'the device is not sending video', uk: 'пристрій не передає відео' },
  startFail: { lt: 'Nepavyko paleisti vaizdo', en: 'Failed to start video', uk: 'Не вдалося запустити відео' },
  tooLarge: { lt: 'Per didelė užklausa', en: 'Request too large', uk: 'Занадто великий запит' },
  unknownDevice: { lt: 'Nežinomas įrenginys', en: 'Unknown device', uk: 'Невідомий пристрій' },
  badChannel: { lt: 'Blogas kanalas', en: 'Invalid channel', uk: 'Неправильний канал' },
  badTime: { lt: 'Blogas laikas', en: 'Invalid time', uk: 'Неправильний час' },
  badDate: { lt: 'Bloga data', en: 'Invalid date', uk: 'Неправильна дата' },
  tooManyTries: { lt: 'Per daug bandymų, palaukite minutę', en: 'Too many attempts, please wait a minute', uk: 'Забагато спроб, зачекайте хвилину' },
  wrongLogin: { lt: 'Neteisingas vartotojas arba slaptažodis', en: 'Wrong username or password', uk: 'Неправильний логін або пароль' },
  notLoggedIn: { lt: 'Neprisijungta', en: 'Not logged in', uk: 'Вхід не виконано' },
  notFound: { lt: 'Nerasta', en: 'Not found', uk: 'Не знайдено' },
  durRange: { lt: 'Trukmė turi būti nuo 1 s iki {max} min.', en: 'Duration must be between 1 s and {max} min', uk: 'Тривалість має бути від 1 с до {max} хв' },
  downloadFail: { lt: 'Nepavyko atsisiųsti', en: 'Download failed', uk: 'Не вдалося завантажити' },
  badPort: { lt: 'Blogas prievado numeris', en: 'Invalid port number', uk: 'Неправильний номер порту' },
  needName: { lt: 'Įveskite pavadinimą', en: 'Enter a name', uk: 'Введіть назву' },
  badHost: { lt: 'Blogas IP adresas arba vardas', en: 'Invalid IP address or hostname', uk: 'Неправильна IP-адреса або ім’я хоста' },
  needDevUser: { lt: 'Įveskite įrenginio vartotoją', en: 'Enter the device username', uk: 'Введіть логін пристрою' },
  needDevPass: { lt: 'Įveskite įrenginio slaptažodį', en: 'Enter the device password', uk: 'Введіть пароль пристрою' },
  needJson: { lt: 'Reikia JSON', en: 'JSON required', uk: 'Потрібен JSON' },
  badData: { lt: 'Blogi duomenys', en: 'Invalid data', uk: 'Неправильні дані' },
  pwShort: { lt: 'Slaptažodis turi būti bent 6 simbolių', en: 'Password must be at least 6 characters', uk: 'Пароль має містити щонайменше 6 символів' },
  pwLong: { lt: 'Per ilgas slaptažodis', en: 'Password is too long', uk: 'Занадто довгий пароль' },
  pwCurrentWrong: { lt: 'Neteisingas dabartinis slaptažodis', en: 'Current password is incorrect', uk: 'Неправильний поточний пароль' },
  needAdmin: { lt: 'Reikia administratoriaus teisių', en: 'Administrator rights required', uk: 'Потрібні права адміністратора' },
  deviceNotFound: { lt: 'Įrenginys nerastas', en: 'Device not found', uk: 'Пристрій не знайдено' },
  badUsername: { lt: 'Vartotojo vardas: 2–40 simbolių (raidės, skaičiai, . _ - @)', en: 'Username: 2–40 characters (letters, digits, . _ - @)', uk: 'Логін: 2–40 символів (літери, цифри, . _ - @)' },
  userNotFound: { lt: 'Vartotojas nerastas', en: 'User not found', uk: 'Користувача не знайдено' },
  userExists: { lt: 'Toks vartotojas jau yra', en: 'This user already exists', uk: 'Такий користувач уже існує' },
  lastAdmin: { lt: 'Turi likti bent vienas administratorius', en: 'At least one administrator must remain', uk: 'Має залишитися хоча б один адміністратор' },
  deleteSelf: { lt: 'Negalite ištrinti savęs', en: 'You cannot delete yourself', uk: 'Не можна видалити самого себе' },
  channel: { lt: 'Kanalas {n}', en: 'Channel {n}', uk: 'Канал {n}' },
  camera: { lt: 'Kamera', en: 'Camera', uk: 'Камера' },
  g2rDown: { lt: 'go2rtc nepasiekiamas', en: 'go2rtc is not reachable', uk: 'go2rtc недоступний' },
  badG2rUrl: { lt: 'Blogas go2rtc adresas (pvz. http://127.0.0.1:1984)', en: 'Invalid go2rtc address (e.g. http://127.0.0.1:1984)', uk: 'Неправильна адреса go2rtc (напр. http://127.0.0.1:1984)' },
  rtspDown: { lt: 'NVR nepriima vaizdo jungčių ({host}:{port}, {err}). Patikrinkite RTSP prievadą arba perkraukite NVR.', en: 'The NVR is not accepting video connections ({host}:{port}, {err}). Check the RTSP port or reboot the NVR.', uk: 'NVR не приймає відеопідключення ({host}:{port}, {err}). Перевірте RTSP-порт або перезавантажте NVR.' },
  pbLimit: { lt: 'NVR vienu metu leidžia atkurti tik {n} įrašą(-us), o kitas jau rodomas. Uždarykite kitą kamerą arba žiūrėkite po vieną.', en: 'The NVR can play back only {n} recording(s) at a time and another one is already playing. Close the other camera or watch one at a time.', uk: 'NVR може відтворювати лише {n} запис(и) одночасно, а інший уже відтворюється. Закрийте іншу камеру або дивіться по одній.' },
  durHM: { lt: '{h} h {m} min', en: '{h} h {m} min', uk: '{h} год {m} хв' },
  rpTitle: { lt: 'HikWeb ataskaita – {date}', en: 'HikWeb report – {date}', uk: 'Звіт HikWeb – {date}' },
  rpAllOk: { lt: '✅ Viskas gerai', en: '✅ All good', uk: '✅ Усе гаразд' },
  rpProblems: { lt: '⚠️ Rasta problemų: {n}', en: '⚠️ Problems found: {n}', uk: '⚠️ Знайдено проблем: {n}' },
  rpDevUnreach: { lt: 'Įrenginys nepasiekiamas', en: 'Device unreachable', uk: 'Пристрій недоступний' },
  rpRtspDown: { lt: 'Vaizdo (RTSP) prievadas nepasiekiamas ({err})', en: 'Video (RTSP) port unreachable ({err})', uk: 'Відеопорт (RTSP) недоступний ({err})' },
  rpCamOffline: { lt: 'kamera neprisijungusi', en: 'camera offline', uk: 'камера не в мережі' },
  rpNoRec: { lt: 'per 24 val. įrašų nėra', en: 'no recordings in 24 h', uk: 'немає записів за 24 год' },
  rpRec: { lt: 'įrašyta {h}, paskutinis {last}', en: 'recorded {h}, last {last}', uk: 'записано {h}, останній {last}' },
  rpDisk: { lt: '{name}: {status}, užimta {pct}% iš {cap}', en: '{name}: {status}, {pct}% of {cap} used', uk: '{name}: {status}, зайнято {pct}% з {cap}' },
  rpDiskBad: { lt: 'Diskas {name} su klaida: {status}', en: 'Disk {name} has an error: {status}', uk: 'Диск {name} з помилкою: {status}' },
  rpRetention: { lt: 'Įrašų archyvas: ≈ {n} d. (nuo {d})', en: 'Recording archive: ≈ {n} days (since {d})', uk: 'Архів записів: ≈ {n} дн. (з {d})' },
  rpDaysLeft: { lt: 'Vietos užteks dar ≈ {n} d.', en: 'Space left for ≈ {n} more days', uk: 'Місця вистачить ще на ≈ {n} дн.' },
  rpBadUrl: { lt: 'Blogas webhook adresas', en: 'Invalid webhook URL', uk: 'Неправильна адреса webhook' },
  rpBadToken: { lt: 'Blogas Telegram boto raktas (pvz. 123456:ABC-DEF…)', en: 'Invalid Telegram bot token (e.g. 123456:ABC-DEF…)', uk: 'Неправильний токен Telegram-бота (напр. 123456:ABC-DEF…)' },
  'disk.error': { lt: 'Nepavyko gauti disko informacijos', en: 'Could not read disk information', uk: 'Не вдалося отримати дані диска' },
  camOffline: { lt: 'Kamera neprisijungusi', en: 'Camera is offline', uk: 'Камера не в мережі' },
  deviceOffline: { lt: 'Įrenginys nepasiekiamas', en: 'Device unreachable', uk: 'Пристрій недоступний' },
  portInUse: { lt: 'Prievadas {port} jau užimtas kitos programos', en: 'Port {port} is already used by another program', uk: 'Порт {port} уже зайнятий іншою програмою' },
  portDenied: { lt: 'Nėra teisių naudoti prievadą {port} (prievadams iki 1024 reikia papildomų teisių)', en: 'No permission to use port {port} (ports below 1024 need extra rights)', uk: 'Немає дозволу на порт {port} (портам до 1024 потрібні додаткові права)' },
  portFail: { lt: 'Nepavyko užimti prievado {port}', en: 'Could not open port {port}', uk: 'Не вдалося відкрити порт {port}' },
  badRange: { lt: '„{name}“ turi būti nuo {min} iki {max}', en: '"{name}" must be between {min} and {max}', uk: '«{name}» має бути від {min} до {max}' },
  badBind: { lt: 'Blogas klausymosi adresas', en: 'Invalid listen address', uk: 'Неправильна адреса прослуховування' },
  'f.idleLogout': { lt: 'Atjungti po neveiklumo', en: 'Log out after inactivity', uk: 'Вихід після бездіяльності' },
  'f.port': { lt: 'Prievadas', en: 'Port', uk: 'Порт' },
  'f.sessionHours': { lt: 'Sesijos trukmė', en: 'Session length', uk: 'Тривалість сесії' },
  'f.idleSeconds': { lt: 'Srauto sustabdymas', en: 'Stream idle timeout', uk: 'Зупинка потоку' },
  'f.maxStreams': { lt: 'Daugiausia srautų', en: 'Max streams', uk: 'Максимум потоків' },
  'f.maxDownloadMinutes': { lt: 'Ilgiausias atsisiuntimas', en: 'Max download length', uk: 'Найдовше завантаження' },
};
const reqCtx = new AsyncLocalStorage();
const defLang = () => (LANGS.includes(config.language) ? config.language : 'lt');
/** Išverčia pranešimą į dabartinės užklausos kalbą. */
function T(key, vars = {}) {
  const lang = (reqCtx.getStore() || {}).lang || defLang();
  const m = MSG[key];
  if (!m) return key;
  return (m[lang] || m.lt).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
/** Kalba: ?lang=, X-Lang antraštė, naršyklės Accept-Language, config.language. */
function langOf(req) {
  const u = new URL(req.url, 'http://x');
  const want = [u.searchParams.get('lang'), req.headers['x-lang'],
    ...String(req.headers['accept-language'] || '').split(',').map((x) => x.trim().slice(0, 2))];
  return want.map((x) => String(x || '').toLowerCase()).find((x) => LANGS.includes(x)) || defLang();
}


const ROOT = __dirname;
const CONFIG_PATH = process.env.HIKWEB_CONFIG || path.join(ROOT, 'config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const VERSION = '1.8.2';
const STARTED = Date.now();
const FFMPEG = config.ffmpegPath || 'ffmpeg';
const HLS_DIR = path.join(config.tempDir || path.join(require('os').tmpdir(), 'hikweb'), 'hls');
// Nustatymai, kuriuos galima keisti per web – skaitomi kiekvieną kartą iš config
const cfg = {
  get idleMs() { return (config.idleSeconds || 30) * 1000; },
  get maxStreams() { return config.maxStreams || 16; },
  get maxDownloadSec() { return (config.maxDownloadMinutes || 120) * 60; },
  get sessionMs() { return (config.sessionHours || 12) * 3600 * 1000; },
};

fs.rmSync(HLS_DIR, { recursive: true, force: true });
fs.mkdirSync(HLS_DIR, { recursive: true });

const devices = new Map();
function normDevice(d) {
  return {
    type: 'camera', httpPort: 80, rtspPort: 554, video: 'copy', ...d, id: String(d.id),
  };
}
function loadDevicesFromConfig() {
  devices.clear();
  for (const d of config.devices || []) devices.set(String(d.id), normDevice(d));
}
loadDevicesFromConfig();

/** Įrašo config.json (pakeitimai iš web sąsajos). */
function saveConfig() {
  const tmp = CONFIG_PATH + '.tmp';
  const text = JSON.stringify(config, null, 2) + '\n';
  try {
    fs.writeFileSync(tmp, text, { mode: 0o600 });
    fs.renameSync(tmp, CONFIG_PATH);
  } catch (_) {
    // pvz. Docker atveju, kai failas prijungtas atskirai – rašome tiesiai
    try { fs.rmSync(tmp, { force: true }); } catch (__) { /* */ }
    fs.writeFileSync(CONFIG_PATH, text);
  }
}

/* ------------------------------------------------------------------ */
/* Vartotojai ir prisijungimas prie web                                */
/* ------------------------------------------------------------------ */
config.users = config.users || [];
// senesniuose config failuose vartotojai be rolės laikomi administratoriais
for (const u of config.users) if (!u.role) u.role = 'admin';

const sessions = new Map(); // token -> {username, expires}
const loginFails = new Map(); // ip -> {count, until}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
const findUser = (name) => config.users.find((x) => x.username === name);
/** Grąžina vartotojo objektą (iš config) arba null. Ištrintas vartotojas iškart netenka prieigos. */
function currentUser(req) {
  const t = parseCookies(req).hikweb;
  const s = t && sessions.get(t);
  if (!s) return null;
  if (s.expires < Date.now()) { sessions.delete(t); return null; }
  const u = findUser(s.username);
  if (!u) { sessions.delete(t); return null; }
  // automatinis atsijungimas po neveiklumo (aktyvumą praneša naršyklė per /api/ping)
  const idle = idleLogoutMs(u);
  if (!s.lastActive) s.lastActive = Date.now();
  if (idle && Date.now() - s.lastActive > idle + 30000) { sessions.delete(t); return null; }
  return u;
}
/** Neveiklumo riba milisekundėmis (0 – išjungta arba vartotojui netaikoma). */
const idleLogoutMs = (u) => (u && !u.noIdleLogout && config.idleLogoutMinutes > 0 ? config.idleLogoutMinutes * 60000 : 0);
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
function hashPassword(pass) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt:${salt}:${crypto.scryptSync(pass, salt, 32).toString('hex')}`;
}
function checkPassword(user, pass) {
  const u = findUser(user);
  if (!u) { crypto.scryptSync(pass, 'x', 32); return false; }
  if (u.passwordHash) {
    const [, salt, hash] = u.passwordHash.split(':');
    return safeEqual(crypto.scryptSync(pass, salt, 32).toString('hex'), hash);
  }
  if (u.passwordSha256) {
    return safeEqual(crypto.createHash('sha256').update(pass).digest('hex'), u.passwordSha256.toLowerCase());
  }
  return u.password !== undefined && safeEqual(pass, u.password);
}
/** Seną (atviru tekstu) slaptažodį pakeičia saugia maiša. */
function upgradePassword(u, pass) {
  if (u.passwordHash) return;
  u.passwordHash = hashPassword(pass);
  delete u.password;
  delete u.passwordSha256;
  try { saveConfig(); } catch (e) { console.warn('Nepavyko įrašyti config.json:', e.message); }
}
const canSee = (u, devId) => u.role === 'admin' || !Array.isArray(u.devices) || u.devices.includes(devId);
const publicUser = (u) => ({ username: u.username, role: u.role, devices: Array.isArray(u.devices) ? u.devices : null, noIdleLogout: !!u.noIdleLogout });

/* ------------------------------------------------------------------ */
/* ISAPI užklausos su Digest / Basic autentifikacija                   */
/* ------------------------------------------------------------------ */
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const digestCache = new Map(); // deviceId -> challenge

function rawRequest(dev, method, uri, body, authHeader) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (authHeader) headers.Authorization = authHeader;
    if (body) {
      headers['Content-Type'] = 'application/xml';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request({
      host: dev.host, port: dev.httpPort, method, path: uri, headers, timeout: 15000,
    }, resolve);
    req.on('timeout', () => req.destroy(new Error(T('timeout'))));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function parseChallenge(h) {
  const out = {};
  h.replace(/^Digest\s+/i, '').replace(/(\w+)=("([^"]*)"|([^,\s]*))/g, (_, k, __, q, u) => {
    out[k.toLowerCase()] = q !== undefined ? q : u;
  });
  return out;
}

function digestHeader(dev, ch, method, uri) {
  ch.nc = (ch.nc || 0) + 1;
  const nc = ch.nc.toString(16).padStart(8, '0');
  const cnonce = crypto.randomBytes(8).toString('hex');
  const ha1 = md5(`${dev.username}:${ch.realm}:${dev.password}`);
  const ha2 = md5(`${method}:${uri}`);
  const qop = ch.qop ? ch.qop.split(',')[0].trim() : null;
  const response = qop
    ? md5(`${ha1}:${ch.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${ch.nonce}:${ha2}`);
  let h = `Digest username="${dev.username}", realm="${ch.realm}", nonce="${ch.nonce}", uri="${uri}", response="${response}"`;
  if (ch.opaque) h += `, opaque="${ch.opaque}"`;
  if (qop) h += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
  if (ch.algorithm) h += `, algorithm=${ch.algorithm}`;
  return h;
}

/** Grąžina http.IncomingMessage (srautą). Sėkmės atveju statusas 2xx. */
async function isapiStream(dev, method, uri, body) {
  let ch = digestCache.get(dev.id);
  let res = await rawRequest(dev, method, uri, body, ch ? digestHeader(dev, ch, method, uri) : null);
  if (res.statusCode === 401) {
    res.resume();
    const www = [].concat(res.headers['www-authenticate'] || []);
    const dig = www.find((w) => /^digest/i.test(w));
    let auth;
    if (dig) {
      ch = parseChallenge(dig);
      digestCache.set(dev.id, ch);
      auth = digestHeader(dev, ch, method, uri);
    } else {
      auth = 'Basic ' + Buffer.from(`${dev.username}:${dev.password}`).toString('base64');
    }
    res = await rawRequest(dev, method, uri, body, auth);
  }
  return res;
}

async function isapi(dev, method, uri, body) {
  const res = await isapiStream(dev, method, uri, body);
  const chunks = [];
  for await (const c of res) chunks.push(c);
  const text = Buffer.concat(chunks).toString('utf8');
  if (res.statusCode >= 300) {
    const err = new Error(`ISAPI ${uri}: HTTP ${res.statusCode}` + (res.statusCode === 401 ? ` (${T('badAuth')})` : ''));
    err.status = 502;
    throw err;
  }
  return text;
}

const xmlUnescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? xmlUnescape(m[1].trim()) : null;
};
const tagsAll = (xml, name) => xml.match(new RegExp(`<${name}[^>]*>[\\s\\S]*?</${name}>`, 'g')) || [];

/* ------------------------------------------------------------------ */
/* Kanalai                                                             */
/* ------------------------------------------------------------------ */
const channelCache = new Map();

async function getChannels(dev) {
  if (Array.isArray(dev.channels) && dev.channels.length) {
    return dev.channels.map((c) => (typeof c === 'number' ? { id: c, name: T('channel', { n: c }) } : { id: +c.id, name: c.name || T('channel', { n: c.id }) }));
  }
  const cached = channelCache.get(dev.id);
  if (cached && cached.t > Date.now() - 300000) return nameChannels(dev, cached.list);
  let list = [];
  if (dev.type === 'nvr') {
    try {
      const xml = await isapi(dev, 'GET', '/ISAPI/ContentMgmt/InputProxy/channels');
      list = tagsAll(xml, 'InputProxyChannel').map((x) => ({ id: +tag(x, 'id'), name: tag(x, 'name') || null }));
    } catch (e) {
      console.warn(`[${dev.id}] nepavyko gauti kanalų sąrašo:`, e.message);
    }
    if (!list.length) list = Array.from({ length: dev.channelCount || 8 }, (_, i) => ({ id: i + 1, name: null }));
  } else {
    let name = dev.name;
    try { name = tag(await isapi(dev, 'GET', '/ISAPI/System/Video/inputs/channels/1'), 'name') || name; } catch (_) { /* nesvarbu */ }
    list = [{ id: 1, name: name || null }];
  }
  channelCache.set(dev.id, { t: Date.now(), list });
  return nameChannels(dev, list);
}
/* ------------------------------------------------------------------ */
/* Kamerų būsena (prisijungusi / neprisijungusi)                       */
/* ------------------------------------------------------------------ */
const statusCache = new Map(); // devId -> {t, reachable, online: Map(ch -> bool)}
const STATUS_TTL = 30000;

/** Grąžina {reachable, online: Map}. Klaidos atveju būsena nežinoma (null). */
async function getStatus(dev, force) {
  const c = statusCache.get(dev.id);
  if (!force && c && Date.now() - c.t < STATUS_TTL) return c;
  if (c && c.pending) return c.pending;
  const pending = (async () => {
    const st = { t: Date.now(), reachable: null, online: new Map() };
    try {
      if (dev.type === 'nvr') {
        const xml = await isapi(dev, 'GET', '/ISAPI/ContentMgmt/InputProxy/channels/status');
        st.reachable = true;
        for (const x of tagsAll(xml, 'InputProxyChannelStatus')) {
          const id = +tag(x, 'id');
          const on = tag(x, 'online');
          if (id && on !== null) st.online.set(id, on === 'true');
        }
      } else {
        await isapi(dev, 'GET', '/ISAPI/System/deviceInfo');
        st.reachable = true;
        st.online.set(1, true);
      }
    } catch (e) {
      // 401/404 ir pan. – įrenginys atsako, tik būsenos sužinoti nepavyko
      st.reachable = /HTTP \d{3}/.test(e.message) ? true : false;
      if (!st.reachable && dev.type !== 'nvr') st.online.set(1, false);
    }
    statusCache.set(dev.id, st);
    return st;
  })();
  if (c) c.pending = pending; else statusCache.set(dev.id, { t: 0, reachable: null, online: new Map(), pending });
  return pending;
}
/** true / false / null (nežinoma) */
async function channelOnline(dev, ch) {
  const st = await getStatus(dev);
  if (st.reachable === false) return false;
  return st.online.has(ch) ? st.online.get(ch) : null;
}

const nameChannels = (dev, list) => list.map((c) => ({ id: c.id, name: c.name || (dev.type === 'nvr' ? T('channel', { n: c.id }) : T('camera')) }));

/* ------------------------------------------------------------------ */
/* Laikas                                                              */
/* ------------------------------------------------------------------ */
// Naršyklė siunčia vietinį (įrenginio) laiką formatu YYYY-MM-DDTHH:MM:SS
const TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const toRtspTime = (t) => t.replace(/[-:]/g, '') + 'Z';
function addSeconds(t, s) {
  const d = new Date(t + 'Z');
  d.setUTCSeconds(d.getUTCSeconds() + s);
  return d.toISOString().slice(0, 19);
}
const diffSeconds = (a, b) => (new Date(b + 'Z') - new Date(a + 'Z')) / 1000;

/* ------------------------------------------------------------------ */
/* RTSP adresai                                                        */
/* ------------------------------------------------------------------ */
function rtspAuth(dev) {
  return `${encodeURIComponent(dev.username)}:${encodeURIComponent(dev.password)}@${dev.host}:${dev.rtspPort}`;
}
const liveUrl = (dev, ch, stream) => `rtsp://${rtspAuth(dev)}/Streaming/Channels/${ch}0${stream}`;
const playbackUrl = (dev, ch, start, end) =>
  `rtsp://${rtspAuth(dev)}/Streaming/tracks/${ch}01/?starttime=${toRtspTime(start)}&endtime=${toRtspTime(end)}`;

function videoArgs(dev) {
  if (dev.video === 'transcode') {
    return ['-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency', '-crf', '23', '-g', '50', '-pix_fmt', 'yuv420p'];
  }
  if (dev.video === 'h265') return ['-c:v', 'copy', '-tag:v', 'hvc1'];
  return ['-c:v', 'copy'];
}
const audioArgs = (dev) => (dev.audio === false || dev.noAudio
  ? ['-an']
  : ['-map', '0:a:0?', '-c:a', 'aac', '-ar', '16000', '-b:a', '48k']);

/* ------------------------------------------------------------------ */
/* ffmpeg -> HLS sesijos                                               */
/* ------------------------------------------------------------------ */
const streams = new Map(); // id -> {id, key, proc, dir, last, ready, error}
const noSubStream = new Set(); // 'dev:ch' be papildomo srauto

/* Uždaromi srautai pagal įrenginį: kol NVR neatlaisvino seno srauto, naujo atkūrimo nepradedame. */
const closing = new Map(); // devId -> Set<Promise>
const pbGen = new Map(); // 'sesija#vieta' -> paskutinės atkūrimo užklausos numeris

/** Tvarkingai sustabdo ffmpeg: SIGTERM leidžia išsiųsti RTSP TEARDOWN, todėl NVR iškart atlaisvina srautą. */
function stopStream(id) {
  const s = streams.get(id);
  if (!s) return Promise.resolve();
  streams.delete(id);
  s.stopped = true;
  const done = new Promise((resolve) => {
    if (s.exited) return resolve();
    const kill = setTimeout(() => { try { s.proc.kill('SIGKILL'); } catch (_) { /* */ } }, 3000);
    s.proc.once('exit', () => { clearTimeout(kill); resolve(); });
    try { s.proc.kill('SIGTERM'); } catch (_) { clearTimeout(kill); resolve(); }
  }).then(() => sleep(300)); // NVR reikia akimirkos atlaisvinti sesiją
  if (!closing.has(s.devId)) closing.set(s.devId, new Set());
  const set = closing.get(s.devId);
  set.add(done);
  done.then(() => {
    set.delete(done);
    fs.rm(s.dir, { recursive: true, force: true }, () => {});
  });
  return done;
}
/** Palaukia, kol bus uždaryti visi šio įrenginio stabdomi srautai. */
const waitClosed = (devId) => Promise.all([...(closing.get(devId) || [])]);

function startHls(key, dev, inputUrl, live, owner) {
  for (const s of streams.values()) {
    if (s.key === key && !s.error) { s.last = Date.now(); return s; }
  }
  if (streams.size >= cfg.maxStreams) {
    // atlaisviname seniausiai naudotą
    const oldest = [...streams.values()].sort((a, b) => a.last - b.last)[0];
    stopStream(oldest.id);
  }
  const id = crypto.randomBytes(8).toString('hex');
  const dir = path.join(HLS_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  const args = [
    '-hide_banner', '-loglevel', 'warning', '-nostdin',
    '-rtsp_transport', 'tcp', '-timeout', live ? '10000000' : '30000000',
    '-fflags', '+genpts', '-i', inputUrl,
    '-map', '0:v:0', ...audioArgs(dev), ...videoArgs(dev),
    '-f', 'hls', '-hls_time', '2', '-hls_segment_type', 'fmp4',
    '-hls_fmp4_init_filename', 'init.mp4',
    '-hls_segment_filename', path.join(dir, 'seg%05d.m4s'),
  ];
  if (live) args.push('-hls_list_size', '6', '-hls_flags', 'delete_segments+independent_segments');
  else args.push('-hls_list_size', '0', '-hls_playlist_type', 'event', '-hls_flags', 'independent_segments');
  args.push(path.join(dir, 'index.m3u8'));

  const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const s = { id, key, proc, dir, devId: dev.id, live, owner, withAudio: !(dev.audio === false || dev.noAudio), created: Date.now(), last: Date.now(), error: null, log: '' };
  proc.stderr.on('data', (d) => { s.log = (s.log + d).slice(-1500); });
  proc.on('error', (e) => { s.error = T('ffmpegStart') + ': ' + e.message; });
  const masked = inputUrl.replace(/rtsp:\/\/[^@\s]*@/g, 'rtsp://***@');
  console.log(`[${dev.id}] ffmpeg start ${id}: ${masked}`);
  proc.on('exit', (code, signal) => {
    if (code && !s.error) s.error = T('ffmpegExit', { code }) + ': ' + s.log.replace(/rtsp:\/\/[^@\s]*@/g, 'rtsp://***@').trim();
    s.exited = true;
    s.exitInfo = signal ? `signal ${signal}` : `code ${code}`;
    if (!s.stopped) {
      console.warn(`[${dev.id}] ffmpeg ${id} baigė darbą (${s.exitInfo}, ${Math.round((Date.now() - s.created) / 1000)} s, ready=${!!s.ready}): ${masked}`
        + (s.log.trim() ? '\n  ' + s.log.replace(/rtsp:\/\/[^@\s]*@/g, 'rtsp://***@').trim().split('\n').slice(-6).join('\n  ') : ''));
    }
  });
  streams.set(id, s);
  return s;
}

async function waitReady(s, ms = 20000) {
  const file = path.join(s.dir, 'index.m3u8');
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fs.existsSync(file)) { s.ready = true; s.last = Date.now(); return true; }
    if (s.error || s.exited) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  const clean = (t) => t.replace(/rtsp:\/\/[^@\s]*@/g, 'rtsp://***@').trim();
  const external = !!s.stopped; // sustabdė kita užklausa (pvz. naujesnis paspaudimas laiko juostoje)
  let err = s.error;
  if (!err && s.exited) err = T('noVideoForTime') + ` (${s.exitInfo || '?'}${external ? ', stopped' : ''})` + (s.log ? ': ' + clean(s.log) : '');
  if (!err) err = T('notReachable', { s: Math.round(ms / 1000) }) + (s.log ? ': ' + clean(s.log) : ` (${T('noData')})`);
  stopStream(s.id);
  throw Object.assign(new Error(err), { status: 502, superseded: external });
}

/** NVR riboja išeinantį srautą (klaida 453) – sustabdome šio įrenginio tiesioginius srautus. */
function freeBandwidth(dev) {
  let n = 0;
  for (const s of [...streams.values()]) if (s.devId === dev.id && s.live) { stopStream(s.id); n++; }
  return n;
}
const isBandwidthErr = (msg) => /453|Not Enough Bandwidth/i.test(msg || '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isAudioErr = (msg) => /no decoder found|Decoding requested|aist#|Audio encoding failed|Could not find codec parameters for stream \d+ \(Audio|Audio: none/i.test(msg || '');

/** Paleidžia HLS; jei sugadintas garso takelis – kartoja be garso, jei 453 – atlaisvina srautą. */
/* NVR atkūrimo riba: kiek įrašų vienu metu NVR leidžia atkurti (išmokstama iš klaidos 453) */
const pbLimits = new Map(); // devId -> {n, t}
function activePlaybacks(dev, exceptId) {
  return [...streams.values()].filter((x) => x.devId === dev.id && !x.live && x.id !== exceptId && (x.ready || x.thumb)).length;
}
function learnPbLimit(dev, n) {
  const old = pbLimits.get(dev.id);
  if (!old || old.n !== n) console.warn(`[${dev.id}] NVR vienu metu leidžia atkurti ${n} įr.`);
  pbLimits.set(dev.id, { n, t: Date.now() });
}
/** Žinoma riba (pamirštama po valandos – gal NVR buvo užimtas kitų klientų). */
function pbLimit(dev) {
  const l = pbLimits.get(dev.id);
  if (!l) return Infinity;
  if (Date.now() - l.t > 3600000) { pbLimits.delete(dev.id); return Infinity; }
  return l.n;
}

/* RTSP prievado patikra: jei NVR nepriima jungčių, ffmpeg nepaleidžiame (kad neapkrautume NVR dar labiau) */
const rtspCheck = new Map(); // devId -> {t, ok, err, pending}
function rtspReachable(dev) {
  const c = rtspCheck.get(dev.id);
  if (c && (c.pending || Date.now() - c.t < (c.ok ? 15000 : 20000))) return c.pending || Promise.resolve(c);
  const pending = new Promise((resolve) => {
    const sock = require('net').connect({ host: dev.host, port: dev.rtspPort });
    const done = (ok, err) => {
      sock.destroy();
      const st = { t: Date.now(), ok, err };
      rtspCheck.set(dev.id, st);
      if (!ok) console.warn(`[${dev.id}] RTSP prievadas ${dev.host}:${dev.rtspPort} nepasiekiamas (${err})`);
      resolve(st);
    };
    sock.setTimeout(4000, () => done(false, 'timeout'));
    sock.once('connect', () => done(true));
    sock.once('error', (e) => done(false, e.code || e.message));
  });
  rtspCheck.set(dev.id, { ...(c || {}), pending });
  return pending;
}
async function requireRtsp(dev) {
  const st = await rtspReachable(dev);
  if (!st.ok) throw Object.assign(httpErr(503, T('rtspDown', { host: dev.host, port: dev.rtspPort, err: st.err })), { rtspDown: true });
}

async function openHls(makeKey, dev, makeUrl, live, timeout, owner) {
  await requireRtsp(dev);
  const maxTries = 4;
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const s = startHls(makeKey(), dev, makeUrl(), live, owner);
    try {
      await waitReady(s, timeout);
      return s;
    } catch (e) {
      if (e.superseded) throw e; // sustabdyta naujesnės užklausos – nekartojame
      if (/Connection refused|No route to host|Connection timed out/i.test(e.message)) {
        rtspCheck.delete(dev.id);
        await requireRtsp(dev); // jei prievadas tikrai uždarytas – aiškus pranešimas
      }
      if (isAudioErr(e.message) && s.withAudio) {
        console.warn(`[${dev.id}] garso takelis nepalaikomas – rodoma be garso`);
        dev.noAudio = true;
        continue;
      }
      if (isBandwidthErr(e.message) && !live) {
        // Jei tuo metu jau groja kitas šio NVR įrašas – tai NVR atkūrimo riba, o ne laikina klaida
        const others = activePlaybacks(dev, s.id);
        if (others > 0) {
          learnPbLimit(dev, others);
          throw Object.assign(httpErr(429, T('pbLimit', { n: others })), { pbLimit: true });
        }
      }
      if (isBandwidthErr(e.message) && attempt < maxTries - 1) {
        // NVR dar neatlaisvino ankstesnio srauto: atlaisviname tiesioginius srautus ir bandome po truputį vėliau
        freeBandwidth(dev);
        await waitClosed(dev.id);
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw Object.assign(new Error(T('startFail')), { status: 502 });
}

setInterval(() => {
  const now = Date.now();
  for (const s of streams.values()) {
    // dar atidaromo srauto (laukiama NVR atsakymo) nestabdome
    if (!s.ready && now - s.created < 90000) continue;
    if (now - s.last > cfg.idleMs) stopStream(s.id);
  }
}, 5000).unref();

/* ------------------------------------------------------------------ */
/* Įrašų paieška                                                       */
/* ------------------------------------------------------------------ */
async function searchRecordings(dev, ch, start, end) {
  const out = [];
  let pos = 0;
  const searchId = crypto.randomUUID().toUpperCase();
  for (let page = 0; page < 50; page++) {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<CMSearchDescription>
<searchID>${searchId}</searchID>
<trackList><trackID>${ch}01</trackID></trackList>
<timeSpanList><timeSpan><startTime>${start}Z</startTime><endTime>${end}Z</endTime></timeSpan></timeSpanList>
<maxResults>100</maxResults>
<searchResultPostion>${pos}</searchResultPostion>
<metadataList><metadataDescriptor>//recordType.meta.std-cgi.com</metadataDescriptor></metadataList>
</CMSearchDescription>`;
    const xml = await isapi(dev, 'POST', '/ISAPI/ContentMgmt/search', body);
    const items = tagsAll(xml, 'searchMatchItem');
    for (const it of items) {
      const st = (tag(it, 'startTime') || '').slice(0, 19);
      const en = (tag(it, 'endTime') || '').slice(0, 19);
      if (!TIME_RE.test(st) || !TIME_RE.test(en)) continue;
      const meta = tag(it, 'metadataDescriptor') || '';
      const type = (meta.match(/recordType\.meta\.(?:std-cgi|hikvision)\.com\/(\w+)/) || [])[1] || '';
      out.push({ start: st, end: en, type });
    }
    pos += items.length;
    const status = tag(xml, 'responseStatusStrg');
    if (status !== 'MORE' || !items.length) break;
  }
  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

/* ------------------------------------------------------------------ */
/* HTTP pagalbinės                                                     */
/* ------------------------------------------------------------------ */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json',
  '.m3u8': 'application/vnd.apple.mpegurl', '.m4s': 'video/iso.segment', '.mp4': 'video/mp4',
};
function json(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(b);
}
async function readBody(req, limit = 100000) {
  let b = '';
  for await (const c of req) { b += c; if (b.length > limit) throw new Error(T('tooLarge')); }
  return b;
}
function getDevice(q, user) {
  const dev = devices.get(String(q.get('device')));
  if (!dev || !canSee(user, dev.id)) throw Object.assign(new Error(T('unknownDevice')), { status: 404 });
  return dev;
}
function getChannel(q) {
  const ch = parseInt(q.get('ch'), 10);
  if (!(ch >= 1 && ch <= 256)) throw Object.assign(new Error(T('badChannel')), { status: 400 });
  return ch;
}
function getTime(q, name) {
  const t = q.get(name);
  if (!TIME_RE.test(t || '')) throw Object.assign(new Error(`${T('badTime')}: ${name}`), { status: 400 });
  return t;
}
function serveFile(res, file, extraHeaders = {}) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end(T('notFound')); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size, ...extraHeaders });
    fs.createReadStream(file).pipe(res);
  });
}

/* ------------------------------------------------------------------ */
/* Maršrutai                                                           */
/* ------------------------------------------------------------------ */
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const q = url.searchParams;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // --- prisijungimas ---
  if (p === '/api/login' && req.method === 'POST') {
    const ip = req.socket.remoteAddress;
    const f = loginFails.get(ip);
    if (f && f.until > Date.now()) return json(res, 429, { error: T('tooManyTries') });
    let data = {};
    try { data = JSON.parse(await readBody(req)); } catch (_) { /* */ }
    if (!checkPassword(String(data.username || ''), String(data.password || ''))) {
      const c = (f && f.until > Date.now() - 60000 ? f.count : 0) + 1;
      loginFails.set(ip, { count: c, until: c >= 5 ? Date.now() + 60000 : 0 });
      return json(res, 401, { error: T('wrongLogin') });
    }
    loginFails.delete(ip);
    upgradePassword(findUser(data.username), String(data.password));
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { username: data.username, expires: Date.now() + cfg.sessionMs, lastActive: Date.now() });
    const secure = config.secureCookies ? '; Secure' : '';
    res.setHeader('Set-Cookie', `hikweb=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.round(cfg.sessionMs / 1000)}${secure}`);
    return json(res, 200, { ok: true, user: data.username });
  }
  if (p === '/api/logout') {
    sessions.delete(parseCookies(req).hikweb);
    res.setHeader('Set-Cookie', 'hikweb=; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  if (p === '/api/info') {
    return json(res, 200, {
      siteName: config.siteName || '',
      language: LANGS.includes(config.language) ? config.language : 'auto',
      theme: THEMES.includes(config.theme) ? config.theme : 'dark',
    });
  }

  // --- statiniai failai (sąsaja) ---
  if (!p.startsWith('/api/') && !p.startsWith('/hls/')) {
    const rel = p === '/' ? 'index.html' : p.slice(1);
    const file = path.join(ROOT, 'public', path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(path.join(ROOT, 'public'))) { res.writeHead(403); return res.end(); }
    return serveFile(res, file, { 'Cache-Control': 'no-cache' });
  }

  // --- toliau tik prisijungusiems ---
  const user = currentUser(req);
  if (!user) return json(res, 401, { error: T('notLoggedIn') });

  if (p.startsWith('/hls/')) {
    const m = p.match(/^\/hls\/([a-f0-9]{16})\/([\w.]+)$/);
    const s = m && streams.get(m[1]);
    if (!s) { res.writeHead(404); return res.end(); }
    s.last = Date.now();
    return serveFile(res, path.join(s.dir, m[2]), { 'Cache-Control': 'no-cache' });
  }

  if (p === '/api/me') {
    const alerts = user.role === 'admin' ? await Promise.race([storageAlerts(), sleep(4000).then(() => [])]) : [];
    return json(res, 200, { ...publicUser(user), webrtc: webrtcOn(), thumbnails: config.thumbnails !== false, alerts, idleLogout: idleLogoutMs(user) / 60000 });
  }

  if (p === '/api/ping' && req.method === 'POST') {
    const sess = sessions.get(parseCookies(req).hikweb);
    if (sess) sess.lastActive = Date.now();
    return json(res, 200, { ok: true, idleLogout: idleLogoutMs(user) / 60000 });
  }

  if (p === '/api/webrtc' && req.method === 'POST') {
    if (!webrtcOn()) return json(res, 400, { error: 'WebRTC off' });
    const dev = getDevice(q, user); const ch = getChannel(q);
    if (await channelOnline(dev, ch) === false) return json(res, 503, { error: T('camOffline'), offline: true });
    await requireRtsp(dev);
    const offer = await readBody(req, 100000);
    if (!/^v=0/.test(offer.trim())) return json(res, 400, { error: T('badData') });
    const stream = q.get('stream') === 'main' || noSubStream.has(`${dev.id}:${ch}`) ? 1 : 2;
    let name = await g2rEnsure(dev, ch, stream);
    let answer;
    try {
      answer = await g2rWebrtc(name, offer);
    } catch (e) {
      // go2rtc galėjo būti perkrautas ir pamiršti srautą – registruojame iš naujo ir bandome dar kartą
      if (e.g2rStatus === undefined) throw e;
      name = await g2rEnsure(dev, ch, stream, true);
      answer = await g2rWebrtc(name, offer);
    }
    res.writeHead(200, { 'Content-Type': 'application/sdp', 'Cache-Control': 'no-store' });
    return res.end(answer);
  }

  if (p.startsWith('/api/admin/') || p === '/api/password') return handleAdmin(req, res, p, q, user);

  if (p === '/api/devices') {
    const list = await Promise.all([...devices.values()].filter((d) => canSee(user, d.id)).map(async (d) => {
      let channels = [];
      let error = null;
      try { channels = await getChannels(d); } catch (e) { error = e.message; }
      const st = await getStatus(d, q.get('refresh') === '1');
      for (const c of channels) {
        c.online = st.reachable === false ? false : (st.online.has(c.id) ? st.online.get(c.id) : null);
      }
      if (st.reachable === false && !error) error = T('deviceOffline');
      return { id: d.id, name: d.name || d.id, type: d.type, channels, error, reachable: st.reachable };
    }));
    return json(res, 200, list);
  }

  if (p === '/api/snapshot') {
    const dev = getDevice(q, user); const ch = getChannel(q);
    const r = await isapiStream(dev, 'GET', `/ISAPI/Streaming/channels/${ch}01/picture`);
    if (r.statusCode !== 200) { r.resume(); res.writeHead(502); return res.end(); }
    res.writeHead(200, { 'Content-Type': r.headers['content-type'] || 'image/jpeg', 'Cache-Control': 'no-store' });
    return r.pipe(res);
  }

  if (p === '/api/live') {
    const dev = getDevice(q, user); const ch = getChannel(q);
    if (await channelOnline(dev, ch) === false) return json(res, 503, { error: T('camOffline'), offline: true });
    const subKey = `${dev.id}:${ch}`;
    let stream = q.get('stream') === 'main' || noSubStream.has(subKey) ? 1 : 2;
    let s;
    try {
      s = await openHls(() => `live:${dev.id}:${ch}:${stream}`, dev, () => liveUrl(dev, ch, stream), true, 20000);
    } catch (e) {
      if (stream !== 2 || !/404|Not Found|453|Not Enough Bandwidth/i.test(e.message)) throw e;
      // kamera neturi papildomo srauto – naudojame pagrindinį
      console.warn(`[${dev.id}] kanalas ${ch}: papildomo srauto nėra, naudojamas pagrindinis`);
      noSubStream.add(subKey);
      stream = 1;
      s = await openHls(() => `live:${dev.id}:${ch}:${stream}`, dev, () => liveUrl(dev, ch, stream), true, 20000);
    }
    return json(res, 200, { id: s.id, url: `/hls/${s.id}/index.m3u8` });
  }

  if (p === '/api/recordings') {
    const dev = getDevice(q, user); const ch = getChannel(q);
    const date = q.get('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return json(res, 400, { error: T('badDate') });
    const items = await searchRecordings(dev, ch, `${date}T00:00:00`, `${date}T23:59:59`);
    return json(res, 200, items);
  }

  if (p === '/api/playback') {
    const dev = getDevice(q, user); const ch = getChannel(q);
    const start = getTime(q, 'start');
    const end = q.get('end') && TIME_RE.test(q.get('end')) ? q.get('end') : addSeconds(start, 6 * 3600);
    // Kiekvienas prisijungimas turi iki 4 atkūrimo vietų („slot“ – po vieną kiekvienai vienu metu rodomai kamerai).
    // Vienoje vietoje vienu metu veikia tik vienas atkūrimas; laimi paskutinė užklausa (greitai spaudant laiko juostą).
    const slot = Math.min(Math.max(parseInt(q.get('slot') || '0', 10) || 0, 0), 3);
    const owner = `${parseCookies(req).hikweb}#${slot}`;
    const gkey = owner;
    const gen = (pbGen.get(gkey) || 0) + 1;
    pbGen.set(gkey, gen);
    const superseded = () => pbGen.get(gkey) !== gen;
    for (const x of [...streams.values()]) if (!x.live && x.owner === owner) stopStream(x.id);
    if (activePlaybacks(dev) >= pbLimit(dev)) return json(res, 429, { error: T('pbLimit', { n: pbLimit(dev) }), pbLimit: true });
    await waitClosed(dev.id);
    if (superseded()) return json(res, 409, { superseded: true });
    let s;
    try {
      s = await openHls(() => `pb:${dev.id}:${ch}:${start}:${end}:${crypto.randomBytes(4).toString('hex')}`,
        dev, () => playbackUrl(dev, ch, start, end), false, 60000, owner);
    } catch (e) {
      if (superseded()) return json(res, 409, { superseded: true });
      if (e.pbLimit) return json(res, 429, { error: e.message, pbLimit: true });
      throw e;
    }
    if (superseded()) { stopStream(s.id); return json(res, 409, { superseded: true }); }
    return json(res, 200, { id: s.id, url: `/hls/${s.id}/index.m3u8`, start });
  }

  if (p === '/api/thumb') {
    if (config.thumbnails === false) return json(res, 404, { error: T('notFound') });
    const dev = getDevice(q, user); const ch = getChannel(q);
    const t = getTime(q, 't');
    return sendThumb(req, res, dev, ch, t);
  }

  if (p === '/api/stop' && req.method === 'POST') {
    const id = q.get('id');
    if (/^[a-f0-9]{16}$/.test(id || '')) stopStream(id);
    return json(res, 200, { ok: true });
  }

  if (p === '/api/download') {
    const dev = getDevice(q, user); const ch = getChannel(q);
    const start = getTime(q, 'start'); const end = getTime(q, 'end');
    const dur = diffSeconds(start, end);
    if (!(dur > 0 && dur <= cfg.maxDownloadSec)) return json(res, 400, { error: T('durRange', { max: cfg.maxDownloadSec / 60 }) });
    const name = `${(dev.name || dev.id).replace(/[^\w-]+/g, '_')}_k${ch}_${start.replace(/[-:]/g, '').replace('T', '_')}.mp4`;
    const mkArgs = () => [
      '-hide_banner', '-loglevel', 'error', '-nostdin',
      '-rtsp_transport', 'tcp', '-timeout', '30000000', '-fflags', '+genpts',
      '-i', playbackUrl(dev, ch, start, end),
      '-t', String(dur), '-map', '0:v:0', ...audioArgs(dev), ...videoArgs(dev),
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1',
    ];
    // 1) greitas būdas: įrašas tiesiai iš NVR disko per ISAPI (kelis kartus greičiau nei realiu laiku)
    if (config.fastDownload !== false && await fastDownload(dev, ch, start, end, dur, res, name)) return;
    if (res.destroyed) return;
    await requireRtsp(dev);
    // 2) atsarginis būdas: RTSP atkūrimas realiu laiku
    let retries = 0;
    const run = () => {
    const withAudio = !(dev.audio === false || dev.noAudio);
    const proc = spawn(FFMPEG, mkArgs(), { stdio: ['ignore', 'pipe', 'pipe'] });
    let started = false;
    let log = '';
    proc.stderr.on('data', (d) => { log = (log + d).slice(-1000); });
    proc.stdout.once('data', () => {
      started = true;
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' });
    });
    proc.stdout.on('data', (c) => res.write(c));
    proc.on('exit', () => {
      if (started) return res.end();
      if (retries < 2 && !res.destroyed) {
        if (isAudioErr(log) && withAudio) { dev.noAudio = true; retries++; return run(); }
        if (isBandwidthErr(log) && freeBandwidth(dev)) { retries++; setTimeout(run, 1500); return; }
      }
      json(res, 502, { error: T('downloadFail') + ': ' + log.replace(/rtsp:\/\/[^@\s]*@/g, 'rtsp://***@').trim() });
    });
    proc.on('error', () => { if (!started) json(res, 500, { error: T('ffmpegMissing') }); });
    res.on('close', () => {
      if (proc.exitCode !== null) return;
      try { proc.kill('SIGTERM'); } catch (_) { /* */ }
      setTimeout(() => { try { proc.kill('SIGKILL'); } catch (_) { /* */ } }, 3000);
    });
    };
    run();
    return;
  }

  return json(res, 404, { error: T('notFound') });
}

/* ------------------------------------------------------------------ */
/* Greitas atsisiuntimas per ISAPI                                      */
/* ------------------------------------------------------------------ */
/**
 * Atsisiunčia įrašą per /ISAPI/ContentMgmt/download (NVR siunčia failą kaip MPEG-PS, kartais su 40 baitų
 * „IMKH“ antrašte) ir ffmpeg be perkodavimo perpakuoja į MP4.
 * Grąžina true, jei failas išsiųstas (ar bent pradėtas siųsti); false – jei reikia naudoti RTSP būdą.
 */
async function fastDownload(dev, ch, start, end, dur, res, name) {
  const uri = `rtsp://${dev.host}:${dev.rtspPort}/Streaming/tracks/${ch}01/?starttime=${toRtspTime(start)}&amp;endtime=${toRtspTime(end)}`;
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<downloadRequest version="1.0" xmlns="http://www.isapi.org/ver20/XMLSchema"><playbackURI>${uri}</playbackURI></downloadRequest>`;
  let src = null;
  for (const method of ['GET', 'POST']) {
    let r;
    try { r = await isapiStream(dev, method, '/ISAPI/ContentMgmt/download', body); } catch (e) {
      console.warn(`[${dev.id}] greitas atsisiuntimas nepavyko (${e.message}), naudojamas RTSP`);
      return false;
    }
    const ct = String(r.headers['content-type'] || '');
    if (r.statusCode === 200 && !/xml|html|json|text/i.test(ct)) { src = r; break; }
    r.resume();
  }
  if (!src) { console.warn(`[${dev.id}] NVR nepalaiko ISAPI atsisiuntimo, naudojamas RTSP`); return false; }
  src.setTimeout && src.setTimeout(0);

  return new Promise((resolve) => {
    const args = [
      '-hide_banner', '-loglevel', 'error', '-fflags', '+genpts',
      '-f', 'mpeg', '-i', 'pipe:0',
      '-t', String(dur), '-map', '0:v:0', '-an', ...videoArgs(dev),
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1',
    ];
    const proc = spawn(FFMPEG, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let started = false;
    let done = false;
    let log = '';
    let head = Buffer.alloc(0);
    let headDone = false;
    const finish = (ok) => { if (done) return; done = true; clearTimeout(timer); src.destroy(); resolve(ok); };
    // jei per 30 s nėra nė vieno baito vaizdo – pereiname prie RTSP
    const timer = setTimeout(() => { if (!started) { try { proc.kill('SIGKILL'); } catch (_) { /* */ } } }, 30000);

    proc.stdin.on('error', () => {}); // ffmpeg gali baigti anksčiau (pvz. pasiekus -t)
    src.on('data', (chunk) => {
      if (!headDone) {
        head = Buffer.concat([head, chunk]);
        if (head.length < 64) return;
        headDone = true;
        chunk = head.slice(0, 4).toString('latin1') === 'IMKH' ? head.slice(40) : head;
      }
      if (!proc.stdin.write(chunk)) src.pause();
    });
    proc.stdin.on('drain', () => src.resume());
    src.on('end', () => { if (!headDone && head.length) proc.stdin.write(head.slice(0, 4).toString('latin1') === 'IMKH' ? head.slice(40) : head); proc.stdin.end(); });
    src.on('error', () => proc.stdin.end());

    proc.stderr.on('data', (d) => { log = (log + d).slice(-1000); });
    proc.stdout.on('data', (c) => {
      if (!started) {
        started = true;
        res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' });
      }
      if (!res.write(c)) { proc.stdout.pause(); res.once('drain', () => proc.stdout.resume()); }
    });
    proc.on('exit', () => {
      if (started) { res.end(); return finish(true); }
      console.warn(`[${dev.id}] greitas atsisiuntimas nepavyko, naudojamas RTSP: ${log.trim().split('\n').slice(-2).join(' ')}`);
      finish(false);
    });
    proc.on('error', () => finish(false));
    res.on('close', () => {
      if (done && started) return;
      try { proc.kill('SIGKILL'); } catch (_) { /* */ }
      src.destroy();
    });
  });
}

/* ------------------------------------------------------------------ */
/* Miniatiūros laiko juostoje (vienas kadras iš įrašo)                 */
/* ------------------------------------------------------------------ */
const thumbCache = new Map(); // 'dev:ch:laikas' -> Buffer (iki 300 vnt.)
const thumbState = new Map(); // devId -> {busy: Promise|null, gen}
const THUMB_STEP = 10; // sekundės – artimi laikai naudoja tą pačią miniatiūrą

function grabFrame(dev, ch, t) {
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner', '-loglevel', 'error', '-nostdin',
      '-rtsp_transport', 'tcp', '-timeout', '15000000',
      '-i', playbackUrl(dev, ch, t, addSeconds(t, 15)),
      '-map', '0:v:0', '-frames:v', '1', '-vf', 'scale=320:-2', '-q:v', '6', '-f', 'mjpeg', 'pipe:1',
    ];
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let log = '';
    const kill = setTimeout(() => { try { proc.kill('SIGTERM'); } catch (_) { /* */ } }, 15000);
    proc.stdout.on('data', (c) => chunks.push(c));
    proc.stderr.on('data', (d) => { log = (log + d).slice(-500); });
    proc.on('error', reject);
    proc.on('exit', () => {
      clearTimeout(kill);
      const buf = Buffer.concat(chunks);
      if (buf.length > 100) return resolve(buf);
      if (isBandwidthErr(log) && activePlaybacks(dev) > 0) learnPbLimit(dev, activePlaybacks(dev));
      reject(new Error(log.replace(/rtsp:\/\/[^@\s]*@/g, 'rtsp://***@').trim() || 'no frame'));
    });
  });
}

/** Siunčia miniatiūrą. Vienam įrenginiui vienu metu daroma tik viena; laukiančios užklausos, kurias pakeitė naujesnė, atmetamos. */
async function sendThumb(req, res, dev, ch, t) {
  const rounded = addSeconds(t, -(new Date(t + 'Z').getUTCSeconds() % THUMB_STEP));
  const key = `${dev.id}:${ch}:${rounded}`;
  const hit = thumbCache.get(key);
  const send = (buf) => { res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' }); res.end(buf); };
  if (hit) return send(hit);
  await requireRtsp(dev);
  // miniatiūra neturi atimti vienintelės NVR atkūrimo vietos iš žiūrimo įrašo
  if (activePlaybacks(dev) >= pbLimit(dev)) return json(res, 503, { busy: true });
  let st = thumbState.get(dev.id);
  if (!st) { st = { busy: null, gen: 0 }; thumbState.set(dev.id, st); }
  const gen = ++st.gen;
  let closed = false;
  req.on('close', () => { closed = true; });
  while (st.busy) { await st.busy.catch(() => {}); }
  if (gen !== st.gen || closed) return json(res, 409, { superseded: true });
  const job = grabFrame(dev, ch, rounded);
  st.busy = job;
  try {
    const buf = await job;
    thumbCache.set(key, buf);
    if (thumbCache.size > 300) thumbCache.delete(thumbCache.keys().next().value);
    if (!closed) send(buf);
  } catch (e) {
    if (!closed) json(res, 404, { error: e.message });
  } finally {
    st.busy = null;
  }
}

/* ------------------------------------------------------------------ */
/* NVR diskai                                                          */
/* ------------------------------------------------------------------ */
const storageCache = new Map(); // devId -> {t, data}
const HDD_OK = /^(ok|normal|idle|sleep|sleeping|standby)$/i;

/** Seniausio įrašo laikas (paieška nuo 2000 m., pirmas rezultatas). */
async function oldestRecording(dev) {
  const chans = await getChannels(dev).catch(() => [{ id: 1 }]);
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T23:59:59`;
  let oldest = null;
  for (const c of chans.slice(0, 16)) {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<CMSearchDescription><searchID>${crypto.randomUUID().toUpperCase()}</searchID>
<trackList><trackID>${c.id}01</trackID></trackList>
<timeSpanList><timeSpan><startTime>2000-01-01T00:00:00Z</startTime><endTime>${nowStr}Z</endTime></timeSpan></timeSpanList>
<maxResults>1</maxResults><searchResultPostion>0</searchResultPostion>
<metadataList><metadataDescriptor>//recordType.meta.std-cgi.com</metadataDescriptor></metadataList></CMSearchDescription>`;
    try {
      const xml = await isapi(dev, 'POST', '/ISAPI/ContentMgmt/search', body);
      const st = (tag(tagsAll(xml, 'searchMatchItem')[0] || '', 'startTime') || '').slice(0, 19);
      if (TIME_RE.test(st) && (!oldest || st < oldest)) oldest = st;
    } catch (_) { /* kanalas be įrašų */ }
  }
  return oldest;
}

async function getStorage(dev, force) {
  const c = storageCache.get(dev.id);
  if (!force && c && Date.now() - c.t < 10 * 60000) return c.data;
  const data = { device: dev.name || dev.id, disks: [], error: null, oldest: null };
  try {
    const xml = await isapi(dev, 'GET', '/ISAPI/ContentMgmt/Storage');
    for (const h of tagsAll(xml, 'hdd')) {
      const cap = Number(tag(h, 'capacity')) || 0; // MB
      const free = Number(tag(h, 'freeSpace')) || 0; // MB
      data.disks.push({
        id: tag(h, 'id'), name: tag(h, 'hddName') || `HDD ${tag(h, 'id')}`,
        status: tag(h, 'status') || '?', type: tag(h, 'hddType') || '', property: tag(h, 'property') || '',
        capacityMB: cap, freeMB: free, ok: HDD_OK.test(tag(h, 'status') || ''),
      });
    }
    data.oldest = await oldestRecording(dev);
  } catch (e) {
    data.error = e.message;
  }
  const used = data.disks.reduce((a, d) => a + d.capacityMB - d.freeMB, 0);
  const free = data.disks.reduce((a, d) => a + d.freeMB, 0);
  if (data.oldest) {
    const days = (Date.now() - new Date(data.oldest).getTime()) / 864e5;
    data.retentionDays = Math.max(0, Math.round(days * 10) / 10);
    // jei diskas dar nepilnas – kiek dienų dar tilps tokiu pačiu tempu
    if (days > 0.5 && used > 0 && free > 1024) data.daysLeft = Math.round(free / (used / days));
  }
  storageCache.set(dev.id, { t: Date.now(), data });
  return data;
}
/** Disko problemos (administratoriaus įspėjimui). */
async function storageAlerts() {
  const out = [];
  for (const d of devices.values()) {
    const c = storageCache.get(d.id);
    const data = c ? c.data : await getStorage(d).catch(() => null);
    if (!data) continue;
    for (const k of data.disks) if (!k.ok) out.push({ device: data.device, disk: k.name, status: k.status });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Kasdienė NVR sveikatos ataskaita                                    */
/* ------------------------------------------------------------------ */
let lastReport = null;
const pad2 = (n) => String(n).padStart(2, '0');
const localStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const fmtHM = (sec) => T('durHM', { h: Math.floor(sec / 3600), m: Math.floor(sec % 3600 / 60) });
const fmtMB = (mb) => (mb >= 1048576 ? (mb / 1048576).toFixed(2) + ' TB' : mb >= 1024 ? Math.round(mb / 1024) + ' GB' : Math.round(mb) + ' MB');

/** Patikrina visus įrenginius: būseną, RTSP, įrašus per 24 val. ir diskus. */
async function buildReport() {
  const now = new Date();
  const from = new Date(now.getTime() - 864e5);
  const fromS = localStr(from); const toS = localStr(now);
  const rep = { time: toS, devices: [], problems: 0 };
  for (const dev of devices.values()) {
    const d = { name: dev.name || dev.id, reachable: true, rtsp: true, channels: [], disks: [], issues: [] };
    const st = await getStatus(dev, true);
    if (st.reachable === false) { d.reachable = false; d.issues.push(T('rpDevUnreach')); rep.devices.push(d); rep.problems++; continue; }
    rtspCheck.delete(dev.id);
    const rt = await rtspReachable(dev);
    if (!rt.ok) { d.rtsp = false; d.issues.push(T('rpRtspDown', { err: rt.err })); rep.problems++; }
    const chans = await getChannels(dev).catch(() => []);
    for (const c of chans) {
      const ch = { id: c.id, name: c.name, online: st.online.has(c.id) ? st.online.get(c.id) : null, recSec: 0, last: null, ok: true, issue: null };
      if (ch.online === false) { ch.ok = false; ch.issue = T('rpCamOffline'); }
      else {
        try {
          const segs = await searchRecordings(dev, c.id, fromS, toS);
          for (const sg of segs) {
            const a = Math.max(new Date(sg.start).getTime(), from.getTime());
            const b = Math.min(new Date(sg.end).getTime(), now.getTime());
            if (b > a) ch.recSec += (b - a) / 1000;
            if (!ch.last || sg.end > ch.last) ch.last = sg.end;
          }
          if (!segs.length) { ch.ok = false; ch.issue = T('rpNoRec'); }
        } catch (e) { ch.ok = false; ch.issue = e.message; }
      }
      if (!ch.ok) rep.problems++;
      d.channels.push(ch);
    }
    const sto = await getStorage(dev, true).catch(() => null);
    if (sto) {
      d.disks = sto.disks;
      d.oldest = sto.oldest; d.retentionDays = sto.retentionDays; d.daysLeft = sto.daysLeft;
      for (const k of sto.disks) if (!k.ok) rep.problems++;
      if (sto.error && !sto.disks.length) d.issues.push(T('disk.error') + ': ' + sto.error);
    }
    rep.devices.push(d);
  }
  rep.ok = rep.problems === 0;
  return rep;
}

/** Ataskaitos tekstas (Telegram HTML arba paprastas tekstas). */
function formatReport(rep, html) {
  const e = (t) => (html ? String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : String(t));
  const b = (t) => (html ? `<b>${e(t)}</b>` : String(t));
  const L = [];
  const siteName = config.siteName ? ` · ${config.siteName}` : '';
  L.push(b(T('rpTitle', { date: rep.time.replace('T', ' ').slice(0, 16) }) + siteName));
  L.push(rep.ok ? T('rpAllOk') : T('rpProblems', { n: rep.problems }));
  for (const d of rep.devices) {
    L.push('');
    L.push(b(d.name));
    for (const i of d.issues) L.push('❌ ' + e(i));
    if (!d.reachable) continue;
    for (const c of d.channels) {
      const icon = c.ok ? '✅' : (c.online === false ? '❌' : '⚠️');
      const lastS = !c.last ? '' : c.last.slice(0, 10) === rep.time.slice(0, 10) ? c.last.slice(11, 16) : c.last.slice(5, 16).replace('T', ' ');
      const info = c.ok ? T('rpRec', { h: fmtHM(c.recSec), last: lastS }) : c.issue;
      L.push(`${icon} ${e(c.name)} – ${e(info)}`);
    }
    for (const k of d.disks) {
      const pct = k.capacityMB ? Math.round((k.capacityMB - k.freeMB) / k.capacityMB * 100) : 0;
      L.push((k.ok ? '💾 ' : '❌ ') + e(T(k.ok ? 'rpDisk' : 'rpDiskBad', { name: k.name, status: k.status, pct, cap: fmtMB(k.capacityMB) })));
    }
    if (d.oldest) L.push('📼 ' + e(T('rpRetention', { n: Math.round(d.retentionDays), d: d.oldest.slice(0, 10) })));
    if (d.daysLeft) L.push('📈 ' + e(T('rpDaysLeft', { n: d.daysLeft })));
  }
  return L.join('\n');
}

const reportCfg = () => ({ enabled: false, time: '08:00', telegramToken: '', telegramChat: '', webhookUrl: '', onlyProblems: false, ...(config.report || {}) });

/** Siunčia ataskaitą į Telegram ir (arba) webhook (pvz. Home Assistant). Grąžina rezultatų sąrašą. */
async function deliverReport(rep) {
  const rc = reportCfg();
  const out = [];
  if (rc.telegramToken && rc.telegramChat) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${rc.telegramToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ chat_id: rc.telegramChat, text: formatReport(rep, true), parse_mode: 'HTML', disable_web_page_preview: true }),
      });
      const j = await r.json().catch(() => ({}));
      out.push({ to: 'Telegram', ok: !!j.ok, error: j.ok ? null : (j.description || 'HTTP ' + r.status) });
    } catch (e) { out.push({ to: 'Telegram', ok: false, error: e.cause ? e.cause.code || e.cause.message : e.message }); }
  }
  if (rc.webhookUrl) {
    try {
      const r = await fetch(rc.webhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ title: T('rpTitle', { date: rep.time.replace('T', ' ').slice(0, 16) }), message: formatReport(rep, false), ok: rep.ok, problems: rep.problems, report: rep }),
      });
      out.push({ to: 'Webhook', ok: r.ok, error: r.ok ? null : 'HTTP ' + r.status });
    } catch (e) { out.push({ to: 'Webhook', ok: false, error: e.cause ? e.cause.code || e.cause.message : e.message }); }
  }
  for (const o of out) if (!o.ok) console.warn(`Ataskaitos siuntimas (${o.to}) nepavyko: ${o.error}`);
  return out;
}

async function runReport(send) {
  const rep = await buildReport();
  rep.text = formatReport(rep, false);
  rep.sent = send ? await deliverReport(rep) : [];
  lastReport = rep;
  return rep;
}

// Tvarkaraštis: kas 30 s tikriname, ar atėjo ataskaitos laikas (siunčiama kartą per dieną, valandos lange nuo nurodyto laiko)
setInterval(() => {
  const rc = reportCfg();
  if (!rc.enabled || !/^\d{2}:\d{2}$/.test(rc.time)) return;
  const now = new Date();
  const today = localStr(now).slice(0, 10);
  if (rc.lastSent === today || runReport.busy) return;
  const [h, m] = rc.time.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes() - (h * 60 + m);
  if (mins < 0 || mins > 59) return;
  runReport.busy = true;
  config.report = { ...rc, lastSent: today };
  try { saveConfig(); } catch (_) { /* */ }
  buildReport().then(async (rep) => {
    rep.text = formatReport(rep, false);
    lastReport = rep;
    if (!rc.onlyProblems || !rep.ok) rep.sent = await deliverReport(rep);
    console.log(`Kasdienė ataskaita: ${rep.ok ? 'viskas gerai' : rep.problems + ' problemos'}`);
  }).catch((e) => console.error('Ataskaitos klaida:', e.message)).finally(() => { runReport.busy = false; });
}, 30000).unref();

/* ------------------------------------------------------------------ */
/* WebRTC per go2rtc (tiesioginis vaizdas su < 1 s vėlavimu)           */
/* ------------------------------------------------------------------ */
const g2rUrl = () => String(config.go2rtcUrl || 'http://127.0.0.1:1984').replace(/\/+$/, '');
const webrtcOn = () => !!config.webrtc;
const g2rRegistered = new Map(); // srauto vardas go2rtc -> RTSP adresas

async function g2rFetch(pathQ, opts = {}) {
  try {
    return await fetch(g2rUrl() + pathQ, { ...opts, signal: AbortSignal.timeout(opts.timeout || 10000) });
  } catch (e) {
    throw httpErr(502, T('g2rDown') + ` (${e.cause ? e.cause.code || e.cause.message : e.message})`);
  }
}
const g2rName = (dev, ch, stream) => `hikweb_${dev.id}_${ch}_${stream}`.replace(/[^\w-]/g, '_');

/** Užregistruoja kameros srautą go2rtc (kameros slaptažodis lieka tik serveryje). */
async function g2rEnsure(dev, ch, stream, force) {
  const name = g2rName(dev, ch, stream);
  const src = liveUrl(dev, ch, stream);
  if (force || g2rRegistered.get(name) !== src) {
    const r = await g2rFetch(`/api/streams?name=${encodeURIComponent(name)}&src=${encodeURIComponent(src)}`, { method: 'PUT' });
    if (!r.ok) throw httpErr(502, `go2rtc: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    g2rRegistered.set(name, src);
  }
  return name;
}
function g2rForget(devId) {
  for (const name of [...g2rRegistered.keys()]) {
    if (name.startsWith(`hikweb_${devId}_`.replace(/[^\w-]/g, '_'))) {
      g2rRegistered.delete(name);
      g2rFetch(`/api/streams?src=${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(() => {});
    }
  }
}
/** SDP pasiūlymą perduoda go2rtc ir grąžina atsakymą. */
async function g2rWebrtc(name, offer) {
  const r = await g2rFetch(`/api/webrtc?src=${encodeURIComponent(name)}`, {
    method: 'POST', body: offer, headers: { 'Content-Type': 'application/sdp' }, timeout: 20000,
  });
  const text = await r.text();
  if (!r.ok || !/^v=0/.test(text.trim())) throw Object.assign(httpErr(502, `go2rtc: ${r.status} ${text.slice(0, 300)}`), { g2rStatus: r.status });
  return text;
}
async function g2rInfo() {
  if (!webrtcOn()) return null;
  try {
    const r = await g2rFetch('/api', { timeout: 3000 });
    const j = await r.json();
    return { ok: true, version: j.version || '?' };
  } catch (e) { return { ok: false, error: e.message }; }
}

/* ------------------------------------------------------------------ */
/* Administravimas: įrenginiai ir vartotojai                           */
/* ------------------------------------------------------------------ */
const httpErr = (status, msg) => Object.assign(new Error(msg), { status });
const VIDEO_MODES = ['copy', 'h265', 'transcode'];

function publicDevice(d) {
  const { password, noAudio, ...rest } = d;
  return { ...rest, hasPassword: !!password };
}

function forgetDevice(id) {
  for (const s of [...streams.values()]) if (s.devId === id) stopStream(s.id);
  channelCache.delete(id);
  statusCache.delete(id);
  storageCache.delete(id);
  rtspCheck.delete(id);
  digestCache.delete(id);
  for (const k of [...noSubStream]) if (k.startsWith(id + ':')) noSubStream.delete(k);
  g2rForget(id);
}

/** Patikrina ir sutvarko formos duomenis. `old` – esamas įrenginys (redaguojant). */
function cleanDevice(b, old) {
  const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
  const port = (v, def) => {
    if (v === '' || v === undefined || v === null) return def;
    const n = parseInt(v, 10);
    if (!(n >= 1 && n <= 65535)) throw httpErr(400, T('badPort'));
    return n;
  };
  const d = {
    id: old ? old.id : '',
    name: str(b.name, 80),
    type: b.type === 'nvr' ? 'nvr' : 'camera',
    host: str(b.host, 253),
    httpPort: port(b.httpPort, 80),
    rtspPort: port(b.rtspPort, 554),
    username: str(b.username, 64),
    password: b.password ? String(b.password).slice(0, 128) : (old ? old.password : ''),
    video: VIDEO_MODES.includes(b.video) ? b.video : 'copy',
  };
  if (b.audio === false) d.audio = false;
  if (old && Array.isArray(old.channels)) d.channels = old.channels;
  if (old && old.channelCount) d.channelCount = old.channelCount;
  if (!d.name) throw httpErr(400, T('needName'));
  if (!/^[\w.-]+$/.test(d.host) && !/^\[?[0-9a-f:]+\]?$/i.test(d.host)) throw httpErr(400, T('badHost'));
  if (!d.username) throw httpErr(400, T('needDevUser'));
  if (!d.password) throw httpErr(400, T('needDevPass'));
  return d;
}

function newDeviceId(name) {
  const base = (name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'irenginys').slice(0, 30);
  let id = base; let i = 2;
  while (devices.has(id)) id = `${base}-${i++}`;
  return id;
}

async function readJson(req) {
  if (!/application\/json/.test(req.headers['content-type'] || '')) throw httpErr(415, T('needJson'));
  try { return JSON.parse(await readBody(req)); } catch (_) { throw httpErr(400, T('badData')); }
}

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 6) throw httpErr(400, T('pwShort'));
  if (pw.length > 200) throw httpErr(400, T('pwLong'));
}

const THEMES = ['dark', 'light', 'blue', 'auto'];
function systemSettings() {
  return {
    siteName: config.siteName || '',
    port: config.port || 8080,
    bind: config.bind || '0.0.0.0',
    language: LANGS.includes(config.language) ? config.language : 'auto',
    theme: THEMES.includes(config.theme) ? config.theme : 'dark',
    sessionHours: config.sessionHours || 12,
    idleSeconds: config.idleSeconds || 30,
    maxStreams: config.maxStreams || 16,
    maxDownloadMinutes: config.maxDownloadMinutes || 120,
    secureCookies: !!config.secureCookies,
    fastDownload: config.fastDownload !== false,
    thumbnails: config.thumbnails !== false,
    idleLogoutMinutes: config.idleLogoutMinutes || 0,
    webrtc: !!config.webrtc,
    go2rtcUrl: config.go2rtcUrl || 'http://127.0.0.1:1984',
  };
}
function cleanSystem(b) {
  const int = (v, min, max, name) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw httpErr(400, T('badRange', { name, min, max }));
    return n;
  };
  const bind = String(b.bind || '0.0.0.0').trim();
  if (!/^(0\.0\.0\.0|::|::1|localhost|\d{1,3}(\.\d{1,3}){3}|[0-9a-f:]+)$/i.test(bind)) throw httpErr(400, T('badBind'));
  return {
    siteName: String(b.siteName || '').trim().slice(0, 60),
    port: int(b.port, 1, 65535, T('f.port')),
    bind,
    language: LANGS.includes(b.language) ? b.language : 'auto',
    theme: THEMES.includes(b.theme) ? b.theme : 'dark',
    sessionHours: int(b.sessionHours, 1, 720, T('f.sessionHours')),
    idleSeconds: int(b.idleSeconds, 10, 600, T('f.idleSeconds')),
    maxStreams: int(b.maxStreams, 1, 64, T('f.maxStreams')),
    maxDownloadMinutes: int(b.maxDownloadMinutes, 1, 1440, T('f.maxDownloadMinutes')),
    secureCookies: !!b.secureCookies,
    fastDownload: b.fastDownload !== false,
    thumbnails: b.thumbnails !== false,
    idleLogoutMinutes: int(b.idleLogoutMinutes || 0, 0, 1440, T('f.idleLogout')),
    webrtc: !!b.webrtc,
    go2rtcUrl: (() => {
      const u = String(b.go2rtcUrl || 'http://127.0.0.1:1984').trim().replace(/\/+$/, '');
      if (!/^https?:\/\/[\w.\-\[\]:]+$/i.test(u)) throw httpErr(400, T('badG2rUrl'));
      return u;
    })(),
  };
}
let ffmpegVer = null;
function ffmpegVersion() {
  if (ffmpegVer) return Promise.resolve(ffmpegVer);
  return new Promise((resolve) => {
    let out = '';
    const pr = spawn(FFMPEG, ['-version']);
    pr.stdout.on('data', (d) => { out += d; });
    pr.on('error', () => resolve(T('ffmpegMissing')));
    pr.on('close', () => { ffmpegVer = (out.match(/ffmpeg version (\S+)/) || [])[1] || '?'; resolve(ffmpegVer); });
  });
}

async function handleAdmin(req, res, p, q, user) {
  // savo slaptažodžio keitimas – visiems
  if (p === '/api/password' && req.method === 'POST') {
    const b = await readJson(req);
    if (!checkPassword(user.username, String(b.current || ''))) throw httpErr(400, T('pwCurrentWrong'));
    validatePassword(b.password);
    user.passwordHash = hashPassword(b.password);
    delete user.password; delete user.passwordSha256;
    saveConfig();
    return json(res, 200, { ok: true });
  }

  if (user.role !== 'admin') throw httpErr(403, T('needAdmin'));

  /* ----- Įrenginiai ----- */
  if (p === '/api/admin/devices' && req.method === 'GET') {
    return json(res, 200, [...devices.values()].map(publicDevice));
  }
  if (p === '/api/admin/devices' && req.method === 'POST') {
    const b = await readJson(req);
    const old = b.id ? devices.get(String(b.id)) : null;
    if (b.id && !old) throw httpErr(404, T('deviceNotFound'));
    const d = cleanDevice(b, old);
    if (!old) d.id = newDeviceId(d.name);
    config.devices = config.devices || [];
    const i = config.devices.findIndex((x) => String(x.id) === d.id);
    if (i >= 0) config.devices[i] = d; else config.devices.push(d);
    saveConfig();
    forgetDevice(d.id);
    loadDevicesFromConfig();
    return json(res, 200, publicDevice(devices.get(d.id)));
  }
  if (p === '/api/admin/devices' && req.method === 'DELETE') {
    const id = String(q.get('id'));
    if (!devices.has(id)) throw httpErr(404, T('deviceNotFound'));
    config.devices = (config.devices || []).filter((x) => String(x.id) !== id);
    for (const u of config.users) if (Array.isArray(u.devices)) u.devices = u.devices.filter((x) => x !== id);
    saveConfig();
    forgetDevice(id);
    loadDevicesFromConfig();
    return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/test-device' && req.method === 'POST') {
    const b = await readJson(req);
    const old = b.id ? devices.get(String(b.id)) : null;
    const d = normDevice({ ...cleanDevice(b, old), id: '__test_' + crypto.randomBytes(4).toString('hex') });
    try {
      const xml = await isapi(d, 'GET', '/ISAPI/System/deviceInfo');
      return json(res, 200, { ok: true, model: tag(xml, 'model'), name: tag(xml, 'deviceName'), firmware: tag(xml, 'firmwareVersion') });
    } catch (e) {
      return json(res, 200, { ok: false, error: e.message });
    } finally {
      digestCache.delete(d.id);
    }
  }

  /* ----- Kasdienė ataskaita ----- */
  if (p === '/api/admin/report' && req.method === 'GET') {
    const rc = reportCfg();
    const { telegramToken, ...pub } = rc;
    return json(res, 200, { settings: { ...pub, hasToken: !!telegramToken }, last: lastReport });
  }
  if (p === '/api/admin/report/settings' && req.method === 'POST') {
    const b = await readJson(req);
    const rc = reportCfg();
    const time = String(b.time || '08:00');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw httpErr(400, T('badTime'));
    const wh = String(b.webhookUrl || '').trim();
    if (wh && !/^https?:\/\/\S+$/i.test(wh)) throw httpErr(400, T('rpBadUrl'));
    const token = b.telegramToken === undefined || b.telegramToken === '' ? rc.telegramToken : String(b.telegramToken).trim();
    if (token && !/^\d+:[\w-]{20,}$/.test(token)) throw httpErr(400, T('rpBadToken'));
    config.report = {
      enabled: !!b.enabled, time, onlyProblems: !!b.onlyProblems,
      telegramToken: b.clearToken ? '' : token, telegramChat: String(b.telegramChat || '').trim().slice(0, 64),
      webhookUrl: wh, lastSent: rc.lastSent,
    };
    saveConfig();
    return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/report/run' && req.method === 'POST') {
    const rep = await runReport(q.get('send') === '1');
    return json(res, 200, rep);
  }

  /* ----- Diskai ----- */
  if (p === '/api/admin/storage' && req.method === 'GET') {
    const force = q.get('refresh') === '1';
    return json(res, 200, await Promise.all([...devices.values()].map((d) => getStorage(d, force))));
  }

  /* ----- Sistema ----- */
  if (p === '/api/admin/system' && req.method === 'GET') {
    return json(res, 200, {
      settings: systemSettings(),
      info: {
        version: VERSION,
        uptime: Math.round((Date.now() - STARTED) / 1000),
        node: process.version,
        ffmpeg: await ffmpegVersion(),
        streams: [...streams.values()].map((x) => ({
          id: x.id, device: (devices.get(x.devId) || {}).name || x.devId, live: x.live,
          channel: (x.key.split(':')[2] || ''), idle: Math.round((Date.now() - x.last) / 1000),
        })),
        sessions: [...sessions.values()].filter((x) => x.expires > Date.now()).length,
        listening,
        configPath: CONFIG_PATH,
        go2rtc: await g2rInfo(),
        rtsp: await Promise.all([...devices.values()].map(async (d) => {
          rtspCheck.delete(d.id);
          const st = await rtspReachable(d);
          return { name: d.name || d.id, addr: `${d.host}:${d.rtspPort}`, ok: st.ok, err: st.err };
        })),
      },
    });
  }
  if (p === '/api/admin/system' && req.method === 'POST') {
    const b = await readJson(req);
    const next = cleanSystem(b);
    const portChanged = next.port !== listening.port || next.bind !== listening.bind;
    if (portChanged && next.port !== listening.port) {
      const err = await testPort(next.port, next.bind);
      if (err === 'EADDRINUSE') throw httpErr(400, T('portInUse', { port: next.port }));
      if (err === 'EACCES') throw httpErr(400, T('portDenied', { port: next.port }));
      if (err) throw httpErr(400, T('portFail', { port: next.port }) + ': ' + err);
    }
    if (next.go2rtcUrl !== config.go2rtcUrl) g2rRegistered.clear();
    Object.assign(config, next);
    if (!config.siteName) delete config.siteName;
    saveConfig();
    json(res, 200, { ok: true, portChanged, port: next.port, settings: systemSettings() });
    if (portChanged) setTimeout(() => switchListen(next.port, next.bind).catch(() => {}), 500);
    return;
  }
  if (p === '/api/admin/stop-streams' && req.method === 'POST') {
    const n = streams.size;
    for (const id of [...streams.keys()]) stopStream(id);
    return json(res, 200, { ok: true, stopped: n });
  }

  /* ----- Vartotojai ----- */
  const admins = () => config.users.filter((u) => u.role === 'admin');
  if (p === '/api/admin/users' && req.method === 'GET') {
    return json(res, 200, config.users.map(publicUser));
  }
  if (p === '/api/admin/users' && req.method === 'POST') {
    const b = await readJson(req);
    const username = String(b.username || '').trim();
    if (!/^[\w.@-]{2,40}$/.test(username)) throw httpErr(400, T('badUsername'));
    const role = b.role === 'admin' ? 'admin' : 'viewer';
    let devs = null;
    if (role === 'viewer' && Array.isArray(b.devices)) devs = b.devices.map(String).filter((id) => devices.has(id));
    let u = findUser(b.original || username);
    if (b.original && !u) throw httpErr(404, T('userNotFound'));
    if (!b.original && u) throw httpErr(400, T('userExists'));
    if (b.original && b.original !== username && findUser(username)) throw httpErr(400, T('userExists'));
    if (!u) {
      validatePassword(b.password);
      u = { username };
      config.users.push(u);
    } else {
      if (u.role === 'admin' && role !== 'admin' && admins().length === 1) throw httpErr(400, T('lastAdmin'));
      if (b.password) validatePassword(b.password);
      if (u.username !== username) {
        for (const [t, s] of sessions) if (s.username === u.username) s.username = username;
        u.username = username;
      }
    }
    u.role = role;
    if (devs) u.devices = devs; else delete u.devices;
    if (b.noIdleLogout) u.noIdleLogout = true; else delete u.noIdleLogout;
    if (b.password) { u.passwordHash = hashPassword(b.password); delete u.password; delete u.passwordSha256; }
    saveConfig();
    return json(res, 200, publicUser(u));
  }
  if (p === '/api/admin/users' && req.method === 'DELETE') {
    const name = String(q.get('username'));
    const u = findUser(name);
    if (!u) throw httpErr(404, T('userNotFound'));
    if (u === user) throw httpErr(400, T('deleteSelf'));
    if (u.role === 'admin' && admins().length === 1) throw httpErr(400, T('lastAdmin'));
    config.users = config.users.filter((x) => x !== u);
    for (const [t, s] of sessions) if (s.username === name) sessions.delete(t);
    saveConfig();
    return json(res, 200, { ok: true });
  }
  throw httpErr(404, T('notFound'));
}

const onRequest = (req, res) => reqCtx.run({ lang: langOf(req) }, () => {
  handle(req, res).catch((e) => {
    console.error(req.url.replace(/[?].*/, ''), e.message);
    if (!res.headersSent) json(res, e.status || 500, { error: e.message });
    else res.end();
  });
});

let server = null;
const allServers = new Set();
let listening = { port: config.port || 8080, bind: config.bind || '0.0.0.0' };

/** Paleidžia web serverį nurodytu prievadu. */
function listenOn(port, bind) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer(onRequest);
    srv.once('error', reject);
    srv.listen(port, bind, () => {
      srv.removeListener('error', reject);
      srv.on('error', (e) => console.error('HTTP serverio klaida:', e.message));
      allServers.add(srv);
      srv.on('close', () => allServers.delete(srv));
      resolve(srv);
    });
  });
}

/** Patikrina, ar prievadas laisvas ir leidžiamas (nieko nepaleidžia). */
function testPort(port, bind) {
  return new Promise((resolve) => {
    const t = require('net').createServer();
    t.once('error', (e) => resolve(e.code || e.message));
    t.listen(port, bind, () => t.close(() => resolve(null)));
  });
}

/** Perjungia web serverį į kitą prievadą / adresą. Senas jungtis leidžia užbaigti. */
const closeServer = (srv) => { srv.close(); if (srv.closeIdleConnections) srv.closeIdleConnections(); };
let switching = Promise.resolve();
function switchListen(port, bind) {
  switching = switching.catch(() => {}).then(() => doSwitch(port, bind));
  return switching;
}
async function doSwitch(port, bind) {
  const oldL = listening;
  if (port === oldL.port && bind === oldL.bind) return;
  const samePort = port === oldL.port;
  if (samePort) {
    await Promise.race([
      Promise.all([...allServers].map((srv) => new Promise((r) => { srv.close(() => r()); if (srv.closeIdleConnections) srv.closeIdleConnections(); }))),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  }
  try {
    const fresh = await listenOn(port, bind);
    server = fresh;
    listening = { port, bind };
    for (const srv of [...allServers]) if (srv !== fresh) closeServer(srv);
    console.log(`HikWeb dabar veikia: http://${bind === '0.0.0.0' || bind === '::' ? 'localhost' : bind}:${port}`);
  } catch (e) {
    console.error(`Nepavyko perjungti į ${bind}:${port}:`, e.message, '– paliekamas senas prievadas');
    if (samePort) server = await listenOn(oldL.port, oldL.bind);
    throw e;
  }
}

listenOn(listening.port, listening.bind).then((srv) => {
  server = srv;
  console.log(`HikWeb ${VERSION} veikia: http://localhost:${listening.port}  (įrenginių: ${devices.size})`);
}).catch((e) => {
  console.error(`Nepavyko paleisti ${listening.bind}:${listening.port}: ${e.message}`);
  if (e.code === 'EADDRINUSE') console.error('Prievadas užimtas – config.json pakeiskite "port".');
  if (e.code === 'EACCES') console.error('Prievadams < 1024 reikia teisių: setcap cap_net_bind_service=+ep $(which node)');
  process.exit(1);
});

const shutdown = () => {
  Promise.race([Promise.all([...streams.keys()].map(stopStream)), sleep(3500)]).then(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
