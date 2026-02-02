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

    // Supabase config
    const SUPABASE_URL = 'https://fqyvgxzcbpyrjcuavifd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxeXZneHpjYnB5cmpjdWF2aWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNDcyMDQsImV4cCI6MjA1MTgyMzIwNH0.cFbOv9NaClOvjXKswDQ5bDNkVn8TxaEHvPvT3_GwLXY';

    // Storage
    let translations = {};       // key_id -> kurdish_text
    let textToKey = {};          // kurdish_text -> key_id (reverse lookup)
    let isLoaded = false;
    let loadPromise = null;

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
     * Fetch translations from Supabase
     */
    async function fetchFromSupabase() {
        try {
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
     * Auto-apply translations to the page
     * Replaces text content that matches translations in database
     */
    function autoApply() {
        if (Object.keys(translations).length === 0) return;

        const startTime = performance.now();
        let replacements = 0;

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
            '.metric-label'
        ];

        // Attributes to check
        const attributeChecks = [
            { attr: 'placeholder', selector: 'input[placeholder], textarea[placeholder]' },
            { attr: 'title', selector: '[title]' },
            { attr: 'aria-label', selector: '[aria-label]' },
            { attr: 'alt', selector: 'img[alt]' }
        ];

        // Replace text content
        selectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    // Skip if element has children with text (we want leaf nodes)
                    if (el.children.length > 0 && el.querySelector('span, a, button')) return;

                    const text = el.textContent.trim();
                    if (text && textToKey[text]) {
                        const newText = translations[textToKey[text]];
                        if (newText && newText !== text) {
                            el.textContent = newText;
                            replacements++;
                        }
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
