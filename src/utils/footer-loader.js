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
                    <h3 class="footer-section-title">گەڕیان</h3>
                    <div class="footer-links">
                        <a href="/profile" class="footer-link">پرۆفایل</a>
                        <a href="/goals" class="footer-link">ئارمانج</a>
                        <a href="/bookmarks" class="footer-link">نیشانەکری</a>
                        <a href="/settings" class="footer-link">رێکخستن</a>
                    </div>
                </div>

                <!-- Resources Section -->
                <div class="footer-section">
                    <h3 class="footer-section-title">رۆژپەڕێن دی</h3>
                    <div class="footer-links">
                        <a href="/" class="footer-link">مالپەڕێ سەرەکی</a>
                        <a href="/quran" class="footer-link">قورئانا پیرۆز</a>
                        <a href="/#features" class="footer-link">تایبەتمەندی</a>
                        <a href="/#about" class="footer-link">دەربارەی مە</a>
                    </div>
                </div>

                <!-- Connect Section -->
                <div class="footer-section">
                    <h3 class="footer-section-title">پەیوەندی</h3>
                    <div class="footer-links">
                        <p class="footer-contact-text">ئەگەر تە پرسیارەک یان پێشنیارەک هەبیت، پەیوەندییێ ب مە بکە و ب زووترین دەم دێ بەرسڤا تە هێتە دان!</p>
                        <a href="mailto:info@tafsirkurd.com" class="footer-link">
                            <i class="fas fa-envelope"></i> info@tafsirkurd.com
                        </a>
                        <a href="/#contact" class="footer-link">
                            <i class="fas fa-paper-plane"></i> فۆرمێ پڕ بکە
                        </a>
                    </div>
                </div>
            </div>

            <!-- Footer Bottom -->
            <div class="footer-bottom">
                <p class="footer-copyright">
                    &copy; <span id="footer-year"></span> تەفسیر کورد. هەمی ماف پاراستی نە. خودایێ مەزن بەرەکەتێ بێخیتە هەول و ماندبوونا مە.
                </p>
                <div class="footer-meta-links">
                    <a href="/privacy-policy" class="footer-meta-link">پاراستنا تایبەتمەندیێ</a>
                    <a href="/terms-and-conditions" class="footer-meta-link">مەرج و رێسایان</a>
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
        }
    }
})();
