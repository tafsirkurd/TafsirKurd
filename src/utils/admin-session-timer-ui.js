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
            timerText.textContent = '--:--';
            return;
        }

        const status = window.adminHeartbeat.getStatus();

        if (!status || !status.running) {
            timerText.textContent = '--:--';
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
        // Update immediately
        updateSessionTimerDisplay();

        // Update every second
        if (!timerUpdateInterval) {
            timerUpdateInterval = setInterval(updateSessionTimerDisplay, 1000);
            console.log('✅ Session timer display started');
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

    // Auto-start when admin is authenticated
    window.addEventListener('load', function() {
        const token = sessionStorage.getItem('adminToken');
        if (token) {
            // Wait for heartbeat to be initialized
            setTimeout(() => {
                if (window.adminHeartbeat && window.adminHeartbeat.getStatus().running) {
                    startTimerDisplay();
                }
            }, 500);
        }
    });

    // Listen for session events
    window.addEventListener('admin:session-expired', stopTimerDisplay);
    window.addEventListener('admin:logout', stopTimerDisplay);

    // Public API
    window.adminSessionTimerUI = {
        start: startTimerDisplay,
        stop: stopTimerDisplay,
        update: updateSessionTimerDisplay
    };
})();
