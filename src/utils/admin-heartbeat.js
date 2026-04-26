// Admin Heartbeat System with 2-Hour Auto-Logout
// Keeps admin status as "online" and detects session expiration
// Automatically logs out admin after 2 hours for security

window.adminHeartbeat = (function() {
    let heartbeatInterval = null;
    let sessionTimeoutTimer = null;
    let lastHeartbeatTime = null;
    let sessionStartTime = null;
    const HEARTBEAT_INTERVAL = 60000; // 60 seconds
    const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    const MAX_FAILED_ATTEMPTS = 3;
    let failedAttempts = 0;

    async function sendHeartbeat() {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            console.log('No admin token, stopping heartbeat');
            stop();
            return;
        }

        const deviceFingerprint = window.deviceFingerprint ? await window.deviceFingerprint.get() : null;

        try {
            const response = await fetch('/admin-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'heartbeat',
                    token,
                    deviceFingerprint
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                lastHeartbeatTime = new Date();
                failedAttempts = 0;
                console.log('✓ Heartbeat sent successfully');

                // Trigger custom event for UI updates
                window.dispatchEvent(new CustomEvent('admin:heartbeat', {
                    detail: { timestamp: lastHeartbeatTime }
                }));
            } else {
                failedAttempts++;
                console.warn(`Heartbeat failed (${failedAttempts}/${MAX_FAILED_ATTEMPTS}):`, data);

                if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                    console.error('Max heartbeat failures reached, session may be expired');
                    handleSessionExpired();
                }
            }
        } catch (error) {
            failedAttempts++;
            console.error(`Heartbeat error (${failedAttempts}/${MAX_FAILED_ATTEMPTS}):`, error);

            if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                handleSessionExpired();
            }
        }
    }

    function handleSessionExpired() {
        stop();

        // Trigger session expired event
        window.dispatchEvent(new CustomEvent('admin:session-expired', {
            detail: { reason: 'heartbeat_failed' }
        }));

        // Show notification if possible
        if (window.showNotification) {
            window.showNotification('Session expired. Please log in again.', 'error');
        }

        // Redirect to login after a short delay
        setTimeout(() => {
            sessionStorage.clear();
            window.location.href = '/admin-login.html';
        }, 2000);
    }

    function handleSessionTimeout() {
        console.log('⏰ 2-hour session timeout reached');
        stop();

        // Clear session storage
        sessionStorage.clear();

        // Show timeout message
        if (window.showNotification) {
            window.showNotification('Session timeout for security. Please log in again.', 'warning');
        } else {
            alert('⏰ Session Timeout\n\nFor your security, you have been automatically logged out after 20 minutes.\n\nPlease log in again to continue.');
        }

        // Redirect to login
        window.location.href = '/admin-login.html';
    }

    function isNoTimeoutAccount() {
        if (sessionStorage.getItem('adminNoTimeout') === '1') return true;
        var email = (sessionStorage.getItem('adminEmail') || '').trim().toLowerCase();
        return email === 'tefsirkurd@gmail.com';
    }

    function startSessionTimeout() {
        // Clear any existing timeout
        if (sessionTimeoutTimer) {
            clearTimeout(sessionTimeoutTimer);
        }

        // Owner account: record start time but never schedule auto-logout
        if (isNoTimeoutAccount()) {
            if (!sessionStorage.getItem('adminSessionStart')) {
                sessionStorage.setItem('adminSessionStart', new Date().toISOString());
            }
            console.log('♾️ No-timeout account — session never expires');
            return;
        }

        // Check if there's an existing session start time (page reload)
        const storedStartTime = sessionStorage.getItem('adminSessionStart');
        if (storedStartTime) {
            sessionStartTime = new Date(storedStartTime);
            const elapsed = Date.now() - sessionStartTime.getTime();

            // If session already expired, logout immediately
            if (elapsed >= SESSION_TIMEOUT) {
                console.log('Session already expired on page load');
                handleSessionTimeout();
                return;
            }

            // Set timeout for remaining time
            const remainingTime = SESSION_TIMEOUT - elapsed;
            sessionTimeoutTimer = setTimeout(handleSessionTimeout, remainingTime);
            console.log(`🔒 Session timeout restored: ${Math.floor(remainingTime / 60000)} minutes remaining`);
        } else {
            // New session - record start time
            sessionStartTime = new Date();
            sessionStorage.setItem('adminSessionStart', sessionStartTime.toISOString());

            // Set 20-minute timeout
            sessionTimeoutTimer = setTimeout(handleSessionTimeout, SESSION_TIMEOUT);

            console.log(`🔒 Session timeout started: will logout in ${SESSION_TIMEOUT / 60000} minutes at ${new Date(Date.now() + SESSION_TIMEOUT).toLocaleTimeString()}`);
        }
    }

    function stopSessionTimeout() {
        if (sessionTimeoutTimer) {
            clearTimeout(sessionTimeoutTimer);
            sessionTimeoutTimer = null;
            console.log('Session timeout stopped');
        }
    }

    function getRemainingTime() {
        if (!sessionStartTime) return 0;
        const elapsed = Date.now() - new Date(sessionStartTime).getTime();
        const remaining = SESSION_TIMEOUT - elapsed;
        return Math.max(0, remaining);
    }

    function start() {
        if (heartbeatInterval) {
            console.log('Heartbeat already running');
            return;
        }

        console.log('Starting heartbeat monitor with 20-minute auto-logout...');

        // Start 20-minute session timeout
        startSessionTimeout();

        // Send initial heartbeat immediately
        sendHeartbeat();

        // Then send heartbeat every HEARTBEAT_INTERVAL
        heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

        // Also send heartbeat when tab becomes visible (user returns)
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden && heartbeatInterval) {
                console.log('Tab visible, sending heartbeat');
                sendHeartbeat();
            }
        });

        // Notify UI that heartbeat has started
        window.dispatchEvent(new CustomEvent('admin:heartbeat-started', {
            detail: { timestamp: new Date() }
        }));
    }

    function stop() {
        // Stop heartbeat
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
            console.log('Heartbeat stopped');
        }

        // Stop session timeout
        stopSessionTimeout();
    }

    function getStatus() {
        const remainingMs = getRemainingTime();
        const remainingMinutes = Math.floor(remainingMs / 60000);
        const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

        return {
            running: !!heartbeatInterval,
            lastHeartbeat: lastHeartbeatTime,
            failedAttempts: failedAttempts,
            nextHeartbeat: lastHeartbeatTime ? new Date(lastHeartbeatTime.getTime() + HEARTBEAT_INTERVAL) : null,
            sessionStartTime: sessionStartTime,
            sessionTimeoutAt: sessionStartTime ? new Date(new Date(sessionStartTime).getTime() + SESSION_TIMEOUT) : null,
            remainingTime: remainingMs,
            remainingMinutes: remainingMinutes,
            remainingSeconds: remainingSeconds,
            remainingTimeFormatted: `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
        };
    }

    // Public API
    return {
        start,
        stop,
        getStatus,
        sendNow: sendHeartbeat,
        getRemainingTime,
        getSessionTimeout: () => SESSION_TIMEOUT
    };
})();

// Auto-start heartbeat when admin is logged in
window.addEventListener('load', function() {
    const token = sessionStorage.getItem('adminToken');
    if (token && window.location.pathname.includes('/admin-')) {
        console.log('Admin token detected, starting heartbeat');
        window.adminHeartbeat.start();
    }
});
