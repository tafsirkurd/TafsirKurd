// Admin Notification System
// Secure implementation using safe DOM methods

window.adminNotifications = {
    storageKey: 'admin_notifications',
    maxNotifications: 100,  // Store up to 100 notifications

    // Initialize notification system
    init() {
        this.createNotificationPanel();
        this.updateBadge();
        this.attachEventListeners();
    },

    // Get all notifications from localStorage
    getNotifications() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load notifications:', error);
            return [];
        }
    },

    // Save notifications to localStorage
    saveNotifications(notifications) {
        try {
            // Keep only the most recent notifications
            const trimmed = notifications.slice(0, this.maxNotifications);
            localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
        } catch (error) {
            console.error('Failed to save notifications:', error);
        }
    },

    // Add a new notification
    add(title, description, type = 'info', link = null) {
        const notifications = this.getNotifications();

        const notification = {
            id: Date.now() + Math.random(),
            title,
            description,
            type, // 'info', 'success', 'warning', 'error'
            link,
            timestamp: Date.now(),
            read: false
        };

        notifications.unshift(notification);
        this.saveNotifications(notifications);
        console.log(`✅ Notification added: "${title}" (Total: ${notifications.length})`);
        this.updateBadge();
        this.refreshPanel();
    },

    // Mark notification as read
    markAsRead(notificationId) {
        const notifications = this.getNotifications();
        const notification = notifications.find(n => n.id === notificationId);

        if (notification) {
            notification.read = true;
            this.saveNotifications(notifications);
            this.updateBadge();
            this.refreshPanel();
        }
    },

    // Mark all as read
    markAllAsRead() {
        const notifications = this.getNotifications();
        notifications.forEach(n => n.read = true);
        this.saveNotifications(notifications);
        this.updateBadge();
        this.refreshPanel();
    },

    // Clear all notifications
    clearAll() {
        localStorage.removeItem(this.storageKey);
        this.updateBadge();
        this.refreshPanel();
    },

    // Get unread count
    getUnreadCount() {
        const notifications = this.getNotifications();
        return notifications.filter(n => !n.read).length;
    },

    // Update badge count
    updateBadge() {
        const badge = document.getElementById('notification-badge');
        const count = this.getUnreadCount();

        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    // Create notification panel HTML structure
    createNotificationPanel() {
        // Check if panel already exists
        if (document.getElementById('notification-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'notification-panel';
        panel.className = 'notification-panel';
        panel.style.cssText = `
            position: absolute;
            top: 60px;
            right: 20px;
            width: 380px;
            max-height: 500px;
            background: var(--bg-surface);
            border: 1px solid var(--border-light);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            display: none;
            flex-direction: column;
            z-index: 1000;
            overflow: hidden;
        `;

        document.body.appendChild(panel);
        this.refreshPanel();
    },

    // Refresh panel content
    refreshPanel() {
        const panel = document.getElementById('notification-panel');
        if (!panel) return;

        // Clear existing content safely
        while (panel.firstChild) {
            panel.removeChild(panel.firstChild);
        }

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-light);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const notifications = this.getNotifications();
        const unreadCount = notifications.filter(n => !n.read).length;

        const headerTitle = document.createElement('div');
        headerTitle.style.cssText = `
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
        `;
        headerTitle.textContent = `Notifications (${notifications.length})`;

        if (unreadCount > 0) {
            const unreadBadge = document.createElement('span');
            unreadBadge.style.cssText = `
                margin-left: 8px;
                background: #ef4444;
                color: white;
                font-size: 11px;
                font-weight: 600;
                padding: 2px 6px;
                border-radius: 10px;
            `;
            unreadBadge.textContent = `${unreadCount} new`;
            headerTitle.appendChild(unreadBadge);
        }

        const headerActions = document.createElement('div');
        headerActions.style.cssText = 'display: flex; gap: 8px;';

        const markAllBtn = document.createElement('button');
        markAllBtn.textContent = 'Mark all read';
        markAllBtn.style.cssText = `
            font-size: 12px;
            color: var(--primary);
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px 8px;
        `;
        markAllBtn.onclick = () => this.markAllAsRead();

        const clearAllBtn = document.createElement('button');
        clearAllBtn.textContent = 'Clear all';
        clearAllBtn.style.cssText = `
            font-size: 12px;
            color: var(--text-tertiary);
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px 8px;
        `;
        clearAllBtn.onclick = () => {
            if (confirm('Clear all notifications?')) {
                this.clearAll();
            }
        };

        headerActions.appendChild(markAllBtn);
        headerActions.appendChild(clearAllBtn);
        header.appendChild(headerTitle);
        header.appendChild(headerActions);
        panel.appendChild(header);

        // Create notifications container
        const container = document.createElement('div');
        container.style.cssText = `
            max-height: 420px;
            overflow-y: auto;
            overflow-x: hidden;
        `;

        if (notifications.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = `
                padding: 40px 20px;
                text-align: center;
                color: var(--text-tertiary);
            `;

            const emptyIcon = document.createElement('div');
            emptyIcon.style.cssText = `
                font-size: 48px;
                margin-bottom: 12px;
                opacity: 0.3;
            `;
            emptyIcon.textContent = '🔔';

            const emptyText = document.createElement('div');
            emptyText.style.fontSize = '14px';
            emptyText.textContent = 'No notifications yet';

            empty.appendChild(emptyIcon);
            empty.appendChild(emptyText);
            container.appendChild(empty);
        } else {
            notifications.forEach(notification => {
                const item = this.createNotificationItem(notification);
                container.appendChild(item);
            });

            // Add footer showing notification count
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 12px 20px;
                border-top: 1px solid var(--border-light);
                text-align: center;
                font-size: 12px;
                color: var(--text-tertiary);
                background: var(--bg-app);
            `;
            const readCount = notifications.filter(n => n.read).length;
            footer.textContent = `Showing all ${notifications.length} notification${notifications.length !== 1 ? 's' : ''} (${readCount} read, ${notifications.length - readCount} unread)`;
            container.appendChild(footer);
        }

        panel.appendChild(container);
    },

    // Create a single notification item
    createNotificationItem(notification) {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-light);
            cursor: pointer;
            transition: background 0.2s;
            ${notification.read ? '' : 'background: rgba(59, 130, 246, 0.05);'}
        `;

        item.onmouseenter = () => {
            item.style.background = 'var(--bg-hover)';
        };
        item.onmouseleave = () => {
            item.style.background = notification.read ? '' : 'rgba(59, 130, 246, 0.05)';
        };

        item.onclick = () => {
            this.markAsRead(notification.id);
            if (notification.link) {
                window.location.href = notification.link;
            }
        };

        // Icon based on type
        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 32px;
            height: 32px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
            font-size: 16px;
        `;

        const typeConfig = {
            info: { emoji: 'ℹ️', bg: 'rgba(59, 130, 246, 0.1)' },
            success: { emoji: '✅', bg: 'rgba(16, 185, 129, 0.1)' },
            warning: { emoji: '⚠️', bg: 'rgba(245, 158, 11, 0.1)' },
            error: { emoji: '❌', bg: 'rgba(239, 68, 68, 0.1)' }
        };

        const config = typeConfig[notification.type] || typeConfig.info;
        icon.style.background = config.bg;
        icon.textContent = config.emoji;

        // Title
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 4px;
        `;
        title.textContent = notification.title;

        // Description
        const desc = document.createElement('div');
        desc.style.cssText = `
            font-size: 13px;
            color: var(--text-tertiary);
            margin-bottom: 8px;
            line-height: 1.4;
        `;
        desc.textContent = notification.description;

        // Time
        const time = document.createElement('div');
        time.style.cssText = `
            font-size: 12px;
            color: var(--text-tertiary);
        `;
        time.textContent = this.formatTimeAgo(notification.timestamp);

        item.appendChild(icon);
        item.appendChild(title);
        item.appendChild(desc);
        item.appendChild(time);

        return item;
    },

    // Format timestamp to "time ago"
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

        return new Date(timestamp).toLocaleDateString();
    },

    // Attach event listeners
    attachEventListeners() {
        // Find the bell button by looking for the notification badge or bell icon
        const findBellButton = () => {
            const badge = document.getElementById('notification-badge');
            if (badge && badge.closest('.topbar-btn')) {
                return badge.closest('.topbar-btn');
            }
            // Fallback: find button with bell icon
            const buttons = document.querySelectorAll('.topbar-btn');
            for (const btn of buttons) {
                const bellIcon = btn.querySelector('[data-lucide="bell"]');
                if (bellIcon) return btn;
            }
            return null;
        };

        const bellBtn = findBellButton();

        if (bellBtn) {
            console.log('✅ Bell button found, attaching click handler');
            bellBtn.onclick = (e) => {
                e.stopPropagation();
                console.log('🔔 Bell button clicked!');
                const panel = document.getElementById('notification-panel');
                console.log('📋 Panel element:', panel);
                if (panel) {
                    const isVisible = panel.style.display === 'flex';
                    panel.style.display = isVisible ? 'none' : 'flex';
                    console.log('📋 Panel display:', panel.style.display);

                    // If opening panel, refresh it
                    if (panel.style.display === 'flex') {
                        this.refreshPanel();
                    }
                } else {
                    console.error('❌ Notification panel not found!');
                }
            };
        } else {
            console.error('❌ Bell button not found!');
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notification-panel');
            const bellBtn = findBellButton();

            if (panel && bellBtn &&
                !panel.contains(e.target) &&
                !bellBtn.contains(e.target)) {
                panel.style.display = 'none';
            }
        });
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔔 Initializing notification system...');
        window.adminNotifications.init();
        console.log('✅ Notification system initialized');
    });
} else {
    console.log('🔔 Initializing notification system...');
    window.adminNotifications.init();
    console.log('✅ Notification system initialized');
}
