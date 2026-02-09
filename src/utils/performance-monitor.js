// Performance Monitoring and PWA Install Handler
(function() {
    'use strict';

    // Store interval/listener references for cleanup
    var swUpdateInterval = null;

    // Monitor page load performance (development only)
    function logPerformance() {
        if (!('performance' in window)) return;

        var perfData = performance.getEntriesByType('navigation')[0];
        if (!perfData) return;

        // Only log in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('⚡ Performance: Total Load ' + Math.round(perfData.loadEventEnd - perfData.fetchStart) + 'ms');
        }
    }

    window.addEventListener('load', logPerformance);

    // PWA Install Prompt Handler
    var deferredPrompt = null;

    function handleBeforeInstall(e) {
        e.preventDefault();
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

    // Service Worker Update Handler
    function handleControllerChange() {
        window.location.reload();
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
