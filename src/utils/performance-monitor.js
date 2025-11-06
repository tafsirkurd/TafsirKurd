// Performance Monitoring and PWA Install Handler
(function() {
    'use strict';

    // Monitor page load performance
    window.addEventListener('load', () => {
        if ('performance' in window) {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('⚡ Performance Metrics:');
                console.log(`├─ DNS: ${Math.round(perfData.domainLookupEnd - perfData.domainLookupStart)}ms`);
                console.log(`├─ TCP: ${Math.round(perfData.connectEnd - perfData.connectStart)}ms`);
                console.log(`├─ Request: ${Math.round(perfData.responseStart - perfData.requestStart)}ms`);
                console.log(`├─ Response: ${Math.round(perfData.responseEnd - perfData.responseStart)}ms`);
                console.log(`├─ DOM Processing: ${Math.round(perfData.domContentLoadedEventEnd - perfData.responseEnd)}ms`);
                console.log(`└─ Total Load: ${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`);
            }

            // Check for cached resources
            const resources = performance.getEntriesByType('resource');
            const cachedResources = resources.filter(r =>
                r.transferSize === 0 && r.decodedBodySize > 0
            );
            if (cachedResources.length > 0) {
                console.log(`✅ ${cachedResources.length} resources loaded from cache (instant)`);
            }
        }
    });

    // PWA Install Prompt Handler
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        // Show custom install button or banner
        console.log('💾 PWA Install available');

        // You can trigger the install prompt with:
        // window.showInstallPrompt();
    });

    window.showInstallPrompt = async function() {
        if (!deferredPrompt) {
            console.log('Install prompt not available');
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
        deferredPrompt = null;
    };

    // Service Worker Update Handler
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 New version available - refreshing...');
            window.location.reload();
        });

        // Check for updates periodically
        setInterval(() => {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) reg.update();
            });
        }, 60000); // Check every minute
    }

    // Offline/Online Detection
    window.addEventListener('online', () => {
        console.log('🌐 Back online');
        showNotification('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
        console.log('📴 Offline mode - using cached content');
        showNotification('Offline - using cached content', 'info');
    });

    function showNotification(message, type = 'info') {
        // You can implement a custom notification UI here
        // For now, just log it
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        console.log(`${icon} ${message}`);
    }

    // Font Load Detection
    if ('fonts' in document) {
        Promise.all([
            document.fonts.load('400 16px "IBM Plex Sans Arabic"'),
            document.fonts.load('600 16px "IBM Plex Sans Arabic"'),
            document.fonts.load('400 16px "Amiri Quran"')
        ]).then(() => {
            console.log('✨ All fonts loaded instantly');
        }).catch(() => {
            console.warn('⚠️ Some fonts failed to load');
        });
    }

    // Preload critical pages on idle
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            const criticalPages = ['/Quran.html', '/profile.html', '/bookmarks.html', '/settings.html'];
            criticalPages.forEach(page => {
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = page;
                document.head.appendChild(link);
            });
            console.log('🔮 Preloaded critical pages for instant navigation');
        });
    }
})();
