/**
 * Secure Multi-Layer Storage System
 * Saves user data to multiple storage locations with auto-recovery
 * Prevents data loss through redundancy and backup mechanisms
 */

class SecureStorage {
    constructor() {
        this.storageKeys = {
            user: 'user',
            auth: 'isAuthenticated',
            userBackup: 'user_backup',
            authBackup: 'auth_backup',
            sessionUser: 'session_user',
            lastSync: 'last_storage_sync'
        };

        // Initialize IndexedDB for permanent storage
        this.dbName = 'TafsirKurdDB';
        this.dbVersion = 1;
        this.db = null;
        this.syncInterval = null;
        this.initIndexedDB();

        // Auto-recovery check on load
        this.recoverIfNeeded();

        // Periodic backup every 30 seconds (with reference for cleanup)
        this.syncInterval = setInterval(() => this.syncAll(), 30000);
    }

    /**
     * Cleanup resources (call on page unload or when no longer needed)
     */
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    /**
     * Initialize IndexedDB for permanent storage
     */
    async initIndexedDB() {
        try {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB initialization failed');
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('userData')) {
                    db.createObjectStore('userData', { keyPath: 'id' });
                }
            };
        } catch (error) {
            console.error('IndexedDB not available:', error);
        }
    }

    /**
     * Save user data to all storage locations with redundancy
     */
    async saveUser(userData, _retryCount = 0) {
        if (!userData || !userData.email) {
            console.error('Invalid user data');
            return false;
        }

        const userString = JSON.stringify(userData);
        const timestamp = Date.now();

        try {
            // 1. Primary: localStorage
            localStorage.setItem(this.storageKeys.user, userString);
            localStorage.setItem(this.storageKeys.auth, 'true');

            // 2. Backup: localStorage backup keys
            localStorage.setItem(this.storageKeys.userBackup, userString);
            localStorage.setItem(this.storageKeys.authBackup, 'true');

            // 3. Secondary: sessionStorage (survives page refresh)
            sessionStorage.setItem(this.storageKeys.sessionUser, userString);
            sessionStorage.setItem(this.storageKeys.auth, 'true');

            // 4. Timestamp for sync tracking
            localStorage.setItem(this.storageKeys.lastSync, timestamp.toString());

            // 5. Permanent: IndexedDB (survives everything)
            await this.saveToIndexedDB({
                id: 'currentUser',
                data: userData,
                timestamp: timestamp
            });

            // Verify all saves succeeded
            const verified = this.verifyAllStorages(userData);
            if (!verified && _retryCount < 1) {
                console.error('Storage verification failed, retrying...');
                await new Promise(resolve => setTimeout(resolve, 100));
                return this.saveUser(userData, _retryCount + 1);
            }

            return true;
        } catch (error) {
            console.error('Failed to save user data:', error);
            return false;
        }
    }

    /**
     * Save to IndexedDB
     */
    async saveToIndexedDB(record) {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['userData'], 'readwrite');
                const store = transaction.objectStore('userData');
                const request = store.put(record);

                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get user data with automatic recovery from backups
     */
    async getUser() {
        try {
            // Try primary localStorage
            let userData = this.getUserFromStorage(this.storageKeys.user);
            if (userData) return userData;

            // Try backup localStorage
            userData = this.getUserFromStorage(this.storageKeys.userBackup);
            if (userData) {
                // Restore to primary
                this.saveUser(userData);
                return userData;
            }

            // Try sessionStorage
            const sessionData = sessionStorage.getItem(this.storageKeys.sessionUser);
            if (sessionData) {
                userData = JSON.parse(sessionData);
                // Restore to primary
                this.saveUser(userData);
                return userData;
            }

            // Try IndexedDB as last resort
            userData = await this.getUserFromIndexedDB();
            if (userData) {
                // Restore to primary
                this.saveUser(userData);
                return userData;
            }

            return null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    /**
     * Get user from localStorage
     */
    getUserFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
        return null;
    }

    /**
     * Get user from IndexedDB
     */
    async getUserFromIndexedDB() {
        if (!this.db) return null;

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction(['userData'], 'readonly');
                const store = transaction.objectStore('userData');
                const request = store.get('currentUser');

                request.onsuccess = () => {
                    if (request.result && request.result.data) {
                        resolve(request.result.data);
                    } else {
                        resolve(null);
                    }
                };

                request.onerror = () => resolve(null);
            } catch (error) {
                resolve(null);
            }
        });
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const auth = localStorage.getItem(this.storageKeys.auth) === 'true' ||
                     localStorage.getItem(this.storageKeys.authBackup) === 'true' ||
                     sessionStorage.getItem(this.storageKeys.auth) === 'true';
        return auth;
    }

    /**
     * Verify all storage locations have correct data
     */
    verifyAllStorages(expectedData) {
        try {
            const primaryUser = localStorage.getItem(this.storageKeys.user);
            const backupUser = localStorage.getItem(this.storageKeys.userBackup);
            const sessionUser = sessionStorage.getItem(this.storageKeys.sessionUser);
            const primaryAuth = localStorage.getItem(this.storageKeys.auth);

            const expectedString = JSON.stringify(expectedData);

            return (primaryUser === expectedString &&
                    backupUser === expectedString &&
                    sessionUser === expectedString &&
                    primaryAuth === 'true');
        } catch (error) {
            return false;
        }
    }

    /**
     * Auto-recover from any available storage
     */
    async recoverIfNeeded() {
        try {
            const primaryAuth = localStorage.getItem(this.storageKeys.auth);
            const primaryUser = localStorage.getItem(this.storageKeys.user);

            // If primary is missing but we should have data
            if (!primaryAuth || !primaryUser) {
                const recovered = await this.getUser();
                if (recovered) {
                    // Data recovered successfully
                }
            }
        } catch (error) {
            console.error('Recovery check failed:', error);
        }
    }

    /**
     * Sync all storage locations
     */
    async syncAll() {
        try {
            const userData = await this.getUser();
            if (userData) {
                await this.saveUser(userData);
            }
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }

    /**
     * Clear all user data (for logout)
     */
    async clearAll() {
        try {
            // Clear localStorage
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });

            // Clear sessionStorage
            sessionStorage.clear();

            // Clear IndexedDB — await deletion so it completes before returning
            if (this.db) {
                await new Promise((resolve) => {
                    try {
                        const transaction = this.db.transaction(['userData'], 'readwrite');
                        const store = transaction.objectStore('userData');
                        const request = store.delete('currentUser');
                        request.onsuccess = () => resolve();
                        request.onerror = () => resolve(); // resolve even on error to avoid hanging
                    } catch (e) {
                        resolve();
                    }
                });
            }

            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }
}

// Create global instance
window.secureStorage = new SecureStorage();
