// Performance Monitoring and PWA Install Handler
(function() {
    'use strict';

    // Store interval/listener references for cleanup
    var swUpdateInterval = null;

    // Show a non-disruptive update banner instead of hard-reloading mid-session
    function _showUpdateBanner() {
        if (document.getElementById('sw-update-banner')) return; // already visible
        var banner = document.createElement('div');
        banner.id = 'sw-update-banner';
        banner.style.cssText = [
            'position:fixed;top:0;left:0;right:0;z-index:99999',
            'background:#1a56db;color:#fff',
            'padding:10px 16px',
            'display:flex;align-items:center;justify-content:center;gap:12px',
            'font-family:sans-serif;font-size:14px',
            'box-shadow:0 2px 8px rgba(0,0,0,.25)',
        ].join(';');
        banner.innerHTML = '🔄 App updated! '
            + '<button onclick="window.location.reload()" style="background:#fff;color:#1a56db;border:none;padding:4px 14px;border-radius:5px;font-size:13px;font-weight:600;cursor:pointer">Refresh Now</button>'
            + '<button onclick="this.parentNode.remove()" style="background:transparent;border:none;color:rgba(255,255,255,.75);font-size:20px;line-height:1;cursor:pointer;padding:0 4px" title="Dismiss">×</button>';
        document.body.insertBefore(banner, document.body.firstChild);
    }

    // Monitor page load performance and report to server on production
    function logPerformance() {
        if (!('performance' in window)) return;

        var perfData = performance.getEntriesByType('navigation')[0];
        if (!perfData) return;

        var loadMs = Math.round(perfData.loadEventEnd - perfData.fetchStart);
        console.log('⚡ Performance: Total Load ' + loadMs + 'ms');

        // Send to server on production so CF Workers Logs capture real load times per build
        if (window.location.hostname === 'tafsirkurd.com' && navigator.sendBeacon) {
            try {
                navigator.sendBeacon('/app-version-report', new Blob([JSON.stringify({
                    platform: 'web',
                    build_number: 'landing',
                    load_time_ms: loadMs,
                })], { type: 'application/json' }));
            } catch(e) {}
        }
    }

    window.addEventListener('load', logPerformance);

    // PWA Install Prompt Handler
    var deferredPrompt = null;

    function handleBeforeInstall(e) {
        deferredPrompt = e;
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.showInstallPrompt = async function() {
        if (!deferredPrompt) {
            return false;
        }

        try {
            deferredPrompt.prompt();
            var result = await deferredPrompt.userChoice;
            deferredPrompt = null;
            return result.outcome === 'accepted';
        } catch (e) {
            return false;
        }
    };

    // Service Worker Update Handler — soft banner, never interrupt mid-session
    function handleControllerChange() {
        _showUpdateBanner();
    }

    function checkForUpdates() {
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker.getRegistration().then(function(reg) {
            if (reg) {
                reg.update().catch(function() {
                    // Ignore update errors
                });
            }
        }).catch(function() {
            // Ignore errors
        });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

        // Check for updates every 5 minutes (not every minute to reduce battery usage)
        swUpdateInterval = setInterval(checkForUpdates, 300000);
    }

    // Offline/Online Detection
    function handleOnline() {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Connection restored', 'success');
        }
    }

    function handleOffline() {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Offline - using cached content', 'info');
        }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Preload critical pages on idle
    if ('requestIdleCallback' in window) {
        requestIdleCallback(function() {
            var criticalPages = ['/quran.html', '/profile.html', '/settings.html'];
            criticalPages.forEach(function(page) {
                var link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = page;
                document.head.appendChild(link);
            });
        });
    }

    // Cleanup function for SPA navigation or page unload
    window.cleanupPerformanceMonitor = function() {
        if (swUpdateInterval) {
            clearInterval(swUpdateInterval);
            swUpdateInterval = null;
        }

        window.removeEventListener('load', logPerformance);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        }
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        if (swUpdateInterval) {
            clearInterval(swUpdateInterval);
        }
    });
})();
