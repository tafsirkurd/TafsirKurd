// Admin Heartbeat System
// Keeps admin status as "online" and detects session expiration

window.adminHeartbeat = (function() {
    let heartbeatInterval = null;
    let lastHeartbeatTime = null;
    const HEARTBEAT_INTERVAL = 60000; // 60 seconds
    const MAX_FAILED_ATTEMPTS = 3;
    let failedAttempts = 0;

    async function sendHeartbeat() {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            console.log('No admin token, stopping heartbeat');
            stop();
            return;
        }

        const deviceFingerprint = window.deviceFingerprint ? window.deviceFingerprint.get() : null;

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
            window.location.href = '/admin-login.html';
        }, 2000);
    }

    function start() {
        if (heartbeatInterval) {
            console.log('Heartbeat already running');
            return;
        }

        console.log('Starting heartbeat monitor...');

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
    }

    function stop() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
            console.log('Heartbeat stopped');
        }
    }

    function getStatus() {
        return {
            running: !!heartbeatInterval,
            lastHeartbeat: lastHeartbeatTime,
            failedAttempts: failedAttempts,
            nextHeartbeat: lastHeartbeatTime ? new Date(lastHeartbeatTime.getTime() + HEARTBEAT_INTERVAL) : null
        };
    }

    // Public API
    return {
        start,
        stop,
        getStatus,
        sendNow: sendHeartbeat
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
