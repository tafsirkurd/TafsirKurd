// Admin Session Timer UI Display
// Updates the visible countdown timer in the admin topbar
// Shows remaining time before auto-logout

(function() {
    let timerUpdateInterval = null;

    function updateSessionTimerDisplay() {
        const timerElement = document.getElementById('sessionTimer');
        const timerText = document.getElementById('sessionTimerText');

        if (!timerElement || !timerText) {
            console.warn('❌ Session timer elements not found in DOM');
            return;
        }

        // Calculate remaining time from session start
        const sessionStart = sessionStorage.getItem('adminSessionStart');

        if (!sessionStart) {
            console.warn('⚠️ No session start time found');
            timerText.textContent = '20:00';
            return;
        }

        // Calculate elapsed and remaining time
        const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes
        const startTime = new Date(sessionStart).getTime();
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, SESSION_TIMEOUT - elapsed);

        const remainingMinutes = Math.floor(remaining / 60000);
        const remainingSeconds = Math.floor((remaining % 60000) / 1000);
        const formattedTime = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;

        // Update timer text
        timerText.textContent = formattedTime;

        const remainingMs = remaining;

        // Update tooltip with full info
        const timeoutDate = new Date(startTime + SESSION_TIMEOUT);
        timerElement.title = `Session expires at ${timeoutDate.toLocaleTimeString()}\n(${remainingMinutes} min ${remainingSeconds} sec remaining)`;

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
        // Check if session start time exists
        const sessionStart = sessionStorage.getItem('adminSessionStart');
        if (!sessionStart) {
            console.warn('⚠️ Cannot start timer - no session start time');
            return;
        }

        console.log('🕐 Starting session timer display...');
        console.log('📅 Session started at:', new Date(sessionStart).toLocaleTimeString());

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
    function initTimer() {
        const token = sessionStorage.getItem('adminToken');
        const sessionStart = sessionStorage.getItem('adminSessionStart');

        console.log('🕐 Timer init check - Token:', !!token, 'SessionStart:', !!sessionStart);

        if (token && sessionStart) {
            // Both token and session start exist - start timer
            startTimerDisplay();
        } else if (token && !sessionStart) {
            // Have token but no session start - wait for it
            console.log('⏳ Waiting for session start time...');
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                const sessionStart = sessionStorage.getItem('adminSessionStart');
                if (sessionStart) {
                    console.log('✅ Session start time found, starting timer');
                    clearInterval(checkInterval);
                    startTimerDisplay();
                } else if (attempts >= 20) {
                    console.warn('⚠️ Session start time not found after 10 seconds');
                    clearInterval(checkInterval);
                }
            }, 500);
        }
    }

    // Start init after a short delay to let other scripts load
    setTimeout(initTimer, 100);

    // Also start on window load as backup
    window.addEventListener('load', function() {
        const token = sessionStorage.getItem('adminToken');
        if (token && !timerUpdateInterval) {
            console.log('🕐 Attempting timer start on window load');
            initTimer();
        }
    });

    // Also listen for heartbeat start event
    window.addEventListener('admin:heartbeat-started', function() {
        if (!timerUpdateInterval) {
            console.log('💓 Heartbeat started event received, starting timer display');
            startTimerDisplay();
        }
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
