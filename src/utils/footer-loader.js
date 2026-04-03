// Footer Loader - Dynamically loads footer HTML to avoid duplication
// Usage: Add <div id="footer-placeholder"></div> and include this script

(function() {
    const footerHTML = `
    <footer>
        <div class="footer-container">
            <div class="footer-main">
                <!-- Brand Section -->
                <div class="footer-brand">
                    <div class="footer-brand-header">
                        <img src="/assets/images/logo.png" alt="تەفسیر کورد" class="footer-logo-img logo-image">
                        <h2 class="footer-brand-name" data-t="footer_brand_name">تەفسیر کورد</h2>
                    </div>
                    <p class="footer-brand-tagline" data-t="footer_tagline">
                        پلاتفۆرمەکا ئارام بۆ خواندنێ، گەڕیان و رامان ل سەر قورئانا پیرۆز ب زمانێ کوردی (بادینی). قورئان بگەهیتە دەستێ هەر کەسەکی، هەر جهەکی و هەر دەمەکی.
                    </p>
                    <div class="footer-social-icons">
                        <a id="footerSocialInstagram" href="https://www.instagram.com/tafsirkurd" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                            <i class="fab fa-instagram"></i>
                        </a>
                        <a id="footerSocialYoutube" href="https://www.youtube.com/@tafsirkurd" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                            <i class="fab fa-youtube"></i>
                        </a>
                        <a id="footerSocialTelegram" href="https://t.me/tafsirkurd" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                            <i class="fab fa-telegram"></i>
                        </a>
                        <a id="footerSocialPinterest" href="https://www.pinterest.com/tafsirkurd/" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
                            <i class="fab fa-pinterest"></i>
                        </a>
                    </div>
                </div>

                <!-- Navigate Section -->
                <div class="footer-section">
                    <h3 class="footer-section-title" data-t="footer_nav_title">گەڕیان</h3>
                    <div class="footer-links">
                        <a href="/profile" class="footer-link" data-t="footer_link_profile">پرۆفایل</a>
                        <a href="/goals" class="footer-link" data-t="footer_link_goals">ئارمانج</a>
                        <a href="/bookmarks" class="footer-link" data-t="footer_link_bookmarks">نیشانەکری</a>
                        <a href="/settings" class="footer-link" data-t="footer_link_settings">رێکخستن</a>
                    </div>
                </div>

                <!-- Resources Section -->
                <div class="footer-section">
                    <h3 class="footer-section-title" data-t="footer_other_pages_title">رۆژپەڕێن دی</h3>
                    <div class="footer-links">
                        <a href="/" class="footer-link" data-t="footer_link_home">مالپەڕێ سەرەکی</a>
                        <a href="/quran" class="footer-link" data-t="footer_link_quran">قورئانا پیرۆز</a>
                        <a href="/#features" class="footer-link" data-t="footer_link_features">تایبەتمەندی</a>
                        <a href="/about" class="footer-link" data-t="footer_link_about">دەربارەی مە</a>
                    </div>
                </div>

                <!-- Connect Section -->
                <div class="footer-section">
                    <h3 class="footer-section-title" data-t="footer_connect_title">پەیوەندی</h3>
                    <div class="footer-links">
                        <p class="footer-contact-text" data-t="footer_connect_desc">ئەگەر تە پرسیارەک یان پێشنیارەک هەبیت، پەیوەندییێ ب مە بکە و ب زووترین دەم دێ بەرسڤا تە هێتە دان!</p>
                        <a id="footerSocialEmail" href="mailto:tefsirkurd@gmail.com" class="footer-link">
                            <i class="fas fa-envelope"></i> <span id="footerEmailText">tefsirkurd@gmail.com</span>
                        </a>
                        <a href="/#contact" class="footer-link" data-t="footer_link_form">
                            <i class="fas fa-paper-plane"></i> فۆرمێ پڕ بکە
                        </a>
                    </div>
                </div>
            </div>

            <!-- Footer Bottom -->
            <div class="footer-bottom">
                <p class="footer-copyright">
                    &copy; <span id="footer-year"></span> <span data-t="footer_copyright">تەفسیر کورد. هەمی ماف پاراستی نە. خودایێ مەزن بەرەکەتێ بێخیتە هەول و ماندبوونا مە.</span>
                </p>
                <div class="footer-meta-links">
                    <a href="/privacy-policy" class="footer-meta-link" data-t="footer_link_privacy">پاراستنا تایبەتمەندیێ</a>
                    <a href="/terms-and-conditions" class="footer-meta-link" data-t="footer_link_terms">مەرج و رێسایان</a>
                </div>
            </div>
        </div>
    </footer>
    `;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadFooter);
    } else {
        loadFooter();
    }

    function loadFooter() {
        const placeholder = document.getElementById('footer-placeholder');
        if (placeholder) {
            placeholder.outerHTML = footerHTML;
            // Set current year
            const yearSpan = document.getElementById('footer-year');
            if (yearSpan) {
                yearSpan.textContent = new Date().getFullYear();
            }
            // Load social links from site_settings
            loadFooterSocials();
            // Inject app section before footer-bottom
            injectFooterAppSection();
        }
    }

    async function loadFooterSocials() {
        const socialMap = {
            'social_instagram': 'footerSocialInstagram',
            'social_youtube':   'footerSocialYoutube',
            'social_telegram':  'footerSocialTelegram',
            'social_pinterest': 'footerSocialPinterest',
            'social_email':     'footerSocialEmail'
        };
        const keys = Object.keys(socialMap);

        function applySocials(data) {
            Object.keys(data).forEach(function(k) {
                var val = data[k];
                if (!val) return;
                var elId = socialMap[k];
                if (!elId) return;
                var el = document.getElementById(elId);
                if (el) {
                    el.href = val;
                    // For email: update visible text too (strip mailto:)
                    if (k === 'social_email') {
                        var txt = document.getElementById('footerEmailText');
                        if (txt) txt.textContent = val.replace(/^mailto:/, '');
                    }
                }
            });
        }

        // Apply from localStorage cache immediately
        var cached = {};
        keys.forEach(function(k) {
            var v = localStorage.getItem(k);
            if (v) cached[k] = v;
        });
        if (Object.keys(cached).length) applySocials(cached);

        // Fetch fresh from DB
        try {
            var cfg = await fetch('/config').then(function(r) { return r.json(); });
            if (!cfg.supabaseUrl || !cfg.supabaseKey) return;
            var filter = 'key=in.(' + keys.join(',') + ')';
            var rows = await fetch(cfg.supabaseUrl + '/rest/v1/site_settings?' + filter + '&select=key,value', {
                headers: { 'apikey': cfg.supabaseKey, 'Authorization': 'Bearer ' + cfg.supabaseKey }
            }).then(function(r) { return r.json(); });
            if (!Array.isArray(rows)) return;
            var fresh = {};
            rows.forEach(function(row) { if (row.key && row.value) { fresh[row.key] = row.value; localStorage.setItem(row.key, row.value); } });
            applySocials(fresh);
        } catch(e) { /* Silently ignore */ }
    }

    function injectFooterAppSection() {
        if (document.getElementById('tk-fa')) return;
        const fb = document.querySelector('.footer-bottom');
        if (!fb || !fb.parentNode) return;

        // Inject CSS if app-promo.js isn't loaded on this page
        if (!document.getElementById('tk-promo-css')) {
            const st = document.createElement('style');
            st.id = 'tk-promo-css';
            st.textContent = [
                '#tk-fa{padding:22px 0 0;margin-bottom:20px;border-top:1px solid var(--border,rgba(0,0,0,.08));}',
                '[data-theme="dark"] #tk-fa{border-top-color:rgba(255,255,255,.07);}',
                '.tk-fa-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}',
                '.tk-fa-brand{display:flex;align-items:center;gap:11px;min-width:0;}',
                '.tk-fa-brand img{width:34px;height:34px;border-radius:8px;flex-shrink:0;}',
                '.tk-fa-info{display:flex;flex-direction:column;gap:2px;}',
                '.tk-fa-name{font-size:.85rem;font-weight:700;color:var(--text,#000);}',
                '.tk-fa-desc{font-size:.76rem;color:var(--text-muted,rgba(0,0,0,.45));}',
                '[data-theme="dark"] .tk-fa-name{color:rgba(255,255,255,.9);}',
                '[data-theme="dark"] .tk-fa-desc{color:rgba(255,255,255,.4);}',
                '.tk-fa-btns{display:flex;gap:8px;flex-shrink:0;}',
                '.tk-fa-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;',
                    'height:38px;padding:0 14px;font-size:.79rem;font-weight:600;',
                    'background:var(--primary,#000);color:var(--accent,#fff);',
                    'border-radius:11px;text-decoration:none;white-space:nowrap;',
                    'transition:opacity .2s;-webkit-tap-highlight-color:transparent;}',
                '[data-theme="dark"] .tk-fa-btn{background:#fff;color:#000;}',
                '.tk-fa-btn:hover{opacity:.8;}',
                '@media(max-width:560px){',
                    '.tk-fa-row{flex-direction:column;align-items:flex-start;}',
                    '.tk-fa-btns{width:100%;}',
                    '.tk-fa-btn{flex:1;}',
                '}',
            ].join('');
            document.head.appendChild(st);
        }

        const ua = navigator.userAgent || '';
        const iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        const Drd = /Android/.test(ua);

        const PLAY = 'https://play.google.com/store/apps/details?id=com.tafsirkurd.app';
        const IOS  = 'https://apps.apple.com/us/app/tafsirkurd/id6760433688';

        function mkBtn(label, url) {
            const a = document.createElement('a');
            a.className = 'tk-fa-btn';
            a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.setAttribute('aria-label', label);
            const sp = document.createElement('span'); sp.textContent = label;
            a.appendChild(sp);
            return a;
        }

        const wrap  = document.createElement('div'); wrap.id = 'tk-fa';
        const row   = document.createElement('div'); row.className = 'tk-fa-row';
        const brand = document.createElement('div'); brand.className = 'tk-fa-brand';
        const img   = document.createElement('img');
        img.src = '/assets/images/logo.png'; img.alt = 'TafsirKurd';
        img.width = 34; img.height = 34;
        const info  = document.createElement('div'); info.className = 'tk-fa-info';
        const nm    = document.createElement('span'); nm.className = 'tk-fa-name'; nm.textContent = 'TafsirKurd App';
        const dc    = document.createElement('span'); dc.className = 'tk-fa-desc'; dc.textContent = 'Read, listen, and keep your progress with you.';
        info.appendChild(nm); info.appendChild(dc);
        brand.appendChild(img); brand.appendChild(info);
        const btns  = document.createElement('div'); btns.className = 'tk-fa-btns';

        if (iOS) {
            btns.appendChild(mkBtn('App Store', IOS));
        } else if (Drd) {
            btns.appendChild(mkBtn('Google Play', PLAY));
        } else {
            btns.appendChild(mkBtn('App Store', IOS));
            btns.appendChild(mkBtn('Google Play', PLAY));
        }

        row.appendChild(brand); row.appendChild(btns);
        wrap.appendChild(row);
        fb.parentNode.insertBefore(wrap, fb);
    }
})();
