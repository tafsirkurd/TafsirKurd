/**
 * 🔥🔥🔥 NUCLEAR SECURITY MODULE 🔥🔥🔥
 * Comprehensive security system for TafsirKurd
 *
 * Features:
 * - Session Fingerprinting
 * - Behavioral Analysis
 * - DevTools Detection
 * - Rate Limiting
 * - Security Event Logging
 * - DOM Integrity Verification
 * - Clipboard Protection
 * - Screenshot Detection
 * - Timing Anomaly Detection
 * - Tab Visibility Tracking
 * - Network Connection Monitoring
 * - WebRTC Leak Detection
 * - Pointer Analysis
 * - Autofill Detection
 * - XSS Protection
 */

// ============================================================================
// SECURITY EVENT LOGGING
// ============================================================================

function logSecurityEvent(eventType, details = {}) {
    const events = JSON.parse(localStorage.getItem('securityEvents') || '[]');

    const event = {
        type: eventType,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        ...details
    };

    events.push(event);

    // Keep last 100 events only
    if (events.length > 100) {
        events.shift();
    }

    localStorage.setItem('securityEvents', JSON.stringify(events));

    // Log to console in development
    // Security Event logged
}

// ============================================================================
// XSS PROTECTION
// ============================================================================

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Make it globally available
window.escapeHtml = escapeHtml;

// ============================================================================
// RATE LIMITING & BRUTE FORCE PROTECTION
// ============================================================================

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(type = 'action') {
    const storageKey = `rateLimit_${type}`;
    const attempts = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const now = Date.now();

    // Clean old attempts
    const recentAttempts = attempts.filter(timestamp => now - timestamp < ATTEMPT_WINDOW);

    // Check if locked out
    if (recentAttempts.length >= MAX_ATTEMPTS) {
        const oldestAttempt = recentAttempts[0];
        const lockoutEnd = oldestAttempt + LOCKOUT_DURATION;

        if (now < lockoutEnd) {
            const remainingMinutes = Math.ceil((lockoutEnd - now) / 60000);
            return {
                allowed: false,
                message: `حسابا تە هاتیە بلۆککرن. دووبارە هەوڵبدە پاش ${remainingMinutes} خولەکان.`,
                remainingTime: lockoutEnd - now
            };
        }
    }

    return { allowed: true };
}

function recordAttempt(type = 'action') {
    const storageKey = `rateLimit_${type}`;
    const attempts = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const now = Date.now();

    attempts.push(now);

    // Keep only recent attempts
    const recentAttempts = attempts.filter(timestamp => now - timestamp < ATTEMPT_WINDOW);

    localStorage.setItem(storageKey, JSON.stringify(recentAttempts));

    logSecurityEvent(`${type}_attempt`, {
        attemptsCount: recentAttempts.length,
        timestamp: now
    });
}

function clearAttempts(type = 'action') {
    const storageKey = `rateLimit_${type}`;
    localStorage.removeItem(storageKey);
}

// ============================================================================
// SESSION FINGERPRINTING
// ============================================================================

function generateFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('🔒', 2, 2);

    const fingerprint = {
        canvas: canvas.toDataURL().slice(-50),
        screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        deviceMemory: navigator.deviceMemory || 0,
        plugins: Array.from(navigator.plugins || []).map(p => p.name).join(',').slice(0, 100)
    };

    return btoa(JSON.stringify(fingerprint)).slice(0, 64);
}

function initFingerprint() {
    const fingerprint = generateFingerprint();
    sessionStorage.setItem('securityFingerprint', fingerprint);
    logSecurityEvent('fingerprint_generated', {
        fingerprint: fingerprint.slice(0, 20)
    });
    return fingerprint;
}

