// Device Fingerprinting for Admin Security
// Collects device data and sends to server for secure fingerprint generation
// The actual fingerprint is generated server-side with a secret salt

window.deviceFingerprint = (function() {

    // Collect raw device data (no hashing here - server does that)
    function collectDeviceData() {
        const data = {};

        // 1. Screen resolution
        data.screen = `${screen.width}x${screen.height}x${screen.colorDepth}`;

        // 2. Timezone
        try {
            data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {
            data.timezone = '';
        }

        // 3. Language
        data.language = navigator.language || '';

        // 4. Platform
        data.platform = navigator.platform || '';

        // 5. Hardware concurrency (CPU cores)
        data.cores = navigator.hardwareConcurrency || '';

        // 6. Device memory (if available)
        data.memory = navigator.deviceMemory || '';

        // 7. Canvas fingerprint data
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillStyle = '#f60';
                ctx.fillRect(125, 1, 62, 20);
                ctx.fillStyle = '#069';
                ctx.fillText('TK', 2, 15);
                data.canvas = canvas.toDataURL().substring(0, 100);
            }
        } catch (e) {
            data.canvas = '';
        }

        // 8. WebGL info
        try {
            const glCanvas = document.createElement('canvas');
            const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    data.webgl = `${vendor}|${renderer}`;
                }
            }
        } catch (e) {
            data.webgl = '';
        }

        // 9. Touch support
        data.touch = ('ontouchstart' in window || navigator.maxTouchPoints > 0) ? 'yes' : 'no';

        return data;
    }

    // Get fingerprint from server
    async function getServerFingerprint() {
        try {
            const deviceData = collectDeviceData();

            const response = await fetch('/device-fingerprint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deviceData)
            });

            const result = await response.json();

            if (result.success && result.fingerprint) {
                return result.fingerprint;
            }

            // Fallback if server fails - but this is less secure
            console.warn('Server fingerprint failed, using fallback');
            return fallbackFingerprint(deviceData);

        } catch (error) {
            console.error('Fingerprint error:', error);
            return fallbackFingerprint(collectDeviceData());
        }
    }

    // Fallback fingerprint (only used if server is unreachable)
    function fallbackFingerprint(data) {
        const str = Object.values(data).join('|');
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return 'fb_' + (hash >>> 0).toString(36);
    }

    // Public API
    return {
        get: async function() {
            // Check cache first
            let fingerprint = sessionStorage.getItem('deviceFingerprint');
            if (fingerprint) {
                return fingerprint;
            }

            // Get from server
            fingerprint = await getServerFingerprint();
            sessionStorage.setItem('deviceFingerprint', fingerprint);
            return fingerprint;
        },

        clear: function() {
            sessionStorage.removeItem('deviceFingerprint');
        },

        regenerate: async function() {
            this.clear();
            return await this.get();
        }
    };
})();
