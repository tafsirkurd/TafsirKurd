// Universal Footer Loader for all pages
(function() {
    // Footer CSS to inject into <head>
    const footerCSS = `
        footer {
            background: var(--card-bg);
            border-top: 1px solid var(--border);
            margin-top: 80px;
            padding: 60px 20px 30px;
            text-align: right;
        }

        .footer-container {
            max-width: 1200px;
            margin: 0 auto;
            direction: rtl;
        }

        .footer-main {
            display: grid !important;
            grid-template-columns: 1.5fr 1fr 1fr 1fr !important;
            gap: 40px !important;
            margin-bottom: 40px;
            width: 100%;
            min-height: 200px;
        }

        .footer-brand {
            display: flex !important;
            flex-direction: column;
            gap: 15px;
        }

        .footer-brand-header {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .footer-logo-img {
            width: 45px;
            height: 45px;
            object-fit: contain;
            transition: transform 0.4s;
        }

        .footer-logo-img:hover {
            transform: scale(1.1) rotate(10deg);
        }

        .footer-brand-name {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text);
            font-family: 'IBM Plex Sans Arabic', sans-serif;
        }

        .footer-brand-tagline {
            font-size: 0.95rem;
            line-height: 1.6;
            color: var(--text-muted);
            margin-top: 5px;
        }

        .footer-social-icons {
            display: flex;
            gap: 15px;
            margin-top: 15px;
        }

        .footer-social-icons a {
            color: var(--text-muted);
            font-size: 1.3rem;
            transition: all 0.4s;
        }

        .footer-social-icons a:hover {
            color: var(--primary);
            transform: translateY(-3px);
        }

        .footer-section {
            display: flex !important;
            flex-direction: column;
            gap: 15px;
            text-align: right;
        }

        .footer-section-title {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text);
            margin-bottom: 5px;
            font-family: 'IBM Plex Sans Arabic', sans-serif;
            text-align: right;
        }

        .footer-links {
            display: flex !important;
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
        }

        .footer-contact-text {
            color: var(--text-muted);
            font-size: 0.9rem;
            line-height: 1.6;
            margin-bottom: 10px;
        }

        .footer-link {
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.9rem;
            transition: all 0.4s;
            width: fit-content;
            white-space: nowrap;
            display: inline-block;
        }

        .footer-link i {
            margin-left: 8px;
            font-size: 0.85rem;
        }

        .footer-link:hover {
            color: var(--primary);
            transform: translateX(-5px);
        }

        .footer-bottom {
            border-top: 1px solid var(--border);
            padding-top: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
            direction: rtl;
        }

        .footer-copyright {
            color: var(--text-muted);
            font-size: 0.85rem;
            text-align: right;
        }

        .footer-meta-links {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            align-items: center;
        }

        .footer-meta-link {
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.85rem;
            transition: color 0.4s;
            white-space: nowrap;
        }

        .footer-meta-link:hover {
            color: var(--primary);
        }

        /* Responsive Styles */
        @media (max-width: 768px) {
            .footer-main {
                grid-template-columns: 1fr 1fr !important;
                gap: 25px;
            }

            .footer-brand-name {
                font-size: 1.3rem;
            }

            .footer-section-title {
                font-size: 1.1rem;
            }

            .footer-links a {
                font-size: 0.9rem;
            }

            .footer-social-icons {
                gap: 12px;
            }

            .footer-social-icons a {
                font-size: 1.1rem;
            }
        }

        @media (max-width: 480px) {
            .footer-main {
                grid-template-columns: 1fr 1fr !important;
                gap: 20px;
            }

            .footer-brand {
                grid-column: 1 / -1;
            }

            .footer-brand-header {
                flex-direction: column;
                align-items: center;
                text-align: center;
            }

            .footer-logo-img {
                margin-bottom: 10px;
            }

            .footer-brand-tagline,
            .footer-contact-text {
                font-size: 0.85rem;
            }

            .footer-section-title {
                font-size: 1rem;
            }

            .footer-links a {
                font-size: 0.85rem;
            }

            .footer-copyright {
                font-size: 0.8rem;
                text-align: center;
            }

            .footer-meta-links {
                flex-direction: column;
                gap: 10px;
                align-items: center;
            }

            .footer-bottom {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }

            footer p {
                font-size: 0.8rem;
            }

            footer .logo-image {
                width: 55px;
                height: 55px;
                object-fit: contain;
            }
        }
    `;

    // Footer HTML to inject into <body>
    const footerHTML = `
        <footer>
            <div class="footer-container">
                <div class="footer-main">
                    <!-- Brand Section -->
                    <div class="footer-brand">
                        <div class="footer-brand-header">
                            <img src="/assets/images/logo.png" alt="تەفسیر کورد" class="footer-logo-img logo-image">
                            <h2 class="footer-brand-name">تەفسیر کورد</h2>
                        </div>
                        <p class="footer-brand-tagline">
                            پلاتفۆرمەکا ئارام بۆ خواندنێ، گەڕیان و رامان ل سەر قورئانا پیرۆز ب زمانێ کوردی (بادینی). قورئان بگەهیتە دەستێ هەر کەسەکی، هەر جهەکی و هەر دەمەکی.
                        </p>
                        <div class="footer-social-icons">
                            <a href="https://www.instagram.com/tafsirkurd" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                                <i class="fab fa-instagram"></i>
                            </a>
                            <a href="https://www.youtube.com/@tafsirkurd" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                                <i class="fab fa-youtube"></i>
                            </a>
                            <a href="https://t.me/tafsirkurd" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                                <i class="fab fa-telegram"></i>
                            </a>
                            <a href="https://www.pinterest.com/tafsirkurd/" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
                                <i class="fab fa-pinterest"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Navigate Section -->
                    <div class="footer-section">
                        <h3 class="footer-section-title">گەڕان</h3>
                        <div class="footer-links">
                            <a href="/profile" class="footer-link">پرۆفایل</a>
                            <a href="/goals" class="footer-link">ئامانجەکان</a>
                            <a href="/bookmarks" class="footer-link">نیشانەکراوەکان</a>
                            <a href="/settings" class="footer-link">ڕێکخستنەکان</a>
                        </div>
                    </div>

                    <!-- Resources Section -->
                    <div class="footer-section">
                        <h3 class="footer-section-title">رۆژپەڕا دیکە</h3>
                        <div class="footer-links">
                            <a href="/" class="footer-link">ماڵپەڕی سەرەکی</a>
                            <a href="/quran" class="footer-link">قورئانا پیرۆز</a>
                            <a href="/#features" class="footer-link">تایبەتمەندی</a>
                            <a href="/#about" class="footer-link">دەربارەی ئێمە</a>
                        </div>
                    </div>

                    <!-- Connect Section -->
                    <div class="footer-section">
                        <h3 class="footer-section-title">پەیوەندی</h3>
                        <div class="footer-links">
                            <p class="footer-contact-text">ئەگەر تە پسیارەک یان پێشنیارەک هەیە، پەیوەندیێ ب مە بکە و ب زویترین دەم دێ بەرسڤا تە هێتە دان!</p>
                            <a href="mailto:info@tafsirkurd.com" class="footer-link">
                                <i class="fas fa-envelope"></i> info@tafsirkurd.com
                            </a>
                            <a href="/#contact" class="footer-link">
                                <i class="fas fa-paper-plane"></i> فۆرما پڕبکە
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Footer Bottom -->
                <div class="footer-bottom">
                    <p class="footer-copyright">
                        &copy; <span id="footer-year"></span> تەفسیر کورد. هەمی ماف د پاراستینە. خودایێ مەزن بەرەکەتێ بێخیتە هەوڵ و ماندیبوونا مە.
                    </p>
                    <div class="footer-meta-links">
                        <a href="/privacy-policy" class="footer-meta-link">پارێزراوی تایبەتمەندی</a>
                        <a href="/terms-and-conditions" class="footer-meta-link">مەرج و ڕێسا</a>
                    </div>
                </div>
            </div>
        </footer>
    `;

    // Insert footer before closing body tag when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertFooter);
    } else {
        insertFooter();
    }

    function insertFooter() {
        // Inject CSS into <head>
        const styleEl = document.createElement('style');
        styleEl.textContent = footerCSS;
        document.head.appendChild(styleEl);

        // Inject footer HTML into <body>
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (footerPlaceholder) {
            footerPlaceholder.outerHTML = footerHTML;
        } else {
            // Fallback: insert before </body>
            document.body.insertAdjacentHTML('beforeend', footerHTML);
        }

        // Set year
        const yearEl = document.getElementById('footer-year');
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    }
})();