function validateSession() {
    const storedFingerprint = sessionStorage.getItem('securityFingerprint');
    const currentFingerprint = generateFingerprint();

    if (storedFingerprint && storedFingerprint !== currentFingerprint) {
        logSecurityEvent('session_hijack_attempt', {
            stored: storedFingerprint.slice(0, 20),
            current: currentFingerprint.slice(0, 20)
        });

        // Clear session
        sessionStorage.clear();
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');

        alert('⚠️ گۆڕانکارییەک د سیشنا تە دا هاتە دیتن. تکایە دووبارە بچە ژوورڤە.');
        window.location.href = '/login.html';
        return false;
    }

    if (!storedFingerprint) {
        initFingerprint();
    }

    return true;
}

// ============================================================================
// DEVTOOLS DETECTION
// ============================================================================

let devtoolsOpen = false;

function checkDevTools() {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;

    if (widthThreshold || heightThreshold) {
        if (!devtoolsOpen) {
            devtoolsOpen = true;
            logSecurityEvent('devtools_opened', {
                outerWidth: window.outerWidth,
                innerWidth: window.innerWidth,
                outerHeight: window.outerHeight,
                innerHeight: window.innerHeight
            });
        }
    } else {
        devtoolsOpen = false;
    }
}

function initDevToolsDetection() {
    setInterval(checkDevTools, 1000);
}

// ============================================================================
// BEHAVIORAL ANALYSIS
// ============================================================================

const behaviorTracker = {
    mouseMovements: 0,
    keystrokes: 0,
    startTime: Date.now(),
    suspiciousScore: 0,

    trackMouse: function() {
        this.mouseMovements++;
    },

    trackKeyboard: function() {
        this.keystrokes++;
    },

    calculateScore: function() {
        const timeElapsed = (Date.now() - this.startTime) / 1000;
        const mouseRate = (this.mouseMovements / timeElapsed) * 60;
        const keystrokeRate = (this.keystrokes / timeElapsed) * 60;

        let score = 0;

        // Too fast = likely bot
        if (mouseRate > 200) score += 30;
        if (keystrokeRate > 150) score += 30;

        // Too slow/perfect = likely bot
        if (timeElapsed > 5 && mouseRate < 5) score += 20;
        if (timeElapsed > 5 && this.mouseMovements === 0) score += 40;

        // Perfect timing = likely bot
        if (this.keystrokes > 10 && this.keystrokes % 10 === 0) score += 10;

        this.suspiciousScore = score;

        if (score > 50) {
            logSecurityEvent('suspicious_behavior', {
                score: score,
                mouseRate: mouseRate.toFixed(2),
                keystrokeRate: keystrokeRate.toFixed(2),
                timeElapsed: timeElapsed.toFixed(2)
            });
        }

        return score;
    }
};

function initBehavioralTracking() {
    document.addEventListener('mousemove', () => behaviorTracker.trackMouse(), { passive: true });
    document.addEventListener('keydown', () => behaviorTracker.trackKeyboard(), { passive: true });
}

// ============================================================================
// CLIPBOARD PROTECTION
// ============================================================================

function protectField(fieldId, fieldType = 'sensitive') {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Prevent copy
    field.addEventListener('copy', (e) => {
        e.preventDefault();
        logSecurityEvent(`${fieldType}_copy_attempt`, { field: fieldId });
        return false;
    });

    // Prevent cut
    field.addEventListener('cut', (e) => {
        e.preventDefault();
        logSecurityEvent(`${fieldType}_cut_attempt`, { field: fieldId });
        return false;
    });

    // Warn on paste
    field.addEventListener('paste', (e) => {
        logSecurityEvent(`${fieldType}_paste`, { field: fieldId });
        behaviorTracker.suspiciousScore += 15;
    });
}

// ============================================================================
// SCREENSHOT DETECTION
// ============================================================================

function initScreenshotDetection() {
    document.addEventListener('keyup', (e) => {
        if (e.key === 'PrintScreen') {
            logSecurityEvent('screenshot_attempt', {
                page: window.location.pathname
            });
        }
    });
}

// ============================================================================
// DOM INTEGRITY VERIFICATION
// ============================================================================

