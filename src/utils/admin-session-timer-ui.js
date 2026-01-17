// Admin Session Timer UI Display
// Updates the visible countdown timer in the admin topbar
// Shows remaining time before auto-logout

(function() {
    let timerUpdateInterval = null;

    function updateSessionTimerDisplay() {
        const timerElement = document.getElementById('sessionTimer');
        const timerText = document.getElementById('sessionTimerText');

        if (!timerElement || !timerText) {
            console.warn('Session timer elements not found');
            return;
        }

        // Get session status from heartbeat
        if (!window.adminHeartbeat) {
            timerText.textContent = '20:00';
            return;
        }

        const status = window.adminHeartbeat.getStatus();

        if (!status) {
            timerText.textContent = '20:00';
            return;
        }

        // If heartbeat not running, check if we have session start time
        if (!status.running) {
            const sessionStart = sessionStorage.getItem('adminSessionStart');
            if (sessionStart) {
                // Calculate remaining time manually
                const elapsed = Date.now() - new Date(sessionStart).getTime();
                const sessionTimeout = window.adminHeartbeat.getSessionTimeout();
                const remaining = Math.max(0, sessionTimeout - elapsed);
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                timerText.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            } else {
                timerText.textContent = '20:00';
            }
            return;
        }

        const remainingMs = status.remainingTime;
        const remainingMinutes = status.remainingMinutes;
        const remainingSeconds = status.remainingSeconds;

        // Update timer text
        timerText.textContent = status.remainingTimeFormatted;

        // Update tooltip with full info
        const timeoutDate = status.sessionTimeoutAt;
        if (timeoutDate) {
            timerElement.title = `Session expires at ${timeoutDate.toLocaleTimeString()}\n(${remainingMinutes} min ${remainingSeconds} sec remaining)`;
        }

        // Remove all state classes first
        timerElement.classList.remove('warning', 'critical');

        // Add warning/critical states based on time remaining
        if (remainingMs <= 2 * 60 * 1000) {
            // Less than 2 minutes - CRITICAL (red, fast pulse)
            timerElement.classList.add('critical');
        } else if (remainingMs <= 5 * 60 * 1000) {
            // Less than 5 minutes - WARNING (yellow, slow pulse)
            timerElement.classList.add('warning');
        }

        // Show warning notification at 5 minutes
        if (remainingMinutes === 4 && remainingSeconds === 59 && !sessionStorage.getItem('warning5minShown')) {
            sessionStorage.setItem('warning5minShown', 'true');
            if (window.showNotification) {
                window.showNotification('⚠️ Session expires in 5 minutes. Save your work!', 'warning');
            }
        }

        // Show critical notification at 2 minutes
        if (remainingMinutes === 1 && remainingSeconds === 59 && !sessionStorage.getItem('warning2minShown')) {
            sessionStorage.setItem('warning2minShown', 'true');
            if (window.showNotification) {
                window.showNotification('🚨 Session expires in 2 minutes! You will be logged out soon.', 'error');
            }
        }
    }

    function startTimerDisplay() {
        console.log('🕐 Starting session timer display...');

        // Update immediately
        updateSessionTimerDisplay();

        // Update every second
        if (!timerUpdateInterval) {
            timerUpdateInterval = setInterval(updateSessionTimerDisplay, 1000);
            console.log('✅ Session timer display started - updating every second');
        } else {
            console.log('⚠️ Timer interval already running');
        }
    }

    function stopTimerDisplay() {
        if (timerUpdateInterval) {
            clearInterval(timerUpdateInterval);
            timerUpdateInterval = null;
            console.log('Session timer display stopped');
        }

        // Reset display
        const timerText = document.getElementById('sessionTimerText');
        if (timerText) {
            timerText.textContent = '--:--';
        }

        const timerElement = document.getElementById('sessionTimer');
        if (timerElement) {
            timerElement.classList.remove('warning', 'critical');
        }
    }

    // Auto-start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTimer);
    } else {
        initTimer();
    }

    function initTimer() {
        const token = sessionStorage.getItem('adminToken');
        console.log('🕐 Timer init - Token exists:', !!token);

        if (token) {
            // Start timer display immediately
            startTimerDisplay();

            // Also start when heartbeat confirms it's running
            setTimeout(() => {
                if (window.adminHeartbeat && window.adminHeartbeat.getStatus().running) {
                    console.log('✅ Heartbeat confirmed running');
                }
            }, 1000);
        }
    }

    // Also start on window load as backup
    window.addEventListener('load', function() {
        const token = sessionStorage.getItem('adminToken');
        if (token && !timerUpdateInterval) {
            console.log('🕐 Starting timer on window load (backup)');
            startTimerDisplay();
        }
    });

    // Also listen for heartbeat start event
    window.addEventListener('admin:heartbeat-started', function() {
        console.log('Heartbeat started event received, starting timer display');
        startTimerDisplay();
    });

    // Listen for session events
    window.addEventListener('admin:session-expired', stopTimerDisplay);
    window.addEventListener('admin:logout', stopTimerDisplay);

    // Public API
    window.adminSessionTimerUI = {
        start: startTimerDisplay,
        stop: stopTimerDisplay,
        update: updateSessionTimerDisplay,
        forceStart: function() {
            console.log('🔧 Force starting timer display...');
            stopTimerDisplay();
            startTimerDisplay();
        },
        getStatus: function() {
            return {
                running: !!timerUpdateInterval,
                element: document.getElementById('sessionTimer'),
                textElement: document.getElementById('sessionTimerText')
            };
        }
    };

    console.log('✅ Admin session timer UI script loaded');
})();
