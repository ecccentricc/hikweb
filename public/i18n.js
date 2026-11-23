'use strict';
/* Sąsajos vertimai / UI translations / Переклади інтерфейсу.
 * Norėdami pridėti kalbą: nukopijuokite „en“ bloką, išverskite ir įrašykite į LANG_NAMES. */
const LANG_NAMES = { lt: 'Lietuvių', en: 'English', uk: 'Українська' };

const I18N = {
  lt: {
    grid: 'Tinklelis',
    'rep.title': 'Kasdienė ataskaita', 'rep.enabled': 'Siųsti kasdienę NVR sveikatos ataskaitą', 'rep.time': 'Siuntimo laikas', 'rep.onlyProblems': 'Siųsti tik kai yra problemų',
    'rep.tgToken': 'Telegram boto raktas', 'rep.tgChat': 'Telegram pokalbio ID',
    'rep.tgHint': 'Botą sukursite parašę @BotFather Telegram programoje (/newbot). Tada parašykite savo botui bet ką, o pokalbio ID sužinosite parašę @userinfobot.',
    'rep.webhook': 'Webhook adresas (pvz. Home Assistant)', 'rep.webhookHint': 'Home Assistant: sukurkite automatizaciją su „Webhook“ paleidikliu ir veiksmu notify, kur pranešimas = {{ trigger.json.message }}.',
    'rep.preview': 'Peržiūrėti dabar', 'rep.sendNow': 'Siųsti dabar', 'rep.running': 'Tikrinamos kameros ir diskai…', 'rep.noTarget': 'Nenurodytas nei Telegram, nei webhook.',
    'sys.idleLogout': 'Atjungti po neveiklumo (min.)', 'sys.idleLogoutHint': '0 – niekada. Likus minutei rodomas įspėjimas.',
    'dlg.noIdle': 'Neatjungti dėl neveiklumo (pvz. ekranas ant sienos)',
    'idle.title': 'Ar dar čia?', 'idle.text': 'Dėl neveiklumo būsite atjungti po {s} s.', 'idle.stay': 'Likti prisijungus', 'idle.loggedOut': 'Atjungta dėl neveiklumo. Prisijunkite iš naujo.',
    'sys.thumbs': 'Miniatiūros įrašų laiko juostoje', 'sys.thumbsHint': 'Užvedus pelę ant laiko juostos rodomas kadras iš to momento. Kiekvienai miniatiūrai NVR trumpam atidaro įrašą, todėl labai senam NVR ši funkcija gali būti per sunki.',
    'disk.title': 'NVR diskai', 'disk.refresh': 'Atnaujinti', 'disk.name': 'Diskas', 'disk.status': 'Būsena', 'disk.capacity': 'Talpa', 'disk.used': 'Užimta', 'disk.oldest': 'Seniausias įrašas: {d}', 'disk.retention': '≈ {n} d. įrašų', 'disk.daysLeft': 'Vietos užteks dar ≈ {n} d.', 'disk.full': 'Diskas pilnas, todėl seniausi įrašai automatiškai perrašomi.', 'disk.error': 'Nepavyko gauti disko informacijos', 'disk.alert': '{dev}: {disk} – {status}',
    'rec.addCam': '+ Pridėti kamerą', 'flt.motion': 'Judesys', 'flt.continuous': 'Nuolatinis', 'flt.alarm': 'Signalas',
    'sys.webrtc': 'Greitas tiesioginis vaizdas (WebRTC per go2rtc)', 'sys.g2rUrl': 'go2rtc adresas', 'sys.webrtcHint': 'Vėlavimas mažesnis nei 1 s. Reikia įdiegti go2rtc (žr. install-go2rtc.sh). Jei WebRTC neveikia, automatiškai naudojamas HLS.', 'sys.off': 'išjungta', 'sys.g2rOk': 'veikia',
    'sys.fastDl': 'Greitas įrašų atsisiuntimas iš NVR disko', 'sys.fastDlHint': 'Įrašai atsisiunčiami kelis kartus greičiau, bet be garso. Jei atsisiųstas įrašas būna ne to laiko, šią funkciją išjunkite.',
    'ch.offline': 'neprisijungusi',
    'sys.title': 'Sistema', 'sys.siteName': 'Svetainės pavadinimas', 'sys.siteNamePh': 'pvz. Vėtrungių 15 kameros',
    'sys.port': 'Web prievadas', 'sys.portHint': 'Pakeitus prievadą, svetainė iškart persijungs į naują adresą.',
    'sys.bind': 'Klausymosi adresas', 'sys.bindHint': '0.0.0.0 – pasiekiama iš viso tinklo, 127.0.0.1 – tik iš šio serverio',
    'sys.lang': 'Numatytoji kalba', 'sys.langAuto': 'Pagal naršyklę', 'sys.theme': 'Numatytoji tema',
    'sys.session': 'Prisijungimo trukmė (val.)', 'sys.idle': 'Sustabdyti nežiūrimą srautą po (s)',
    'sys.maxStreams': 'Daugiausia srautų vienu metu', 'sys.maxDl': 'Ilgiausias atsisiuntimas (min.)',
    'sys.secure': 'Saugūs slapukai (tik HTTPS)', 'sys.secureHint': 'Įjunkite tik tada, kai svetainė atidaroma per HTTPS (pvz. per Caddy ar nginx). Kitaip nepavyks prisijungti.',
    'sys.saved': '✓ Išsaugota', 'sys.switching': 'Perjungiama į {url}…', 'sys.status': 'Būsena', 'sys.version': 'Versija',
    'sys.uptime': 'Veikia', 'sys.streams': 'Aktyvūs srautai', 'sys.sessions': 'Prisijungusių sesijų', 'sys.config': 'Nustatymų failas',
    'sys.listening': 'Adresas', 'sys.stopAll': 'Sustabdyti visus srautus', 'sys.stopped': 'Sustabdyta srautų: {n}',
    'sys.live': 'tiesiogiai', 'sys.playback': 'įrašas', 'up.days': '{d} d. {h} val. {m} min.',
    appearance: 'Išvaizda', theme: 'Tema', 'theme.dark': 'Tamsi', 'theme.light': 'Šviesi', 'theme.blue': 'Mėlyna', 'theme.auto': 'Automatinė (pagal sistemą)',
    'app.subtitle': 'Kamerų ir NVR peržiūra',
    'login.user': 'Vartotojas', 'login.pass': 'Slaptažodis', 'login.submit': 'Prisijungti',
    'tab.live': 'Tiesiogiai', 'tab.rec': 'Įrašai', 'tab.set': 'Nustatymai',
    logout: 'Atsijungti', language: 'Kalba',
    'side.devices': 'Įrenginiai', 'side.cameras': 'Kameros',
    'live.hint': 'Pasirinkite langelį ir spustelėkite kamerą kairėje. Dukart spustelėjus langelį atsidaro visas ekranas ir aukšta kokybė.',
    'tile.quality': 'Kokybė', 'tile.snap': 'Nuotrauka', 'tile.rec': 'Įrašai', 'tile.fs': 'Visas ekranas', 'tile.close': 'Uždaryti',
    'rec.search': 'Ieškoti', 'rec.dlTitle': 'Atsisiųsti ištrauką:', 'rec.dlBtn': 'Atsisiųsti MP4',
    'rec.dlNote': 'Įrašas siunčiamas tiesiai iš NVR disko. Jei NVR to nepalaiko, siunčiama realiu laiku.',
    'rec.start': 'Pradžia', 'rec.end': 'Pabaiga', 'rec.dur': 'Trukmė', 'rec.type': 'Tipas',
    'rec.watch': '▶ Žiūrėti', 'rec.download': '⬇ Atsisiųsti',
    'rec.searching': 'Ieškoma…', 'rec.found': 'Rasta įrašų: {n} ({d})', 'rec.noneDay': 'Šią dieną įrašų nėra',
    'rec.noneAt': 'Šiuo laiku įrašo nėra', 'rec.loading': 'Kraunamas įrašas…',
    'rec.broken': 'Atkūrimas nutrūko. Spustelėkite laiko juostą, kad tęstumėte.',
    'rec.needTime': 'Nurodykite laiką', 'rec.endAfter': 'Pabaiga turi būti vėliau nei pradžia',
    'type.CMR': 'Nuolatinis', 'type.MOTION': 'Judesys', 'type.ALARM': 'Signalas', 'type.EDR': 'Įvykis',
    'type.ALARMANDMOTION': 'Judesys ir signalas', 'type.Command': 'Rankinis', 'type.SMART': 'Išmanus', 'type.timing': 'Nuolatinis',
    'type.VMD': 'Judesys', 'type.manual': 'Rankinis',
    'dur.h': '{h} h {m} min', 'dur.m': '{m} min {s} s',
    'live.connecting': 'Jungiamasi…', 'live.reconnecting': 'Ryšys nutrūko, jungiamasi iš naujo…',
    'dev.none': 'Įrenginių nėra', 'kind.nvr': 'NVR', 'kind.camera': 'Kamera', 'ch.short': 'K{n}',
    'err.notLogged': 'Neprisijungta', 'err.http': 'Klaida {n}', 'err.noHls': 'Naršyklė nepalaiko HLS',
    'set.devices': 'Kameros ir NVR', 'set.addDevice': '+ Pridėti įrenginį',
    'set.th.name': 'Pavadinimas', 'set.th.type': 'Tipas', 'set.th.address': 'Adresas', 'set.th.user': 'Vartotojas', 'set.th.video': 'Vaizdas',
    'set.noDevices': 'Įrenginių dar nėra. Pridėkite pirmąjį.',
    'set.users': 'Vartotojai', 'set.addUser': '+ Pridėti vartotoją',
    'set.th.username': 'Vartotojas', 'set.th.role': 'Rolė', 'set.th.sees': 'Mato įrenginius',
    'set.myPw': 'Mano slaptažodis', 'pw.current': 'Dabartinis', 'pw.new': 'Naujas (min. 6)', 'pw.repeat': 'Pakartokite naują',
    'pw.change': 'Pakeisti', 'pw.mismatch': 'Nauji slaptažodžiai nesutampa', 'pw.changed': '✓ Slaptažodis pakeistas',
    edit: 'Redaguoti', remove: 'Šalinti', cancel: 'Atšaukti', save: 'Išsaugoti', all: 'Visus', you: '(jūs)',
    unchanged: 'nepakeistas', min6: 'min. 6 simboliai', noAudio: ', be garso',
    'video.copy': 'H.264', 'video.h265': 'H.265', 'video.transcode': 'Perkoduojama',
    'role.admin': 'Administratorius', 'role.viewer': 'Žiūrovas',
    'confirm.delDevice': 'Pašalinti „{name}“?', 'confirm.delUser': 'Pašalinti vartotoją „{name}“?',
    'dlg.newDevice': 'Naujas įrenginys', 'dlg.editDevice': 'Redaguoti įrenginį',
    'dlg.name': 'Pavadinimas', 'dlg.namePh': 'pvz. NVR arba Kiemo kamera', 'dlg.type': 'Tipas',
    'dlg.typeNvr': 'NVR / DVR', 'dlg.typeCam': 'Kamera', 'dlg.host': 'IP adresas', 'dlg.httpPort': 'HTTP prievadas',
    'dlg.rtspPort': 'RTSP prievadas', 'dlg.user': 'Vartotojas', 'dlg.pass': 'Slaptažodis', 'dlg.codec': 'Vaizdo kodekas',
    'dlg.codecCopy': 'H.264 (rekomenduojama)', 'dlg.codecH265': 'H.265 be perkodavimo', 'dlg.codecTranscode': 'Perkoduoti į H.264 (didelė CPU apkrova)',
    'dlg.audio': 'Garsas', 'dlg.test': 'Tikrinti ryšį', 'dlg.testing': 'Jungiamasi…', 'dlg.connected': '✓ Prisijungta',
    'dlg.newUser': 'Naujas vartotojas', 'dlg.editUser': 'Redaguoti vartotoją', 'dlg.username': 'Vartotojo vardas',
    'dlg.role': 'Rolė', 'dlg.roleViewer': 'Žiūrovas: tik peržiūra ir įrašai', 'dlg.roleAdmin': 'Administratorius: gali keisti nustatymus',
    'dlg.allDevices': 'Mato visus įrenginius',
  },

  en: {
    grid: 'Grid',
    'rep.title': 'Daily report', 'rep.enabled': 'Send a daily NVR health report', 'rep.time': 'Send time', 'rep.onlyProblems': 'Send only when there are problems',
    'rep.tgToken': 'Telegram bot token', 'rep.tgChat': 'Telegram chat ID',
    'rep.tgHint': 'Create a bot by messaging @BotFather in Telegram (/newbot). Then send your bot any message and get your chat ID from @userinfobot.',
    'rep.webhook': 'Webhook URL (e.g. Home Assistant)', 'rep.webhookHint': 'Home Assistant: create an automation with a “Webhook” trigger and a notify action with message = {{ trigger.json.message }}.',
    'rep.preview': 'Preview now', 'rep.sendNow': 'Send now', 'rep.running': 'Checking cameras and disks…', 'rep.noTarget': 'Neither Telegram nor a webhook is set.',
    'sys.idleLogout': 'Log out after inactivity (min)', 'sys.idleLogoutHint': '0 = never. A warning is shown one minute before.',
    'dlg.noIdle': 'Never log out for inactivity (e.g. a wall display)',
    'idle.title': 'Still there?', 'idle.text': 'You will be logged out in {s} s due to inactivity.', 'idle.stay': 'Stay logged in', 'idle.loggedOut': 'Logged out due to inactivity. Please log in again.',
    'sys.thumbs': 'Thumbnails on the recordings timeline', 'sys.thumbsHint': 'Hovering over the timeline shows a frame from that moment. Each thumbnail briefly opens a recording on the NVR, so very old NVRs may struggle with it.',
    'disk.title': 'NVR disks', 'disk.refresh': 'Refresh', 'disk.name': 'Disk', 'disk.status': 'Status', 'disk.capacity': 'Capacity', 'disk.used': 'Used', 'disk.oldest': 'Oldest recording: {d}', 'disk.retention': '≈ {n} days of recordings', 'disk.daysLeft': 'Space left for ≈ {n} more days', 'disk.full': 'The disk is full, so the oldest recordings are overwritten automatically.', 'disk.error': 'Could not read disk information', 'disk.alert': '{dev}: {disk} – {status}',
    'rec.addCam': '+ Add camera', 'flt.motion': 'Motion', 'flt.continuous': 'Continuous', 'flt.alarm': 'Alarm',
    'sys.webrtc': 'Fast live view (WebRTC via go2rtc)', 'sys.g2rUrl': 'go2rtc address', 'sys.webrtcHint': 'Less than 1 s delay. Requires go2rtc (see install-go2rtc.sh). If WebRTC fails, HLS is used automatically.', 'sys.off': 'off', 'sys.g2rOk': 'running',
    'sys.fastDl': 'Fast download from the NVR disk', 'sys.fastDlHint': 'Clips download several times faster, but without audio. If a downloaded clip shows the wrong time, turn this off.',
    'ch.offline': 'offline',
    'sys.title': 'System', 'sys.siteName': 'Site name', 'sys.siteNamePh': 'e.g. Building 15 cameras',
    'sys.port': 'Web port', 'sys.portHint': 'After changing the port the site switches to the new address right away.',
    'sys.bind': 'Listen address', 'sys.bindHint': '0.0.0.0 – reachable from the whole network, 127.0.0.1 – this server only',
    'sys.lang': 'Default language', 'sys.langAuto': 'Browser language', 'sys.theme': 'Default theme',
    'sys.session': 'Login session length (hours)', 'sys.idle': 'Stop unwatched stream after (s)',
    'sys.maxStreams': 'Max simultaneous streams', 'sys.maxDl': 'Max download length (min)',
    'sys.secure': 'Secure cookies (HTTPS only)', 'sys.secureHint': 'Enable only when the site is opened over HTTPS (e.g. via Caddy or nginx), otherwise login will fail.',
    'sys.saved': '✓ Saved', 'sys.switching': 'Switching to {url}…', 'sys.status': 'Status', 'sys.version': 'Version',
    'sys.uptime': 'Uptime', 'sys.streams': 'Active streams', 'sys.sessions': 'Login sessions', 'sys.config': 'Settings file',
    'sys.listening': 'Address', 'sys.stopAll': 'Stop all streams', 'sys.stopped': 'Streams stopped: {n}',
    'sys.live': 'live', 'sys.playback': 'playback', 'up.days': '{d} d {h} h {m} min',
    appearance: 'Appearance', theme: 'Theme', 'theme.dark': 'Dark', 'theme.light': 'Light', 'theme.blue': 'Blue', 'theme.auto': 'Automatic (system)',
    'app.subtitle': 'Camera and NVR viewer',
    'login.user': 'Username', 'login.pass': 'Password', 'login.submit': 'Log in',
    'tab.live': 'Live', 'tab.rec': 'Recordings', 'tab.set': 'Settings',
    logout: 'Log out', language: 'Language',
    'side.devices': 'Devices', 'side.cameras': 'Cameras',
    'live.hint': 'Select a tile, then click a camera on the left. Double-click a tile for full screen and high quality.',
    'tile.quality': 'Quality', 'tile.snap': 'Snapshot', 'tile.rec': 'Recordings', 'tile.fs': 'Full screen', 'tile.close': 'Close',
    'rec.search': 'Search', 'rec.dlTitle': 'Download clip:', 'rec.dlBtn': 'Download MP4',
    'rec.dlNote': 'Clips are downloaded straight from the NVR disk. If the NVR does not support this, they download in real time.',
    'rec.start': 'Start', 'rec.end': 'End', 'rec.dur': 'Duration', 'rec.type': 'Type',
    'rec.watch': '▶ Play', 'rec.download': '⬇ Download',
    'rec.searching': 'Searching…', 'rec.found': 'Recordings found: {n} ({d})', 'rec.noneDay': 'No recordings on this day',
    'rec.noneAt': 'No recording at this time', 'rec.loading': 'Loading recording…',
    'rec.broken': 'Playback stopped. Click the timeline to continue.',
    'rec.needTime': 'Please enter a time', 'rec.endAfter': 'End must be after start',
    'type.CMR': 'Continuous', 'type.MOTION': 'Motion', 'type.ALARM': 'Alarm', 'type.EDR': 'Event',
    'type.ALARMANDMOTION': 'Motion and alarm', 'type.Command': 'Manual', 'type.SMART': 'Smart', 'type.timing': 'Continuous',
    'type.VMD': 'Motion', 'type.manual': 'Manual',
    'dur.h': '{h} h {m} min', 'dur.m': '{m} min {s} s',
    'live.connecting': 'Connecting…', 'live.reconnecting': 'Connection lost, reconnecting…',
    'dev.none': 'No devices', 'kind.nvr': 'NVR', 'kind.camera': 'Camera', 'ch.short': 'Ch{n}',
    'err.notLogged': 'Not logged in', 'err.http': 'Error {n}', 'err.noHls': 'This browser does not support HLS',
    'set.devices': 'Cameras and NVRs', 'set.addDevice': '+ Add device',
    'set.th.name': 'Name', 'set.th.type': 'Type', 'set.th.address': 'Address', 'set.th.user': 'Username', 'set.th.video': 'Video',
    'set.noDevices': 'No devices yet. Add the first one.',
    'set.users': 'Users', 'set.addUser': '+ Add user',
    'set.th.username': 'Username', 'set.th.role': 'Role', 'set.th.sees': 'Can see',
    'set.myPw': 'My password', 'pw.current': 'Current', 'pw.new': 'New (min. 6)', 'pw.repeat': 'Repeat new',
    'pw.change': 'Change', 'pw.mismatch': 'New passwords do not match', 'pw.changed': '✓ Password changed',
    edit: 'Edit', remove: 'Remove', cancel: 'Cancel', save: 'Save', all: 'All', you: '(you)',
    unchanged: 'unchanged', min6: 'min. 6 characters', noAudio: ', no audio',
    'video.copy': 'H.264', 'video.h265': 'H.265', 'video.transcode': 'Transcoded',
    'role.admin': 'Administrator', 'role.viewer': 'Viewer',
    'confirm.delDevice': 'Remove "{name}"?', 'confirm.delUser': 'Remove user "{name}"?',
    'dlg.newDevice': 'New device', 'dlg.editDevice': 'Edit device',
    'dlg.name': 'Name', 'dlg.namePh': 'e.g. NVR or Yard camera', 'dlg.type': 'Type',
    'dlg.typeNvr': 'NVR / DVR', 'dlg.typeCam': 'Camera', 'dlg.host': 'IP address', 'dlg.httpPort': 'HTTP port',
    'dlg.rtspPort': 'RTSP port', 'dlg.user': 'Username', 'dlg.pass': 'Password', 'dlg.codec': 'Video codec',
    'dlg.codecCopy': 'H.264 (recommended)', 'dlg.codecH265': 'H.265 without transcoding', 'dlg.codecTranscode': 'Transcode to H.264 (high CPU load)',
    'dlg.audio': 'Audio', 'dlg.test': 'Test connection', 'dlg.testing': 'Connecting…', 'dlg.connected': '✓ Connected',
    'dlg.newUser': 'New user', 'dlg.editUser': 'Edit user', 'dlg.username': 'Username',
    'dlg.role': 'Role', 'dlg.roleViewer': 'Viewer: live view and recordings only', 'dlg.roleAdmin': 'Administrator: can change settings',
    'dlg.allDevices': 'Can see all devices',
  },

  uk: {
    grid: 'Сітка',
    'rep.title': 'Щоденний звіт', 'rep.enabled': 'Надсилати щоденний звіт про стан NVR', 'rep.time': 'Час надсилання', 'rep.onlyProblems': 'Надсилати лише за наявності проблем',
    'rep.tgToken': 'Токен Telegram-бота', 'rep.tgChat': 'ID чату Telegram',
    'rep.tgHint': 'Створіть бота, написавши @BotFather у Telegram (/newbot). Потім напишіть своєму боту будь-що, а ID чату дізнаєтеся в @userinfobot.',
    'rep.webhook': 'Адреса webhook (напр. Home Assistant)', 'rep.webhookHint': 'Home Assistant: створіть автоматизацію з тригером «Webhook» і дією notify, де повідомлення = {{ trigger.json.message }}.',
    'rep.preview': 'Переглянути зараз', 'rep.sendNow': 'Надіслати зараз', 'rep.running': 'Перевіряються камери та диски…', 'rep.noTarget': 'Не вказано ні Telegram, ні webhook.',
    'sys.idleLogout': 'Вихід після бездіяльності (хв)', 'sys.idleLogoutHint': '0 – ніколи. За хвилину до цього показується попередження.',
    'dlg.noIdle': 'Не виходити через бездіяльність (напр. екран на стіні)',
    'idle.title': 'Ви ще тут?', 'idle.text': 'Через бездіяльність вас буде відключено за {s} с.', 'idle.stay': 'Залишитися в системі', 'idle.loggedOut': 'Вихід через бездіяльність. Увійдіть знову.',
    'sys.thumbs': 'Мініатюри на шкалі записів', 'sys.thumbsHint': 'Під час наведення на шкалу часу показується кадр із того моменту. Для кожної мініатюри NVR ненадовго відкриває запис, тому для дуже старого NVR це може бути заважко.',
    'disk.title': 'Диски NVR', 'disk.refresh': 'Оновити', 'disk.name': 'Диск', 'disk.status': 'Стан', 'disk.capacity': 'Ємність', 'disk.used': 'Зайнято', 'disk.oldest': 'Найстаріший запис: {d}', 'disk.retention': '≈ {n} дн. записів', 'disk.daysLeft': 'Місця вистачить ще на ≈ {n} дн.', 'disk.full': 'Диск заповнений, тому найстаріші записи автоматично перезаписуються.', 'disk.error': 'Не вдалося отримати дані диска', 'disk.alert': '{dev}: {disk} – {status}',
    'rec.addCam': '+ Додати камеру', 'flt.motion': 'Рух', 'flt.continuous': 'Постійний', 'flt.alarm': 'Тривога',
    'sys.webrtc': 'Швидке відео наживо (WebRTC через go2rtc)', 'sys.g2rUrl': 'Адреса go2rtc', 'sys.webrtcHint': 'Затримка менше 1 с. Потрібно встановити go2rtc (див. install-go2rtc.sh). Якщо WebRTC не працює, автоматично використовується HLS.', 'sys.off': 'вимкнено', 'sys.g2rOk': 'працює',
    'sys.fastDl': 'Швидке завантаження з диска NVR', 'sys.fastDlHint': 'Записи завантажуються в кілька разів швидше, але без звуку. Якщо завантажений запис показує не той час, вимкніть цю функцію.',
    'ch.offline': 'не в мережі',
    'sys.title': 'Система', 'sys.siteName': 'Назва сайту', 'sys.siteNamePh': 'напр. Камери будинку 15',
    'sys.port': 'Веб-порт', 'sys.portHint': 'Після зміни порту сайт одразу перейде на нову адресу.',
    'sys.bind': 'Адреса прослуховування', 'sys.bindHint': '0.0.0.0 – доступно з усієї мережі, 127.0.0.1 – лише з цього сервера',
    'sys.lang': 'Мова за замовчуванням', 'sys.langAuto': 'Як у браузері', 'sys.theme': 'Тема за замовчуванням',
    'sys.session': 'Тривалість входу (год)', 'sys.idle': 'Зупиняти потік без глядачів через (с)',
    'sys.maxStreams': 'Максимум потоків одночасно', 'sys.maxDl': 'Найдовше завантаження (хв)',
    'sys.secure': 'Захищені cookie (лише HTTPS)', 'sys.secureHint': 'Вмикайте лише тоді, коли сайт відкривається через HTTPS (напр. через Caddy чи nginx), інакше вхід не працюватиме.',
    'sys.saved': '✓ Збережено', 'sys.switching': 'Перехід на {url}…', 'sys.status': 'Стан', 'sys.version': 'Версія',
    'sys.uptime': 'Працює', 'sys.streams': 'Активні потоки', 'sys.sessions': 'Сесій входу', 'sys.config': 'Файл налаштувань',
    'sys.listening': 'Адреса', 'sys.stopAll': 'Зупинити всі потоки', 'sys.stopped': 'Зупинено потоків: {n}',
    'sys.live': 'наживо', 'sys.playback': 'запис', 'up.days': '{d} дн {h} год {m} хв',
    appearance: 'Вигляд', theme: 'Тема', 'theme.dark': 'Темна', 'theme.light': 'Світла', 'theme.blue': 'Синя', 'theme.auto': 'Автоматична (як у системі)',
    'app.subtitle': 'Перегляд камер і NVR',
    'login.user': 'Користувач', 'login.pass': 'Пароль', 'login.submit': 'Увійти',
    'tab.live': 'Наживо', 'tab.rec': 'Записи', 'tab.set': 'Налаштування',
    logout: 'Вийти', language: 'Мова',
    'side.devices': 'Пристрої', 'side.cameras': 'Камери',
    'live.hint': 'Виберіть комірку й натисніть камеру ліворуч. Подвійне клацання по комірці відкриває повний екран у високій якості.',
    'tile.quality': 'Якість', 'tile.snap': 'Знімок', 'tile.rec': 'Записи', 'tile.fs': 'Повний екран', 'tile.close': 'Закрити',
    'rec.search': 'Шукати', 'rec.dlTitle': 'Завантажити фрагмент:', 'rec.dlBtn': 'Завантажити MP4',
    'rec.dlNote': 'Запис завантажується напряму з диска NVR. Якщо NVR цього не підтримує – у реальному часі.',
    'rec.start': 'Початок', 'rec.end': 'Кінець', 'rec.dur': 'Тривалість', 'rec.type': 'Тип',
    'rec.watch': '▶ Дивитися', 'rec.download': '⬇ Завантажити',
    'rec.searching': 'Пошук…', 'rec.found': 'Знайдено записів: {n} ({d})', 'rec.noneDay': 'Цього дня записів немає',
    'rec.noneAt': 'У цей час запису немає', 'rec.loading': 'Завантаження запису…',
    'rec.broken': 'Відтворення перервано. Натисніть на шкалу часу, щоб продовжити.',
    'rec.needTime': 'Вкажіть час', 'rec.endAfter': 'Кінець має бути пізніше за початок',
    'type.CMR': 'Постійний', 'type.MOTION': 'Рух', 'type.ALARM': 'Тривога', 'type.EDR': 'Подія',
    'type.ALARMANDMOTION': 'Рух і тривога', 'type.Command': 'Ручний', 'type.SMART': 'Розумний', 'type.timing': 'Постійний',
    'type.VMD': 'Рух', 'type.manual': 'Ручний',
    'dur.h': '{h} год {m} хв', 'dur.m': '{m} хв {s} с',
    'live.connecting': 'Підключення…', 'live.reconnecting': 'Зв’язок втрачено, повторне підключення…',
    'dev.none': 'Немає пристроїв', 'kind.nvr': 'NVR', 'kind.camera': 'Камера', 'ch.short': 'К{n}',
    'err.notLogged': 'Вхід не виконано', 'err.http': 'Помилка {n}', 'err.noHls': 'Браузер не підтримує HLS',
    'set.devices': 'Камери та NVR', 'set.addDevice': '+ Додати пристрій',
    'set.th.name': 'Назва', 'set.th.type': 'Тип', 'set.th.address': 'Адреса', 'set.th.user': 'Користувач', 'set.th.video': 'Відео',
    'set.noDevices': 'Пристроїв ще немає. Додайте перший.',
    'set.users': 'Користувачі', 'set.addUser': '+ Додати користувача',
    'set.th.username': 'Користувач', 'set.th.role': 'Роль', 'set.th.sees': 'Бачить пристрої',
    'set.myPw': 'Мій пароль', 'pw.current': 'Поточний', 'pw.new': 'Новий (мін. 6)', 'pw.repeat': 'Повторіть новий',
    'pw.change': 'Змінити', 'pw.mismatch': 'Нові паролі не збігаються', 'pw.changed': '✓ Пароль змінено',
    edit: 'Редагувати', remove: 'Видалити', cancel: 'Скасувати', save: 'Зберегти', all: 'Усі', you: '(ви)',
    unchanged: 'без змін', min6: 'мін. 6 символів', noAudio: ', без звуку',
    'video.copy': 'H.264', 'video.h265': 'H.265', 'video.transcode': 'Перекодування',
    'role.admin': 'Адміністратор', 'role.viewer': 'Глядач',
    'confirm.delDevice': 'Видалити «{name}»?', 'confirm.delUser': 'Видалити користувача «{name}»?',
    'dlg.newDevice': 'Новий пристрій', 'dlg.editDevice': 'Редагувати пристрій',
    'dlg.name': 'Назва', 'dlg.namePh': 'напр. NVR або Камера у дворі', 'dlg.type': 'Тип',
    'dlg.typeNvr': 'NVR / DVR', 'dlg.typeCam': 'Камера', 'dlg.host': 'IP-адреса', 'dlg.httpPort': 'HTTP-порт',
    'dlg.rtspPort': 'RTSP-порт', 'dlg.user': 'Користувач', 'dlg.pass': 'Пароль', 'dlg.codec': 'Відеокодек',
    'dlg.codecCopy': 'H.264 (рекомендовано)', 'dlg.codecH265': 'H.265 без перекодування', 'dlg.codecTranscode': 'Перекодувати в H.264 (велике навантаження на CPU)',
    'dlg.audio': 'Звук', 'dlg.test': 'Перевірити зв’язок', 'dlg.testing': 'Підключення…', 'dlg.connected': '✓ Підключено',
    'dlg.newUser': 'Новий користувач', 'dlg.editUser': 'Редагувати користувача', 'dlg.username': 'Ім’я користувача',
    'dlg.role': 'Роль', 'dlg.roleViewer': 'Глядач: лише перегляд і записи', 'dlg.roleAdmin': 'Адміністратор: може змінювати налаштування',
    'dlg.allDevices': 'Бачить усі пристрої',
  },
};