function verifyPageIntegrity(criticalElements = []) {
    for (const elementId of criticalElements) {
        const element = document.getElementById(elementId);
        if (element) {
            const originalType = element.getAttribute('data-original-type');
            if (originalType && element.type !== originalType) {
                logSecurityEvent('dom_tampering', {
                    element: elementId,
                    expected: originalType,
                    actual: element.type
                });
            }
        }
    }
}

function initIntegrityCheck(criticalElements = []) {
    // Store original types
    criticalElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.setAttribute('data-original-type', element.type);
        }
    });

    // Check every 5 seconds
    setInterval(() => verifyPageIntegrity(criticalElements), 5000);
}

// ============================================================================
// RIGHT-CLICK & DRAG PROTECTION
// ============================================================================

function initRightClickProtection() {
    document.addEventListener('contextmenu', (e) => {
        logSecurityEvent('right_click_attempt', {
            target: e.target.id || e.target.className || 'unknown',
            x: e.clientX,
            y: e.clientY
        });
        // Optionally prevent: e.preventDefault();
    });
}

function initDragProtection() {
    document.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            logSecurityEvent('drag_attempt', {
                element: e.target.id
            });
            e.preventDefault();
            return false;
        }
    });
}

// ============================================================================
// TAB VISIBILITY TRACKING
// ============================================================================

let tabAwayCount = 0;
let tabAwayTime = 0;
let lastVisibilityChange = Date.now();

function initTabTracking() {
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            lastVisibilityChange = Date.now();
        } else {
            const awayDuration = Date.now() - lastVisibilityChange;
            tabAwayCount++;
            tabAwayTime += awayDuration;

            if (tabAwayCount > 5 && tabAwayTime < 30000) {
                logSecurityEvent('suspicious_tab_switching', {
                    count: tabAwayCount,
                    totalTime: tabAwayTime
                });
                behaviorTracker.suspiciousScore += 20;
            }
        }
    });
}

// ============================================================================
// NETWORK CONNECTION MONITORING
// ============================================================================

function detectConnectionType() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
        logSecurityEvent('connection_info', {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
        });

        // Suspicious if using VPN/Tor (very high RTT)
        if (connection.rtt && connection.rtt > 500) {
            logSecurityEvent('high_latency_connection', {
                rtt: connection.rtt,
                possibleVPN: true
            });
        }
    }
}

function initNetworkMonitoring() {
    detectConnectionType();

    if (navigator.connection) {
        navigator.connection.addEventListener('change', detectConnectionType);
    }
}

// ============================================================================
// WEBRTC LEAK DETECTION
// ============================================================================

async function detectWebRTCLeaks() {
    if (!window.RTCPeerConnection) return;

    try {
        const pc = new RTCPeerConnection({
            iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
        });

        pc.createDataChannel('');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const ips = [];
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
                const match = ipRegex.exec(e.candidate.candidate);
                if (match) {
                    ips.push(match[0]);
                    logSecurityEvent('webrtc_ip_detected', {
                        ip: match[0].replace(/\d+$/, 'XXX')
                    });
                }
            }
        };

        setTimeout(() => pc.close(), 1000);
    } catch (error) {
        logSecurityEvent('webrtc_blocked', {
            possibleVPN: true
        });
    }
}

// ============================================================================
// POINTER ANALYSIS (Advanced Bot Detection)
// ============================================================================

