/**
 * Quran Page Restoration with 20-minute window
 * Restores user's last reading position if they return within 20 minutes
 * Otherwise shows Quran home page
 */

class QuranPageRestoration {
    constructor() {
        this.RESTORATION_WINDOW = 20 * 60 * 1000; // 20 minutes in milliseconds
        this.STORAGE_KEY = 'quran_last_position';
    }

    /**
     * Save current reading position with timestamp
     * @param {number} surah - Current surah number
     * @param {number} ayah - Current ayah number
     */
    savePosition(surah, ayah) {
        const position = {
            surah: surah,
            ayah: ayah,
            timestamp: Date.now(),
            url: `/quran?surah=${surah}&ayah=${ayah}`
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(position));
            console.log('📖 Saved Quran position:', `Surah ${surah}, Ayah ${ayah}`);
        } catch (error) {
            console.error('Failed to save Quran position:', error);
        }
    }

    /**
     * Get last reading position if within restoration window
     * @returns {object|null} Position object or null if expired/not exists
     */
    getLastPosition() {
        try {
            const savedData = localStorage.getItem(this.STORAGE_KEY);

            if (!savedData) {
                console.log('📖 No saved position found');
                return null;
            }

            const position = JSON.parse(savedData);
            const now = Date.now();
            const timeDiff = now - position.timestamp;

            console.log(`📖 Last position: Surah ${position.surah}, Ayah ${position.ayah}`);
            console.log(`⏱️ Time since last visit: ${Math.round(timeDiff / 60000)} minutes`);

            // Check if within 20-minute window
            if (timeDiff < this.RESTORATION_WINDOW) {
                console.log('✅ Within 20-minute window - will restore position');
                return position;
            } else {
                console.log('❌ Over 20 minutes - showing home page');
                return null;
            }
        } catch (error) {
            console.error('Error reading saved position:', error);
            return null;
        }
    }

    /**
     * Check if should restore position and navigate if yes
     * Call this on Quran page load
     * @returns {boolean} True if position was restored
     */
    shouldRestorePosition() {
        // Only restore on Quran home page (no URL params)
        const urlParams = new URLSearchParams(window.location.search);
        const hasSurahParam = urlParams.has('surah');

        // If user already navigated to specific page, don't override
        if (hasSurahParam) {
            console.log('📖 User navigated to specific page - skipping restoration');
            return false;
        }

        const lastPosition = this.getLastPosition();

        if (lastPosition && lastPosition.surah && lastPosition.ayah) {
            console.log('✅ Restoring last position...');

            // Add smooth restoration flag to prevent jarring jumps
            sessionStorage.setItem('quran_position_restored', 'true');

            // Navigate to last position
            window.location.href = lastPosition.url;
            return true;
        }

        return false;
    }

    /**
     * Clear saved position (e.g., when user explicitly starts new reading)
     */
    clearPosition() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🗑️ Cleared saved Quran position');
    }

    /**
     * Get time remaining in restoration window
     * @returns {number|null} Minutes remaining or null if no position
     */
    getTimeRemaining() {
        try {
            const savedData = localStorage.getItem(this.STORAGE_KEY);
            if (!savedData) return null;

            const position = JSON.parse(savedData);
            const now = Date.now();
            const elapsed = now - position.timestamp;
            const remaining = this.RESTORATION_WINDOW - elapsed;

            if (remaining <= 0) return 0;

            return Math.ceil(remaining / 60000); // Convert to minutes
        } catch (error) {
            return null;
        }
    }
}

// Create global instance
window.quranRestoration = new QuranPageRestoration();

console.log('📖 Quran Page Restoration loaded (20-minute window)');