function detectLang() {
  try {
    const saved = JSON.parse(localStorage.getItem('hikweb.lang'));
    if (I18N[saved]) return saved;
  } catch (_) { /* */ }
  const nav = (navigator.languages || [navigator.language || '']).map((l) => String(l).slice(0, 2).toLowerCase());
  return nav.find((l) => I18N[l]) || 'lt';
}
let LANG = detectLang();

/** Vertimas su kintamaisiais: t('rec.found', {n: 5}) */
function t(key, vars = {}) {
  const s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.lt[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

/** Išverčia elementus su data-i18n, data-i18n-placeholder, data-i18n-title. */
function applyI18n(root = document) {
  document.documentElement.lang = LANG;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

function setLang(lang) {
  if (!I18N[lang] || lang === LANG) return;
  try { localStorage.setItem('hikweb.lang', JSON.stringify(lang)); } catch (_) { /* */ }
  location.reload();
}

/** Užpildo kalbų pasirinkimo sąrašus (<select class="lang-sel">). */
function initLangSelects() {
  document.querySelectorAll('select.lang-sel').forEach((sel) => {
    sel.innerHTML = '';
    for (const [code, name] of Object.entries(LANG_NAMES)) {
      const o = document.createElement('option');
      o.value = code;
      o.textContent = name;
      sel.append(o);
    }
    sel.value = LANG;
    sel.onchange = () => setLang(sel.value);
  });
}
const _t = t;
window.t = t; // app.js naudoja _t, nes „t“ ten yra langelio kintamasis

/* Viešai prieinami administratoriaus nustatymai: pavadinimas, numatytoji kalba ir tema. */
function applySiteName(name) {
  document.title = name ? `${name} – HikWeb` : 'HikWeb';
  document.querySelectorAll('.site-name').forEach((el) => { el.textContent = name || ''; el.classList.toggle('hidden', !name); });
}
const infoReady = fetch('/api/info').then((r) => r.json()).then((info) => {
  window.SITE = info;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('hikweb.lang')); } catch (_) { /* */ }
  if (!I18N[saved] && I18N[info.language] && info.language !== LANG) {
    LANG = info.language;
    applyI18n();
    initLangSelects();
  }
  if (window.setDefaultTheme) setDefaultTheme(info.theme);
  applySiteName(info.siteName);
}).catch(() => {});
