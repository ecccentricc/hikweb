'use strict';
/* Temos: tamsi, šviesi, mėlyna, automatinė (pagal sistemą).
 * Įkeliama <head> dalyje, kad puslapis iškart būtų reikiamos spalvos. */
(function () {
  const THEMES = ['dark', 'light', 'blue', 'auto'];
  const ICONS = { dark: '☾', light: '☀', blue: '◆', auto: '◐' };
  const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : { matches: false };
  const root = document.documentElement;

  let fallback = 'dark'; // administratoriaus nustatyta numatytoji tema
  function getTheme() {
    try {
      const t = JSON.parse(localStorage.getItem('hikweb.theme'));
      if (THEMES.includes(t)) return t;
    } catch (_) { /* */ }
    return fallback;
  }
  function setDefaultTheme(t) {
    if (!THEMES.includes(t) || t === fallback) return;
    fallback = t;
    apply();
    syncThemeControls();
  }
  function apply() {
    const t = getTheme();
    root.dataset.theme = t === 'auto' ? (mq.matches ? 'light' : 'dark') : t;
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = getComputedStyle(root).getPropertyValue('--bg').trim() || '#0f1115';
  }
  function setTheme(t) {
    if (!THEMES.includes(t)) return;
    try { localStorage.setItem('hikweb.theme', JSON.stringify(t)); } catch (_) { /* */ }
    root.classList.add('theme-anim');
    apply();
    setTimeout(() => root.classList.remove('theme-anim'), 300);
    syncThemeControls();
  }
  /** Užpildo <select class="theme-sel"> ir #themeBtn (reikia i18n.js funkcijos t). */
  function syncThemeControls() {
    const cur = getTheme();
    document.querySelectorAll('select.theme-sel').forEach((sel) => {
      if (!sel.options.length) {
        for (const th of THEMES) {
          const o = document.createElement('option');
          o.value = th;
          o.textContent = window.t ? window.t('theme.' + th) : th;
          sel.append(o);
        }
        sel.onchange = () => setTheme(sel.value);
      }
      sel.value = cur;
    });
    for (const btn of [document.getElementById('themeBtn'), document.getElementById('themeBtnLogin')]) {
      if (!btn) continue;
      btn.textContent = ICONS[cur];
      btn.title = (window.t ? window.t('theme') + ': ' + window.t('theme.' + cur) : cur);
      btn.onclick = () => setTheme(THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length]);
    }
  }

  apply();
  if (mq.addEventListener) mq.addEventListener('change', () => { if (getTheme() === 'auto') apply(); });
  window.setTheme = setTheme;
  window.setDefaultTheme = setDefaultTheme;
  window.THEMES = THEMES;
  window.getTheme = getTheme;
  window.syncThemeControls = syncThemeControls;
}());
