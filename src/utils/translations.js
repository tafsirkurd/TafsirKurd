/**
 * TafsirKurd Dynamic Translations
 * Auto-fetches from Supabase and replaces text across the site
 * Managed via Admin Panel at /admin-translations.html
 *
 * How it works:
 * 1. Fetches key_id → kurdish_text from Supabase
 * 2. Scans DOM for text that matches any translation value
 * 3. Replaces matched text with the current DB value
 * 4. Stores a "previous values" snapshot so that when the admin
 *    CHANGES a translation, the old text in the HTML still maps
 *    to the correct key and gets replaced with the new value.
 */

(function() {
    'use strict';

    // Cache settings
    const CACHE_KEY = 'tafsirkurd_translations';
    const CACHE_EXPIRY_KEY = 'tafsirkurd_translations_expiry';
    const PREV_KEY = 'tafsirkurd_translations_prev';
    const CACHE_DURATION = 30000; // 30s cache — serve instantly from cache, refresh in background

    // Supabase config (loaded from /config endpoint)
    let SUPABASE_URL = null;
    let SUPABASE_ANON_KEY = null;

    // Storage
    let translations = {};       // key_id -> kurdish_text (current)
    let textToKey = {};          // kurdish_text -> key_id (reverse lookup, includes previous values)
    let isLoaded = false;
    let loadPromise = null;
    let configLoaded = false;

    /**
     * Load previous translations snapshot (for detecting changes)
     */
    function loadPrevious() {
        try {
            const prev = localStorage.getItem(PREV_KEY);
            if (prev) return JSON.parse(prev);
        } catch (e) { /* ignore */ }
        return {};
    }

    /**
     * Save current translations as the "previous" snapshot
     * Called after autoApply so next time we can detect changes
     */
    function savePrevious() {
        try {
            localStorage.setItem(PREV_KEY, JSON.stringify(translations));
        } catch (e) { /* ignore */ }
    }

    /**
     * Build the reverse lookup (text → key) from bulk originals + previous + current
     * Priority (lowest→highest): bulk originals → prev snapshot → current DB values
     * This ensures ALL users (new or returning) can match original HTML text to keys,
     * even after an admin has changed a translation in the DB.
     */
    function buildTextToKey() {
        textToKey = {};

        // 1. Seed from BULK_TRANSLATIONS (original hardcoded HTML texts → key)
        //    This is the base layer — covers new users who have no prev snapshot
        if (window.BULK_TRANSLATIONS && Array.isArray(window.BULK_TRANSLATIONS)) {
            window.BULK_TRANSLATIONS.forEach(function(entry) {
                if (entry.key_id && entry.kurdish_text && entry.kurdish_text.trim()) {
                    textToKey[entry.kurdish_text.trim()] = entry.key_id;
                }
            });
        }

        // 2. Previous snapshot (old text → key, covers multi-step admin changes)
        const prev = loadPrevious();
        Object.keys(prev).forEach(key => {
            const text = prev[key];
            if (text && text.trim()) {
                textToKey[text.trim()] = key;
            }
        });

        // 3. Current DB values (highest priority — new text also maps to key)
        Object.keys(translations).forEach(key => {
            const text = translations[key];
            if (text && text.trim()) {
                textToKey[text.trim()] = key;
            }
        });
    }

    /**
     * Lazy-load bulk-translations.js to seed the original HTML text → key mapping.
     * Cached by service worker after first load so subsequent visits are instant.
     */
    function loadBulkTranslations() {
        if (window.BULK_TRANSLATIONS) {
            buildTextToKey();
            return Promise.resolve();
        }
        return new Promise(function(resolve) {
            var script = document.createElement('script');
            script.src = '/utils/bulk-translations.js?v=20260602';
            script.onload = function() { buildTextToKey(); resolve(); };
            script.onerror = resolve;
            document.head.appendChild(script);
        });
    }

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
                buildTextToKey();
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
            localStorage.setItem(CACHE_KEY, JSON.stringify({ translations }));
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
     * Fetch ALL translations from Supabase with pagination.
     * Supabase returns max 1000 rows per request — loop until exhausted.
     * Returns true if data changed (new or updated translations)
     */
    async function fetchFromSupabase() {
        try {
            if (!configLoaded) {
                const loaded = await loadConfig();
                if (!loaded) throw new Error('Could not load Supabase config');
            }

            const BATCH = 1000;
            let allData = [];
            let offset = 0;

            while (true) {
                const response = await fetch(
                    `${SUPABASE_URL}/rest/v1/kurdish_translations?select=key_id,kurdish_text&limit=${BATCH}&offset=${offset}`,
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const batch = await response.json();
                allData = allData.concat(batch);
                if (batch.length < BATCH) break; // last page
                offset += BATCH;
            }

            // Check if anything changed
            const oldCount = Object.keys(translations).length;
            const newTranslations = {};
            allData.forEach(row => {
                newTranslations[row.key_id] = row.kurdish_text;
            });

            let changed = oldCount !== allData.length;
            if (!changed) {
                for (const key of Object.keys(newTranslations)) {
                    if (translations[key] !== newTranslations[key]) {
                        changed = true;
                        break;
                    }
                }
            }

            translations = newTranslations;
            buildTextToKey();
            saveToCache();

            if (changed) {
                console.log(`✓ Loaded ${allData.length} translations from Supabase (changed)`);
            }
            return changed;
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
        // Wait for the eager fetch that started at script load time
        await _eagerPromise;
        return translations;
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
     *
     * Works in two modes:
     * 1. Text matching: scans DOM for text that matches any translation
     *    value (current or previous) and replaces with the current value.
     * 2. Key-based: elements with data-t="key_id" get translated directly.
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

        function tryReplace(text) {
            const normalized = normalizeText(text);
            const key = textToKey[text] || textToKey[normalized] || normalizedLookup[normalized];
            if (key && translations[key]) return translations[key];
            return null;
        }

        // 1. Walk EVERY text node in the document (no missed elements)
        const skipTags = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    if (skipTags[node.parentElement && node.parentElement.tagName]) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) textNodes.push(node);

        textNodes.forEach(function(node) {
            const text = node.textContent.trim();
            if (!text) return;
            const newText = tryReplace(text);
            if (newText && newText !== text) {
                node.textContent = node.textContent.replace(text, newText);
                replacements++;
            }
        });

        // 2. Replace translatable attributes everywhere
        const attrMap = { placeholder: 1, title: 1, 'aria-label': 1, alt: 1, value: 1 };
        document.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(function(el) {
            Object.keys(attrMap).forEach(function(attr) {
                const text = el.getAttribute(attr);
                if (!text) return;
                const trimmed = text.trim();
                const key = textToKey[trimmed] || normalizedLookup[normalizeText(trimmed)];
                if (key && translations[key] && translations[key] !== text) {
                    el.setAttribute(attr, translations[key]);
                    replacements++;
                }
            });
        });

        // 3. data-t key-based (most reliable — always wins)
        const _warnedKeys = window._translationWarnedKeys = window._translationWarnedKeys || new Set();
        document.querySelectorAll('[data-t]').forEach(function(el) {
            const key = el.getAttribute('data-t');
            const val = translations[key];
            if (val !== undefined && el.textContent !== val) {
                el.textContent = val;
                replacements++;
            } else if (val === undefined && !_warnedKeys.has(key)) {
                _warnedKeys.add(key);
                console.warn('[translations] Missing key in DB:', key);
            }
        });
        document.querySelectorAll('[data-t-placeholder]').forEach(function(el) {
            const key = el.getAttribute('data-t-placeholder');
            if (translations[key]) { el.placeholder = translations[key]; replacements++; }
            else if (!_warnedKeys.has(key)) { _warnedKeys.add(key); console.warn('[translations] Missing key in DB:', key); }
        });
        document.querySelectorAll('[data-t-title]').forEach(function(el) {
            const key = el.getAttribute('data-t-title');
            if (translations[key]) { el.title = translations[key]; replacements++; }
            else if (!_warnedKeys.has(key)) { _warnedKeys.add(key); console.warn('[translations] Missing key in DB:', key); }
        });

        savePrevious();
    }

    /**
     * Force refresh from Supabase (clears all caches)
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

    // ── Eager fetch: start loading config + translations immediately,
    //    before DOMContentLoaded, so data is ready by the time DOM renders.
    //    Always awaits a fresh Supabase fetch before resolving — no stale
    //    cache ever gets painted to the DOM.
    const _eagerPromise = (async function() {
        try {
            await loadConfig();
            // Populate JS translations from cache so window.t() works while
            // the fresh fetch is in flight, but do NOT apply to DOM yet.
            const hadCache = loadFromCache();
            if (!hadCache) {
                // First-ever visit: seed textToKey reverse-lookup from bulk list.
                await loadBulkTranslations();
            }
            isLoaded = true;
            // Always wait for the live Supabase result before resolving so
            // onReady's autoApply is guaranteed to use fresh admin edits.
            await fetchFromSupabase();
        } catch (e) {
            // Non-blocking — page still renders with original text
        }
    })();

    // Auto-initialize on DOM ready
    function onReady() {
        _eagerPromise.then(function() {
            autoApply();

            // Live polling: re-fetch every 5s when tab is visible.
            // Only re-apply when data actually changed to avoid unnecessary DOM writes.
            setInterval(function() {
                if (document.visibilityState !== 'visible') return;
                fetchFromSupabase().then(function(changed) {
                    if (changed) autoApply();
                });
            }, 5000);

            // MutationObserver for dynamic content
            const observer = new MutationObserver((mutations) => {
                let shouldReapply = false;
                mutations.forEach(mutation => {
                    if (mutation.addedNodes.length > 0) shouldReapply = true;
                });
                if (shouldReapply) {
                    clearTimeout(window._translationReapplyTimeout);
                    window._translationReapplyTimeout = setTimeout(autoApply, 100);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
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
