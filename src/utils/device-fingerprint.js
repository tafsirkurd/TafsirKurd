// Device Fingerprinting for Admin Security
// Generates a unique fingerprint for the current browser/device

window.deviceFingerprint = (function() {

    function generateFingerprint() {
        const components = [];

        // 1. Screen resolution
        components.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);

        // 2. Timezone
        components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

        // 3. Language
        components.push(`lang:${navigator.language}`);

        // 4. Platform
        components.push(`platform:${navigator.platform}`);

        // 5. Hardware concurrency (CPU cores)
        components.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);

        // 6. Device memory (if available)
        if (navigator.deviceMemory) {
            components.push(`mem:${navigator.deviceMemory}GB`);
        }

        // 7. Canvas fingerprint (more unique)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('TafsirKurd Admin', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Device Fingerprint', 4, 17);
            const canvasData = canvas.toDataURL();
            components.push(`canvas:${simpleHash(canvasData)}`);
        }

        // 8. WebGL fingerprint
        try {
            const glCanvas = document.createElement('canvas');
            const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    components.push(`webgl:${vendor}|${renderer}`);
                }
            }
        } catch (e) {
            // WebGL not available
        }

        // 9. Plugins (if available - deprecated in some browsers)
        if (navigator.plugins && navigator.plugins.length > 0) {
            const pluginNames = Array.from(navigator.plugins)
                .map(p => p.name)
                .sort()
                .slice(0, 5) // Only first 5 to keep it short
                .join(',');
            components.push(`plugins:${simpleHash(pluginNames)}`);
        }

        // 10. Touch support
        const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        components.push(`touch:${touchSupport}`);

        // Combine all components and hash
        const fingerprintString = components.join('|');
        return simpleHash(fingerprintString);
    }

    // Simple hash function (FNV-1a)
    function simpleHash(str) {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return (hash >>> 0).toString(36);
    }

    // Public API
    return {
        get: function() {
            // Cache the fingerprint in sessionStorage for consistency during session
            let fingerprint = sessionStorage.getItem('deviceFingerprint');
            if (!fingerprint) {
                fingerprint = generateFingerprint();
                sessionStorage.setItem('deviceFingerprint', fingerprint);
            }
            return fingerprint;
        },

        clear: function() {
            sessionStorage.removeItem('deviceFingerprint');
        },

        regenerate: function() {
            this.clear();
            return this.get();
        }
    };
})();