const pointerAnalyzer = {
    events: [],

    track: function(e) {
        this.events.push({
            type: e.type,
            x: e.clientX,
            y: e.clientY,
            timestamp: Date.now(),
            pressure: e.pressure || 0,
            pointerType: e.pointerType || 'unknown'
        });

        if (this.events.length > 50) this.events.shift();
    },

    analyze: function() {
        if (this.events.length < 10) return { isSuspicious: false, score: 0 };

        let suspiciousScore = 0;

        // Check for perfect straight lines
        let straightLines = 0;
        for (let i = 2; i < this.events.length; i++) {
            const dx1 = this.events[i-1].x - this.events[i-2].x;
            const dy1 = this.events[i-1].y - this.events[i-2].y;
            const dx2 = this.events[i].x - this.events[i-1].x;
            const dy2 = this.events[i].y - this.events[i-1].y;

            if (dx1 !== 0 && dy1 !== 0 && Math.abs(dx2/dx1 - dy2/dy1) < 0.01) {
                straightLines++;
            }
        }

        if (straightLines > 5) suspiciousScore += 30;

        // Check for impossible speed
        for (let i = 1; i < this.events.length; i++) {
            const distance = Math.sqrt(
                Math.pow(this.events[i].x - this.events[i-1].x, 2) +
                Math.pow(this.events[i].y - this.events[i-1].y, 2)
            );
            const time = this.events[i].timestamp - this.events[i-1].timestamp;
            const speed = time > 0 ? distance / time : 0;

            if (speed > 5) suspiciousScore += 20;
        }

        // Check for input type switching
        const types = new Set(this.events.map(e => e.pointerType));
        if (types.size > 1 && this.events.length < 20) {
            suspiciousScore += 15;
        }

        return {
            isSuspicious: suspiciousScore > 40,
            score: suspiciousScore,
            straightLines: straightLines
        };
    }
};

function initPointerAnalysis() {
    ['pointermove', 'pointerdown', 'pointerup'].forEach(eventType => {
        document.addEventListener(eventType, (e) => pointerAnalyzer.track(e), { passive: true });
    });
}

// ============================================================================
// AUTOFILL DETECTION
// ============================================================================

function detectAutofill() {
    const inputs = document.querySelectorAll('input');
    let autofilledCount = 0;

    inputs.forEach(input => {
        if (input.matches(':-webkit-autofill')) {
            autofilledCount++;
        }

        let lastValue = input.value;
        const observer = new MutationObserver(() => {
            if (input.value !== lastValue && input.value.length > 5) {
                const timeSinceFocus = Date.now() - (input.dataset.lastFocus || 0);
                if (timeSinceFocus < 50) {
                    logSecurityEvent('instant_fill_detected', {
                        field: input.id,
                        timeSinceFocus: timeSinceFocus
                    });
                    behaviorTracker.suspiciousScore += 25;
                }
            }
            lastValue = input.value;
        });

        input.addEventListener('focus', () => {
            input.dataset.lastFocus = Date.now();
        });

        observer.observe(input, { attributes: true, attributeFilter: ['value'] });
    });

    if (autofilledCount > 2) {
        logSecurityEvent('multiple_autofill', {
            count: autofilledCount
        });
    }
}

// ============================================================================
// SECURITY DASHBOARD
// ============================================================================

