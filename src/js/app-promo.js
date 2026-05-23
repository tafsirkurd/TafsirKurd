/**
 * TafsirKurd App Promotion
 * — First-visit popup (homepage / quran / islamvoice only)
 * — Footer app section (any page that loads this script)
 *
 * Texts and URLs come from /popup-config (site_settings in Supabase).
 * Hardcoded values are used as defaults if the fetch fails or a field is empty.
 */
(function () {
  'use strict';

  var DEFAULT_PLAY = 'https://play.google.com/store/apps/details?id=com.tafsirkurd.app';
  var DEFAULT_IOS  = 'https://apps.apple.com/us/app/tafsirkurd/id6760433688';
  var ua   = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  var isAnd = /Android/.test(ua);

  /* ── Fetch all site settings early ──────────────────────────── */
  var _cfg = null;
  var _cfgReady = fetch('/popup-config')
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (d) { _cfg = d || {}; })
    .catch(function () { _cfg = {}; });

  /* ── SVG helpers ─────────────────────────────────────────── */
  function svgEl(w, h, vb) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', w); s.setAttribute('height', h);
    s.setAttribute('viewBox', vb); s.setAttribute('fill', 'currentColor');
    s.setAttribute('aria-hidden', 'true');
    return s;
  }
  function pathEl(d) {
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d); return p;
  }
  function appleIcon() {
    var s = svgEl(18, 18, '0 0 24 24');
    s.appendChild(pathEl(
      'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 ' +
      '.77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 ' +
      '2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 ' +
      '2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03' +
      '.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04' +
      ' 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z'
    ));
    return s;
  }
  function playIcon() {
    var s = svgEl(16, 16, '0 0 24 24');
    s.appendChild(pathEl('M3 20.5v-17c0-.84.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z'));
    return s;
  }

  /* ── Store button ────────────────────────────────────────── */
  function storeBtn(label, url, iconFn, cls) {
    var a = document.createElement('a');
    a.className = 'tk-promo-btn' + (cls ? ' ' + cls : '');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', label);
    a.appendChild(iconFn());
    var sp = document.createElement('span'); sp.textContent = label;
    a.appendChild(sp);
    return a;
  }

  /* ── Inject CSS once ─────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('tk-promo-css')) return;
    var s = document.createElement('style');
    s.id = 'tk-promo-css';
    s.textContent = [
      /* Shared button */
      '.tk-promo-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;',
        'height:46px;padding:0 20px;background:#000;color:#fff;',
        'border-radius:11px;font-size:.87rem;font-weight:600;',
        'text-decoration:none;white-space:nowrap;box-sizing:border-box;letter-spacing:.01em;',
        'transition:opacity .2s,transform .15s;-webkit-tap-highlight-color:transparent;}',
      '.tk-promo-btn:hover{opacity:.8;transform:translateY(-1px);}',
      '.tk-promo-btn:active{opacity:.65;transform:none;}',
      '.tk-promo-btn.tk-light{background:#fff;color:#000;}',

      /* ── Popup overlay ── */
      '#tk-pp-ov{position:fixed;inset:0;',
        'background:rgba(0,0,0,.65);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
        'z-index:99999;display:flex;align-items:center;justify-content:center;',
        'padding:16px;box-sizing:border-box;',
        'opacity:0;transition:opacity .3s ease;will-change:opacity;}',
      '#tk-pp-ov.tk-in{opacity:1;}',

      '#tk-pp-card{',
        'background:#000;border:1px solid rgba(255,255,255,.1);',
        'border-radius:22px;overflow:hidden;',
        'max-width:600px;width:100%;',
        'display:flex;flex-direction:column;position:relative;',
        'box-shadow:0 32px 96px rgba(0,0,0,.9);',
        'transform:scale(.96) translateY(12px);',
        'transition:transform .35s cubic-bezier(.16,1,.3,1);will-change:transform;}',
      '#tk-pp-ov.tk-in #tk-pp-card{transform:scale(1) translateY(0);}',

      /* Close */
      '#tk-pp-x{position:absolute;top:10px;right:10px;z-index:10;',
        'background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.18);color:#fff;',
        'width:30px;height:30px;border-radius:50%;font-size:18px;line-height:1;',
        'cursor:pointer;display:flex;align-items:center;justify-content:center;',
        'transition:background .15s;-webkit-tap-highlight-color:transparent;}',
      '#tk-pp-x:hover{background:rgba(0,0,0,.8);}',

      /* Image panel */
      '#tk-pp-img{width:100%;aspect-ratio:5/3;position:relative;overflow:hidden;',
        'background:linear-gradient(160deg,#111 0%,#000 100%);}',
      '#tk-pp-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}',

      /* Content panel */
      '#tk-pp-body{flex:1;padding:32px 36px 36px;display:flex;flex-direction:column;',
        'justify-content:center;overflow-y:auto;}',
      '#tk-pp-h{margin:0 0 12px;font-size:1.75rem;font-weight:700;color:#fff;direction:rtl;text-align:right;',
        'line-height:1.15;letter-spacing:-.025em;}',
      '#tk-pp-sub{margin:0 0 32px;font-size:.95rem;color:rgba(255,255,255,.5);line-height:1.7;direction:rtl;text-align:right;}',
      '#tk-pp-btns{display:flex;flex-direction:column;gap:10px;}',
      '#tk-pp-btns .tk-promo-btn{width:100%;}',

      /* no-image: narrower card */
      '#tk-pp-card.tk-no-img{max-width:460px;}',
      '#tk-pp-card.tk-no-img #tk-pp-body{padding:52px 44px;}',

      /* mobile */
      '@media(max-width:620px){',
        '#tk-pp-card{flex-direction:column;max-width:100%;border-radius:20px;}',
        '#tk-pp-img{width:100%;aspect-ratio:5/3;}',
        '#tk-pp-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}',
        '#tk-pp-body{padding:24px 22px 30px;}',
        '#tk-pp-h{font-size:1.4rem;}',
        '#tk-pp-card.tk-no-img{max-width:100%;}',
        '#tk-pp-x{top:8px;right:8px;}',
      '}',
      '@media(max-width:380px){',
        '#tk-pp-body{padding:20px 18px 26px;}',
        '#tk-pp-h{font-size:1.25rem;}',
      '}',

      /* ── Noor theme overrides ── */
      '[data-theme="noor"] #tk-pp-card{background:#fdf4e3;border-color:#d9c9a8;box-shadow:0 32px 96px rgba(0,0,0,.18);}',
      '[data-theme="noor"] #tk-pp-x{background:rgba(26,14,4,.45);border-color:rgba(26,14,4,.25);color:#1a0e04;}',
      '[data-theme="noor"] #tk-pp-x:hover{background:rgba(26,14,4,.65);}',
      '[data-theme="noor"] #tk-pp-img{background:linear-gradient(160deg,#eddfc0 0%,#f4e8cc 100%);}',
      '[data-theme="noor"] #tk-pp-h{color:#1a0e04;}',
      '[data-theme="noor"] #tk-pp-sub{color:rgba(26,14,4,.5);}',
      '[data-theme="noor"] #tk-pp-btns .tk-promo-btn{background:#1a5c3a;color:#fdf4e3;}',
      '[data-theme="noor"] #tk-pp-btns .tk-promo-btn:hover{opacity:.85;}',

      /* ── Sakina theme overrides ── */
      '[data-theme="sakina"] #tk-pp-card{background:#0f2218;border-color:rgba(201,168,76,.2);box-shadow:0 32px 96px rgba(0,0,0,.8);}',
      '[data-theme="sakina"] #tk-pp-x{background:rgba(201,168,76,.08);color:rgba(201,168,76,.6);}',
      '[data-theme="sakina"] #tk-pp-x:hover{background:rgba(201,168,76,.16);color:#c9a84c;}',
      '[data-theme="sakina"] #tk-pp-img{background:linear-gradient(160deg,#0a1810 0%,#060e08 100%);}',
      '[data-theme="sakina"] #tk-pp-h{color:#e8d5b0;}',
      '[data-theme="sakina"] #tk-pp-sub{color:rgba(232,213,176,.5);}',
      '[data-theme="sakina"] #tk-pp-btns .tk-promo-btn{background:#c9a84c;color:#0c1c12;}',
      '[data-theme="sakina"] #tk-pp-btns .tk-promo-btn:hover{opacity:.85;}',

      /* ── Footer app section ── */
      '#tk-fa{',
        'padding:22px 0 0;',
        'margin-bottom:20px;',
        'border-top:1px solid var(--border,rgba(0,0,0,.08));',
      '}',
      '[data-theme="dark"] #tk-fa{border-top-color:rgba(255,255,255,.07);}',
      '[data-theme="noor"] #tk-fa{border-top-color:#d9c9a8;}',
      '[data-theme="sakina"] #tk-fa{border-top-color:rgba(201,168,76,.15);}',
      '.tk-fa-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}',
      '.tk-fa-brand{display:flex;align-items:center;gap:11px;min-width:0;}',
      '.tk-fa-brand img{width:34px;height:34px;border-radius:8px;flex-shrink:0;}',
      '[data-theme="light"]  .tk-fa-brand img{filter:brightness(0) invert(1);}',
      '[data-theme="dark"]   .tk-fa-brand img{filter:brightness(0) invert(1);}',
      '[data-theme="noor"]   .tk-fa-brand img{filter:none;}',
      '[data-theme="sakina"] .tk-fa-brand img{filter:brightness(0) saturate(100%) invert(68%) sepia(31%) saturate(860%) hue-rotate(8deg) brightness(94%);}',
      '.tk-fa-info{display:flex;flex-direction:column;gap:2px;}',
      '.tk-fa-name{font-size:.85rem;font-weight:700;color:var(--text,#000);}',
      '.tk-fa-desc{font-size:.76rem;color:var(--text-muted,rgba(0,0,0,.45));}',
      '[data-theme="dark"] .tk-fa-name{color:rgba(255,255,255,.9);}',
      '[data-theme="dark"] .tk-fa-desc{color:rgba(255,255,255,.4);}',
      '[data-theme="noor"] .tk-fa-name{color:#1a0e04;}',
      '[data-theme="noor"] .tk-fa-desc{color:rgba(26,14,4,.5);}',
      '[data-theme="sakina"] .tk-fa-name{color:#e8d5b0;}',
      '[data-theme="sakina"] .tk-fa-desc{color:rgba(232,213,176,.4);}',
      '.tk-fa-btns{display:flex;gap:8px;flex-shrink:0;}',
      '.tk-fa-btns .tk-promo-btn{',
        'height:38px;padding:0 14px;font-size:.79rem;',
        'background:var(--primary,#000);color:var(--accent,#fff);',
      '}',
      '[data-theme="dark"] .tk-fa-btns .tk-promo-btn{background:#fff;color:#000;}',
      '[data-theme="noor"] .tk-fa-btns .tk-promo-btn{background:#1a5c3a;color:#fdf4e3;}',
      '[data-theme="sakina"] .tk-fa-btns .tk-promo-btn{background:#c9a84c;color:#0c1c12;}',
      '@media(max-width:560px){',
        '.tk-fa-row{flex-direction:column;align-items:flex-start;}',
        '.tk-fa-btns{width:100%;}',
        '.tk-fa-btns .tk-promo-btn{flex:1;}',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  injectCSS();

  /* ══════════════════════════════════════════════════════════
   * FOOTER APP SECTION
   * ══════════════════════════════════════════════════════════ */
  function buildFooterSection() {
    var cfg = _cfg || {};
    var appName = cfg.footerName || 'TafsirKurd App';
    var appDesc = cfg.footerDesc || 'Read, listen, and keep your progress with you.';
    var iosUrl  = cfg.iosUrl    || DEFAULT_IOS;
    var playUrl = cfg.playUrl   || DEFAULT_PLAY;

    var wrap = document.createElement('div');
    wrap.id = 'tk-fa';

    var row = document.createElement('div');
    row.className = 'tk-fa-row';

    /* Brand */
    var brand = document.createElement('div');
    brand.className = 'tk-fa-brand';

    var logo = document.createElement('img');
    logo.src = '/assets/images/logo.png';
    logo.alt = 'TafsirKurd';
    logo.width = 34; logo.height = 34;

    var info = document.createElement('div');
    info.className = 'tk-fa-info';

    var name = document.createElement('span');
    name.className = 'tk-fa-name';
    name.textContent = appName;

    var desc = document.createElement('span');
    desc.className = 'tk-fa-desc';
    desc.textContent = appDesc;

    info.appendChild(name);
    info.appendChild(desc);
    brand.appendChild(logo);
    brand.appendChild(info);

    /* Buttons */
    var btns = document.createElement('div');
    btns.className = 'tk-fa-btns';

    if (isIOS) {
      btns.appendChild(storeBtn('App Store', iosUrl, appleIcon));
    } else if (isAnd) {
      btns.appendChild(storeBtn('Google Play', playUrl, playIcon));
    } else {
      btns.appendChild(storeBtn('App Store', iosUrl, appleIcon));
      btns.appendChild(storeBtn('Google Play', playUrl, playIcon));
    }

    row.appendChild(brand);
    row.appendChild(btns);
    wrap.appendChild(row);
    return wrap;
  }

  function injectFooterSection() {
    _cfgReady.then(function () {
      var cfg = _cfg || {};
      if (cfg.footerVisible === false) return; // hidden via admin
      if (document.getElementById('tk-fa')) return;
      var fb = document.querySelector('.footer-bottom');
      if (!fb || !fb.parentNode) return;
      fb.parentNode.insertBefore(buildFooterSection(), fb);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFooterSection);
  } else {
    injectFooterSection();
  }

  /* ══════════════════════════════════════════════════════════
   * POPUP — only on homepage / quran / islamvoice
   * ══════════════════════════════════════════════════════════ */
  var path = window.location.pathname.replace(/\/+$/, '') || '/';
  var isPopupPage = path === '/' || path === '/quran' || path === '/islamvoice'
    || path.indexOf('/quran/') === 0 || path.indexOf('/islamvoice/') === 0;

  if (!isPopupPage) return;

  /* State */
  var K_STATE = 'tk_popup_v2';
  var K_SESSION = 'tk_popup_shown';
  var DISMISS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

  function isBlocked() {
    try {
      // Already shown this session — don't show again
      if (sessionStorage.getItem(K_SESSION)) return true;
      var s = JSON.parse(localStorage.getItem(K_STATE));
      if (!s) return false;
      if (s.s === 'clicked') return true;
      if (s.s === 'dismissed') {
        if (Date.now() - s.at < DISMISS_TTL) return true;
        localStorage.removeItem(K_STATE);
        return false;
      }
      return false;
    } catch (e) { return false; }
  }

  if (isBlocked()) return;

  function setState(state) {
    localStorage.setItem(K_STATE, JSON.stringify({ s: state, at: Date.now() }));
  }

  /* Build popup DOM */
  function buildPopup() {
    var cfg = _cfg || {};
    var headline = cfg.popupHeadline || 'Get the app.';
    var subtitle = cfg.popupSubtitle || 'Read the Qur\u2019an, listen to reciters, and keep your progress with you \u2014 wherever you are.';
    var imgUrl   = cfg.imageMobileUrl || cfg.imageUrl || null;
    var iosUrl   = cfg.iosUrl   || DEFAULT_IOS;
    var playUrl  = cfg.playUrl  || DEFAULT_PLAY;

    var overlay = document.createElement('div');
    overlay.id = 'tk-pp-ov';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Get the TafsirKurd App');

    var card = document.createElement('div');
    card.id = 'tk-pp-card';
    if (!imgUrl) card.classList.add('tk-no-img');

    /* Close button */
    var closeBtn = document.createElement('button');
    closeBtn.id = 'tk-pp-x';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '\u00d7';
    card.appendChild(closeBtn);

    /* Image panel */
    if (imgUrl) {
      var imgPanel = document.createElement('div');
      imgPanel.id = 'tk-pp-img';
      var img = document.createElement('img');
      img.src = imgUrl;
      img.alt = 'TafsirKurd App';
      img.loading = 'eager';
      img.addEventListener('error', function () {
        imgPanel.style.display = 'none';
        card.classList.add('tk-no-img');
      });
      imgPanel.appendChild(img);
      card.appendChild(imgPanel);
    }

    /* Content */
    var body = document.createElement('div');
    body.id = 'tk-pp-body';

    /* Headline */
    var h = document.createElement('h2');
    h.id = 'tk-pp-h';
    h.textContent = headline;

    /* Sub */
    var sub = document.createElement('p');
    sub.id = 'tk-pp-sub';
    sub.textContent = subtitle;

    /* Buttons */
    var btns = document.createElement('div');
    btns.id = 'tk-pp-btns';

    function addBtn(label, url, iconFn) {
      var btn = storeBtn(label, url, iconFn, 'tk-light');
      btn.addEventListener('click', function () { setState('clicked'); });
      btns.appendChild(btn);
    }

    if (isIOS) {
      addBtn('Download on the App Store', iosUrl, appleIcon);
    } else if (isAnd) {
      addBtn('Get it on Google Play', playUrl, playIcon);
    } else {
      addBtn('Download on the App Store', iosUrl, appleIcon);
      addBtn('Get it on Google Play', playUrl, playIcon);
    }

    body.appendChild(h);
    body.appendChild(sub);
    body.appendChild(btns);
    card.appendChild(body);
    overlay.appendChild(card);

    /* Dismiss logic */
    function dismiss() {
      setState('dismissed');
      overlay.classList.remove('tk-in');
      setTimeout(function () { overlay.remove(); }, 350);
    }

    closeBtn.addEventListener('click', dismiss);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) dismiss();
    });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        dismiss();
        document.removeEventListener('keydown', onKey);
      }
    });

    return overlay;
  }

  /* Show only after preloader is gone + 1.5s for entrance animations */
  function schedulePopup() {
    if (isBlocked()) return;
    _cfgReady.then(function () {
      var cfg = _cfg || {};
      if (cfg.popupEnabled === false) return;
      if (isBlocked()) return;
      var popup = buildPopup();
      document.body.appendChild(popup);
      try { sessionStorage.setItem(K_SESSION, '1'); } catch(e) {}
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          popup.classList.add('tk-in');
        });
      });
    });
  }

  function waitForPreloader() {
    var preloader = document.getElementById('preloader');
    if (!preloader || preloader.style.display === 'none') {
      setTimeout(schedulePopup, 1500);
      return;
    }
    var obs = new MutationObserver(function () {
      if (preloader.style.display === 'none') {
        obs.disconnect();
        setTimeout(schedulePopup, 1500);
      }
    });
    obs.observe(preloader, { attributes: true, attributeFilter: ['style'] });
    // Safety: show anyway after 8s no matter what
    setTimeout(function () { obs.disconnect(); schedulePopup(); }, 8000);
  }

  waitForPreloader();

})();
