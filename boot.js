window.__NEON_OBF=true;





(function () {
  'use strict';

  var MODULES = [
    'src/utils.js', 'src/core.js', 'src/config.js', 'src/state.js', 'src/difficulty.js', 'src/meta.js',
    'src/config.cloud.js', 'src/cloud.js', 'src/account.js',
    'src/audio.js', 'src/effects.js', 'src/projectiles.js', 'src/player.js', 'src/enemies.js',
    'src/bosses.js', 'src/waves.js', 'src/draw.js', 'src/hud.js', 'src/wprog.js', 'src/chars.js', 'src/menu.js', 'src/bestiary.js', 'src/input.js', 'src/game.js'
  ];
  var MARKUP = 'markup.html';
  var CSS_HREF = 'css/style.css';
  var MAX_TRY = 5;
  var TIMEOUT = 8000;
  var OBF = window.__NEON_OBF === true;
  var OBF_KEY = [90, 60, 161, 23, 228, 41, 139, 85];

  function decode(t) {
    var b = atob(t), i, a = new Uint8Array(b.length);
    for (i = 0; i < b.length; i++) a[i] = b.charCodeAt(i) ^ OBF_KEY[i % OBF_KEY.length];
    return new TextDecoder('utf-8').decode(a);
  }

  function modulePath(p) { return OBF ? p.replace(/\.js$/, '.jnb') : p; }

  function bootBox() { return document.getElementById('boot'); }

  function say(text) {
    var b = bootBox();
    if (b) { b.textContent = text; b.style.display = 'flex'; }
  }

  function hideBoot() {
    var b = bootBox();
    if (b) b.style.display = 'none';
  }

  function timeout(p, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () {
        if (!done) { done = true; reject(new Error('таймаут')); }
      }, ms);
      p.then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } },
             function (e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
    });
  }

  function grab(url, attempt) {
    var u = url + (attempt > 1 ? ('?r=' + attempt + Date.now()) : '');
    return timeout(fetch(u, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (t) {
      return OBF && /\.jnb(\?|$)/.test(url) ? decode(t) : t;
    }), TIMEOUT);
  }

  function withRetry(url) {
    var attempt = 0;
    function once() {
      attempt++;
      return grab(url, attempt).catch(function (e) {
        if (attempt < MAX_TRY) return once();
        throw e;
      });
    }
    return once();
  }

  function ensureBody() {
    if (!document.body) {
      var b = document.createElement('body');
      (document.documentElement || document).appendChild(b);
    }
  }

  function run(code) {
    var s = document.createElement('script');
    s.textContent = code;
    (document.body || document.documentElement).appendChild(s);
  }

  
  function repairMarkup() {
    if (window.__NEON_TAIL) return Promise.resolve();
    say('Восстанавливаю интерфейс…');
    return withRetry(MARKUP).then(function (text) {
      ensureBody();
      document.body.innerHTML = text;
    });
  }

  function cssOk() {
    var ov = document.getElementById('overlay');
    return !!ov && getComputedStyle(ov).display === 'flex';
  }

  function ensureCss(n) {
    if (cssOk() || n > 4) return Promise.resolve();
    return new Promise(function (res) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = CSS_HREF + '?r=' + n + Date.now();
      l.onload = function () { res(ensureCss(n + 1)); };
      l.onerror = function () { res(ensureCss(n + 1)); };
      document.head.appendChild(l);
    });
  }

  function loadModules() {
    var i = 0;
    function step() {
      if (i >= MODULES.length) return Promise.resolve();
      say('Загрузка ' + (i + 1) + ' / ' + MODULES.length + ' …');
      return withRetry(modulePath(MODULES[i])).then(function (code) {
        run(code);
        i++;
        return step();
      });
    }
    return step();
  }

  function start() {
    ensureBody();
    say('Загрузка…');
    repairMarkup()
      .then(function () { return ensureCss(1); })
      .then(loadModules)
      .then(function () {
        if (!window.__NEON_READY && typeof window.startGame !== 'function') {
          throw new Error('игра не запустилась');
        }
        try { sessionStorage.removeItem('neonRetry'); } catch (e) {}
        hideBoot();
      })
      .catch(function (e) {
        say('Не удалось загрузить игру (' + ((e && e.message) || 'сеть') + '). Нажмите F5.');
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