function showSecurityDashboard() {
    const events = JSON.parse(localStorage.getItem('securityEvents') || '[]');
    const rateLimit = JSON.parse(localStorage.getItem('rateLimit_login') || '[]');

    let dashboard = `
🔒 SECURITY DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STATISTICS:
- Total Events: ${events.length}
- Recent Attempts: ${rateLimit.length}
- Suspicious Score: ${behaviorTracker.suspiciousScore}
- DevTools: ${devtoolsOpen ? '⚠️ OPEN' : '✓ Closed'}

📝 RECENT EVENTS (Last 10):
${events.slice(-10).reverse().map(e => `
• ${e.type}
  Page: ${e.page}
  Time: ${new Date(e.timestamp).toLocaleString()}
  ${JSON.stringify(e, null, 2).slice(0, 200)}
`).join('\n')}

🎯 BEHAVIORAL ANALYSIS:
- Mouse Movements: ${behaviorTracker.mouseMovements}
- Keystrokes: ${behaviorTracker.keystrokes}
- Session Age: ${((Date.now() - behaviorTracker.startTime) / 1000).toFixed(0)}s

🔑 SESSION INFO:
- Fingerprint: ${generateFingerprint().slice(0, 30)}...
- User Agent: ${navigator.userAgent.slice(0, 80)}...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    console.log(dashboard);
}

function initSecurityDashboard() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            showSecurityDashboard();
        }
    });
}

// ============================================================================
// COMPREHENSIVE THREAT MONITORING
// ============================================================================

function initThreatMonitoring() {
    setInterval(() => {
        const pointerAnalysis = pointerAnalyzer.analyze();
        if (pointerAnalysis.isSuspicious) {
            logSecurityEvent('suspicious_pointer_behavior', pointerAnalysis);
        }

        // Check overall threat level
        const totalScore = behaviorTracker.suspiciousScore + pointerAnalysis.score;
        if (totalScore > 100) {
            logSecurityEvent('CRITICAL_THREAT_DETECTED', {
                behaviorScore: behaviorTracker.suspiciousScore,
                pointerScore: pointerAnalysis.score,
                totalScore: totalScore,
                recommendation: 'BLOCK_USER'
            });
        }
    }, 30000); // Every 30 seconds
}

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================

/**
 * Initialize nuclear security for a page
 * @param {Object} options - Configuration options
 * @param {string[]} options.criticalElements - IDs of elements to monitor for tampering
 * @param {string[]} options.protectedFields - IDs of fields to protect from clipboard operations
 * @param {boolean} options.validateSession - Whether to validate session fingerprint
 * @param {string} options.securityLevel - 'basic', 'standard', 'maximum', or 'nuclear'
 */
function initNuclearSecurity(options = {}) {
    const {
        criticalElements = [],
        protectedFields = [],
        validateSession: shouldValidateSession = true,
        securityLevel = 'nuclear'
    } = options;

    // Always init fingerprint
    if (!sessionStorage.getItem('securityFingerprint')) {
        initFingerprint();
    }

    // Validate session if requested
    if (shouldValidateSession) {
        if (!validateSession()) {
            return; // Session invalid, user redirected
        }
    }

    // Basic security (all levels)
    initBehavioralTracking();
    initScreenshotDetection();
    initRightClickProtection();
    initDragProtection();
    initSecurityDashboard();

    // Standard security and above
    if (['standard', 'maximum', 'nuclear'].includes(securityLevel)) {
        initDevToolsDetection();
        initTabTracking();

        if (criticalElements.length > 0) {
            initIntegrityCheck(criticalElements);
        }
    }

    // Maximum security and above
    if (['maximum', 'nuclear'].includes(securityLevel)) {
        initPointerAnalysis();
        initNetworkMonitoring();

        protectedFields.forEach(fieldId => protectField(fieldId));

        setTimeout(detectAutofill, 1000);
    }

    // Nuclear security
    if (securityLevel === 'nuclear') {
        detectWebRTCLeaks();
        initThreatMonitoring();
    }

    // Log initialization
    logSecurityEvent('security_initialized', {
        fingerprint: generateFingerprint().slice(0, 20),
        securityLevel: securityLevel,
        features: getEnabledFeatures(securityLevel)
    });

    // Debug log removed for production
}

function getEnabledFeatures(level) {
    const features = {
        basic: ['fingerprinting', 'behavioral', 'screenshot', 'clipboard', 'dashboard'],
        standard: ['devtools', 'tab-tracking', 'integrity'],
        maximum: ['pointer-analysis', 'network-monitoring', 'autofill-detection'],
        nuclear: ['webrtc', 'threat-monitoring']
    };

    let enabled = [...features.basic];
    if (['standard', 'maximum', 'nuclear'].includes(level)) {
        enabled.push(...features.standard);
    }
    if (['maximum', 'nuclear'].includes(level)) {
        enabled.push(...features.maximum);
    }
    if (level === 'nuclear') {
        enabled.push(...features.nuclear);
    }

    return enabled;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make functions globally available
window.TafsirKurdSecurity = {
    // Main init
    init: initNuclearSecurity,

    // Individual features
    logSecurityEvent,
    escapeHtml,
    checkRateLimit,
    recordAttempt,
    clearAttempts,
    generateFingerprint,
    validateSession,
    protectField,
    showSecurityDashboard,

    // Trackers
    behaviorTracker,
    pointerAnalyzer,

    // State
    getDevToolsStatus: () => devtoolsOpen,
    getTabAwayCount: () => tabAwayCount
};

// Security module loaded silently in production
