/**
 * Universal Scroll Position Manager
 * Saves and restores scroll positions across all pages
 */

(function() {
    'use strict';

    // Get a unique key for the current page
    function getPageKey() {
        // Use pathname + search to distinguish between different pages and query params
        return window.location.pathname + window.location.search;
    }

    // Save current scroll position
    function saveScrollPosition() {
        const pageKey = getPageKey();
        const scrollData = {
            position: window.scrollY,
            timestamp: Date.now()
        };

        try {
            sessionStorage.setItem('scroll_' + pageKey, JSON.stringify(scrollData));
        } catch (e) {
            // Silently fail if sessionStorage is not available
            console.warn('Failed to save scroll position:', e);
        }
    }

    // Restore scroll position for current page
    function restoreScrollPosition() {
        const pageKey = getPageKey();

        // Skip auto-restoration on Quran page - it has custom SPA restoration logic
        if (window.location.pathname === '/quran' || window.location.pathname === '/Quran.html') {
            console.log('⏭️ Skipping universal scroll restoration for Quran page (has custom logic)');
            return; // Don't clear the data - let Quran page handle it
        }

        try {
            const savedData = sessionStorage.getItem('scroll_' + pageKey);

            if (savedData) {
                const { position, timestamp } = JSON.parse(savedData);

                // Only restore if saved within last 5 minutes
                const timeDiff = Date.now() - timestamp;
                if (timeDiff < 5 * 60 * 1000) { // 5 minutes
                    // Small delay to ensure content is rendered
                    setTimeout(() => {
                        window.scrollTo({
                            top: position,
                            behavior: 'smooth'
                        });
                        console.log('📍 Universal scroll restored to:', position);
                    }, 100);
                }

                // Clear the saved position after restoring
                sessionStorage.removeItem('scroll_' + pageKey);
            }
        } catch (e) {
            console.warn('Failed to restore scroll position:', e);
        }
    }

    // Save scroll position on scroll (debounced)
    let scrollTimeout;
    function handleScroll() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(saveScrollPosition, 200);
    }

    // Save scroll position before page unload
    function handleBeforeUnload() {
        saveScrollPosition();
    }

    // Add click handlers to all links to save scroll position
    function addLinkHandlers() {
        document.addEventListener('click', function(e) {
            // Check if clicked element or parent is a link
            let target = e.target;
            while (target && target !== document) {
                if (target.tagName === 'A' && target.href) {
                    // Skip external links and hash links on same page
                    const isExternal = target.hostname !== window.location.hostname;
                    const isSamePageHash = target.pathname === window.location.pathname && target.hash;

                    if (!isExternal && !isSamePageHash) {
                        saveScrollPosition();
                    }
                    break;
                }
                target = target.parentElement;
            }
        }, true); // Use capture to ensure it fires before navigation
    }

    // Initialize on page load
    function init() {
        // Restore scroll position when page loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', restoreScrollPosition);
        } else {
            restoreScrollPosition();
        }

        // Save scroll position periodically while scrolling
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Save scroll position before leaving page
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Add handlers to all links
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addLinkHandlers);
        } else {
            addLinkHandlers();
        }
    }

    // Expose saveScrollPosition globally for manual calls
    window.saveScrollPosition = saveScrollPosition;

    // Auto-initialize
    init();
})();
