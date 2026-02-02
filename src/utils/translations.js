/**
 * TafsirKurd Dynamic Translations
 * Auto-fetches from Supabase and replaces text across the site
 * Managed via Admin Panel at /admin-translations.html
 */

(function() {
    'use strict';

    // Cache settings
    const CACHE_KEY = 'tafsirkurd_translations';
    const CACHE_EXPIRY_KEY = 'tafsirkurd_translations_expiry';
    const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

    // Supabase config (loaded from /config endpoint)
    let SUPABASE_URL = null;
    let SUPABASE_ANON_KEY = null;

    // Storage
    let translations = {};       // key_id -> kurdish_text
    let textToKey = {};          // kurdish_text -> key_id (reverse lookup)
    let isLoaded = false;
    let loadPromise = null;
    let configLoaded = false;

    /**
     * Load from localStorage cache
     */
    function loadFromCache() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
            if (cached && expiry && Date.now() < parseInt(expiry)) {
                const data = JSON.parse(cached);
                translations = data.translations || {};
                textToKey = data.textToKey || {};
                return true;
            }
        } catch (e) {
            console.warn('Cache load failed:', e);
        }
        return false;
    }

    /**
     * Save to localStorage cache
     */
    function saveToCache() {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ translations, textToKey }));
            localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
        } catch (e) {
            console.warn('Cache save failed:', e);
        }
    }

    /**
     * Load Supabase config from /config endpoint
     */
    async function loadConfig() {
        if (configLoaded) return true;
        try {
            const response = await fetch('/config');
            if (!response.ok) throw new Error('Failed to fetch config');
            const config = await response.json();
            SUPABASE_URL = config.supabaseUrl;
            SUPABASE_ANON_KEY = config.supabaseKey;
            configLoaded = true;
            return true;
        } catch (e) {
            console.warn('Config load failed:', e);
            return false;
        }
    }

    /**
     * Fetch translations from Supabase
     */
    async function fetchFromSupabase() {
        try {
            // Load config first
            if (!configLoaded) {
                const loaded = await loadConfig();
                if (!loaded) throw new Error('Could not load Supabase config');
            }

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/kurdish_translations?select=key_id,kurdish_text`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            translations = {};
            textToKey = {};

            data.forEach(row => {
                const key = row.key_id;
                const text = row.kurdish_text;
                translations[key] = text;
                // Build reverse lookup (text -> key)
                // Normalize text for matching
                const normalizedText = text.trim();
                if (normalizedText) {
                    textToKey[normalizedText] = key;
                }
            });

            saveToCache();
            console.log(`✓ Loaded ${data.length} translations from Supabase`);
            return true;
        } catch (e) {
            console.warn('Supabase fetch failed:', e);
            return false;
        }
    }

    /**
     * Initialize translations
     */
    async function init() {
        if (isLoaded) return translations;
        if (loadPromise) return loadPromise;

        loadPromise = (async () => {
            // Try cache first
            if (loadFromCache()) {
                isLoaded = true;
                // Refresh in background
                setTimeout(() => fetchFromSupabase(), 1000);
                return translations;
            }

            // Fetch fresh
            await fetchFromSupabase();
            isLoaded = true;
            return translations;
        })();

        return loadPromise;
    }

    /**
     * Get translation by key
     */
    function t(key, replacements = {}) {
        let value = translations[key];

        if (value === undefined) {
            return key;
        }

        // Handle ${variable} replacements
        if (typeof value === 'string' && Object.keys(replacements).length > 0) {
            for (const [placeholder, replacement] of Object.entries(replacements)) {
                value = value.replace(new RegExp(`\\$\\{${placeholder}\\}`, 'g'), replacement);
            }
        }

        return value;
    }

    /**
     * Get key by text (reverse lookup)
     */
    function getKeyByText(text) {
        return textToKey[text.trim()];
    }

    /**
     * Normalize text for matching (trim, collapse whitespace)
     */
    function normalizeText(text) {
        return text ? text.trim().replace(/\s+/g, ' ') : '';
    }

    /**
     * Auto-apply translations to the page
     * Replaces text content that matches translations in database
     */
    function autoApply() {
        if (Object.keys(translations).length === 0) return;

        const startTime = performance.now();
        let replacements = 0;

        // Build normalized lookup for flexible matching
        const normalizedLookup = {};
        Object.keys(textToKey).forEach(text => {
            normalizedLookup[normalizeText(text)] = textToKey[text];
        });

        // Elements to check for text replacement
        const selectors = [
            'button',
            'a',
            'label',
            'span',
            'p',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'li',
            'th', 'td',
            'option',
            'div.btn',
            '.nav-item-label',
            '.form-label',
            '.modal-label',
            '.section-title',
            '.card-title',
            '.stat-label',
            '.metric-label',
            '.hero-title',
            '.hero-sub',
            '.feature-title',
            '.feature-desc',
            '.card-text',
            '.description',
            '.subtitle',
            '.info-text'
        ];

        // Attributes to check
        const attributeChecks = [
            { attr: 'placeholder', selector: 'input[placeholder], textarea[placeholder]' },
            { attr: 'title', selector: '[title]' },
            { attr: 'aria-label', selector: '[aria-label]' },
            { attr: 'alt', selector: 'img[alt]' }
        ];

        // Helper to find and replace text
        function tryReplace(text) {
            const normalized = normalizeText(text);
            const key = textToKey[text] || textToKey[normalized] || normalizedLookup[normalized];
            if (key && translations[key]) {
                return translations[key];
            }
            return null;
        }

        // Replace text content in elements
        selectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    // For elements with no children, replace entire text
                    if (el.children.length === 0) {
                        const text = el.textContent.trim();
                        const newText = tryReplace(text);
                        if (newText && newText !== text) {
                            el.textContent = newText;
                            replacements++;
                        }
                    } else {
                        // For elements with children, check direct text nodes
                        el.childNodes.forEach(node => {
                            if (node.nodeType === Node.TEXT_NODE) {
                                const text = node.textContent.trim();
                                if (text) {
                                    const newText = tryReplace(text);
                                    if (newText && newText !== text) {
                                        node.textContent = newText;
                                        replacements++;
                                    }
                                }
                            }
                        });
                    }
                });
            } catch (e) {
                // Ignore selector errors
            }
        });

        // Replace attributes
        attributeChecks.forEach(({ attr, selector }) => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    const text = el.getAttribute(attr);
                    if (text && textToKey[text.trim()]) {
                        const newText = translations[textToKey[text.trim()]];
                        if (newText && newText !== text) {
                            el.setAttribute(attr, newText);
                            replacements++;
                        }
                    }
                });
            } catch (e) {
                // Ignore errors
            }
        });

        // Also apply to elements with data-t attribute (explicit translations)
        document.querySelectorAll('[data-t]').forEach(el => {
            const key = el.getAttribute('data-t');
            if (translations[key]) {
                el.textContent = translations[key];
                replacements++;
            }
        });

        document.querySelectorAll('[data-t-placeholder]').forEach(el => {
            const key = el.getAttribute('data-t-placeholder');
            if (translations[key]) {
                el.placeholder = translations[key];
                replacements++;
            }
        });

        document.querySelectorAll('[data-t-title]').forEach(el => {
            const key = el.getAttribute('data-t-title');
            if (translations[key]) {
                el.title = translations[key];
                replacements++;
            }
        });

        const elapsed = (performance.now() - startTime).toFixed(1);
        if (replacements > 0) {
            console.log(`✓ Applied ${replacements} translations in ${elapsed}ms`);
        }
    }

    /**
     * Force refresh from Supabase
     */
    async function refresh() {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_EXPIRY_KEY);
        isLoaded = false;
        loadPromise = null;
        await init();
        autoApply();
    }

    /**
     * Get all translations
     */
    function getAll() {
        return { ...translations };
    }

    /**
     * Check if loaded
     */
    function ready() {
        return isLoaded;
    }

    // Auto-initialize on DOM ready
    function onReady() {
        init().then(() => {
            autoApply();

            // Re-apply after dynamic content loads (e.g., after AJAX)
            // Use MutationObserver for dynamic content
            const observer = new MutationObserver((mutations) => {
                let shouldReapply = false;
                mutations.forEach(mutation => {
                    if (mutation.addedNodes.length > 0) {
                        shouldReapply = true;
                    }
                });
                if (shouldReapply) {
                    // Debounce
                    clearTimeout(window._translationReapplyTimeout);
                    window._translationReapplyTimeout = setTimeout(autoApply, 100);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }

    // Export API
    window.TafsirTranslations = {
        t,
        init,
        refresh,
        autoApply,
        getAll,
        ready,
        getKeyByText
    };

    window.t = t;

})();
