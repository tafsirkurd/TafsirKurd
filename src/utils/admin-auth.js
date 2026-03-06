// Enhanced Admin Authentication Utilities with Device Locking
// Includes device fingerprinting and permission checks
// Version 2.0 - RBAC sidebar permissions
// Admin-auth.js v2.0 loaded

let supabaseClient = null;
let adminPermissions = [];

// Role-based page access configuration
// Defines which pages each role can access by default
const ROLE_PERMISSIONS = {
    super_admin: {
        // Super admin can access everything
        pages: '*',
        canEdit: true,
        canDelete: true
    },
    editor: {
        // Editor can manage content
        pages: [
            'dashboard',
            'messages',
            'videos',
            'video-library',
            'islamvoice-management',
            'backgrounds',
            'translations',
            'schedule'
        ],
        canEdit: true,
        canDelete: false
    },
    analyst: {
        // Analyst can only view analytics (read-only)
        pages: [
            'dashboard',
            'analytics',
            'reading-stats',
            'geographic-analytics',
            'social-stats',
            'users'
        ],
        canEdit: false,
        canDelete: false
    }
};

async function initSupabase() {
    if (supabaseClient) return true;

    try {
        const configResponse = await fetch('/config');
        if (!configResponse.ok) {
            throw new Error('Failed to fetch Supabase configuration');
        }

        const { supabaseUrl, supabaseKey } = await configResponse.json();

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Invalid Supabase configuration received');
        }

        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
                storageKey: 'tafsirkurd-admin-auth'
            },
            global: {
                headers: {
                    'x-client-info': 'tafsirkurd-admin'
                }
            }
        });

        // console.log('✅ Supabase initialized');
        window.supabaseClient = supabaseClient;
        return true;
    } catch (error) {
        console.error('❌ Supabase init failed:', error);
        return false;
    }
}

// Check if user is authenticated
async function checkAuth() {
    const adminToken = sessionStorage.getItem('adminToken');

    if (!adminToken) {
        redirectToLogin();
        return false;
    }

    // Get device fingerprint (async - server-side generated)
    const deviceFingerprint = window.deviceFingerprint ? await window.deviceFingerprint.get() : null;

    try {
        const response = await fetch('/admin-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'verify',
                token: adminToken,
                deviceFingerprint
            })
        });

        const data = await response.json();

        if (data.success) {
            // Store permissions
            adminPermissions = data.permissions || [];

            // Store user info
            sessionStorage.setItem('adminEmail', data.email);
            sessionStorage.setItem('adminRole', data.role);
            sessionStorage.setItem('adminFullName', data.fullName);
            sessionStorage.setItem('adminPermissions', JSON.stringify(adminPermissions));

            // Set data-role on body for CSS-based permissions
            document.body.setAttribute('data-role', data.role);

            // Update UI with admin info
            const emailElements = document.querySelectorAll('.admin-email, .sidebar-profile-email');
            emailElements.forEach(el => {
                if (el) el.textContent = data.email || '';
            });

            const nameElements = document.querySelectorAll('.admin-name, .sidebar-profile-name');
            nameElements.forEach(el => {
                if (el) el.textContent = data.fullName || 'Admin';
            });

            // Show profile info after data is loaded (prevent flash of placeholder content)
            const profileInfoElements = document.querySelectorAll('.sidebar-profile-info');
            profileInfoElements.forEach(el => {
                if (el) el.classList.add('loaded');
            });

            // Initialize Supabase and heartbeat
            await initSupabase();

            // Start heartbeat monitor
            if (window.adminHeartbeat) {
                window.adminHeartbeat.start();
            }

            // Check page permission FIRST before showing anything
            const currentPage = getCurrentPageSlug();
            if (currentPage && !hasPagePermission(currentPage, 'view')) {
                showAccessDenied();
                return false;
            }

            // Hide sidebar items based on role
            // console.log('Auth success - applying sidebar permissions for role:', data.role);
            applySidebarPermissions(data.role);

            return data;
        } else {
            if (data.error && data.error.includes('Device not authorized')) {
                showDeviceBlockedMessage();
            }

            sessionStorage.clear();
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.error('Session verification error:', error);
        redirectToLogin();
        return false;
    }
}

// Login function with device fingerprinting
async function login(email, password) {
    const deviceFingerprint = window.deviceFingerprint ? await window.deviceFingerprint.get() : null;

    try {
        const response = await fetch('/admin-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                deviceFingerprint
            })
        });

        const data = await response.json();

        if (data.success) {
            sessionStorage.setItem('adminToken', data.token);
            sessionStorage.setItem('adminEmail', data.user.email);
            sessionStorage.setItem('adminRole', data.user.role);
            sessionStorage.setItem('adminFullName', data.user.fullName);
            adminPermissions = data.permissions || [];
            sessionStorage.setItem('adminPermissions', JSON.stringify(adminPermissions));
            // Set session start time for 60-minute auto-logout
            sessionStorage.setItem('adminSessionStart', new Date().toISOString());

            // console.log('✅ Login successful');

            // Start heartbeat with 60-minute timeout
            if (window.adminHeartbeat) {
                window.adminHeartbeat.start();
            }

            return { success: true, data };
        } else {
            return { success: false, error: data.error, ...data };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Connection error. Please try again.' };
    }
}

// Logout function
async function logout() {
    const adminToken = sessionStorage.getItem('adminToken');

    // Stop heartbeat
    if (window.adminHeartbeat) {
        window.adminHeartbeat.stop();
    }

    try {
        await fetch('/admin-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout', token: adminToken })
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    sessionStorage.clear();
    window.location.href = '/admin-login.html';
}

// Permission check functions
function hasPagePermission(pageSlug, permissionType = 'view') {
    const role = sessionStorage.getItem('adminRole');

    if (!role) return false;

    // Super admin has all permissions
    if (role === 'super_admin') return true;

    // Check DB permissions first (custom role or any role with DB overrides)
    var dbPerms = adminPermissions;
    if ((!dbPerms || dbPerms.length === 0) && sessionStorage.getItem('adminPermissions')) {
        try { dbPerms = JSON.parse(sessionStorage.getItem('adminPermissions')); } catch(e) { dbPerms = []; }
    }

    if (dbPerms && dbPerms.length > 0) {
        var perm = dbPerms.find(function(p) { return p.page_slug === pageSlug; });
        if (!perm) return false;
        if (permissionType === 'view') return !!perm.can_view;
        if (permissionType === 'edit') return !!perm.can_edit;
        if (permissionType === 'delete') return !!perm.can_delete;
        return false;
    }

    // Fallback to hardcoded role config
    const roleConfig = ROLE_PERMISSIONS[role];
    if (!roleConfig) return false;
    if (roleConfig.pages === '*') return true;

    const canAccessPage = roleConfig.pages.includes(pageSlug);
    if (!canAccessPage) return false;

    if (permissionType === 'view') return true;
    if (permissionType === 'edit') return roleConfig.canEdit;
    if (permissionType === 'delete') return roleConfig.canDelete;

    return false;
}

// Get all pages accessible by current role
function getRolePages() {
    const role = sessionStorage.getItem('adminRole');
    if (!role) return [];

    const roleConfig = ROLE_PERMISSIONS[role];
    if (!roleConfig) return [];

    if (roleConfig.pages === '*') return '*';
    return roleConfig.pages;
}

// Hide sidebar items based on role
function applySidebarPermissions(overrideRole) {
    const role = overrideRole || sessionStorage.getItem('adminRole');

    if (!role) return;

    if (document.body) {
        document.body.setAttribute('data-role', role);
    }

    // Super admin sees everything
    if (role === 'super_admin') {
        revealSidebar(role);
        return;
    }

    // Build allowed pages list from DB permissions or hardcoded config
    var allowedPages = [];
    var dbPerms = adminPermissions;
    if ((!dbPerms || dbPerms.length === 0) && sessionStorage.getItem('adminPermissions')) {
        try { dbPerms = JSON.parse(sessionStorage.getItem('adminPermissions')); } catch(e) { dbPerms = []; }
    }

    if (dbPerms && dbPerms.length > 0) {
        // Use DB permissions
        dbPerms.forEach(function(p) {
            if (p.can_view) allowedPages.push(p.page_slug);
        });
    } else {
        // Fallback to hardcoded role config
        var roleConfig = ROLE_PERMISSIONS[role];
        if (roleConfig && roleConfig.pages !== '*') {
            allowedPages = roleConfig.pages.slice();
        } else if (roleConfig && roleConfig.pages === '*') {
            revealSidebar(role);
            return;
        }
    }

    // Always allow dashboard for non-custom roles
    if (role !== 'custom' && allowedPages.indexOf('dashboard') === -1) {
        allowedPages.push('dashboard');
    }

    var navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    if (navItems.length === 0) return;

    navItems.forEach(function(item) {
        var href = item.getAttribute('href');
        if (!href) return;

        var match = href.match(/\/admin-([^.]+)\.html/);
        if (!match) return;

        var pageSlug = match[1];

        if (allowedPages.indexOf(pageSlug) === -1) {
            item.style.display = 'none';
            item.setAttribute('data-hidden-by-role', 'true');
        }
    });

    // Hide nav sections that have no visible items
    var navSections = document.querySelectorAll('.sidebar-nav .nav-section');
    navSections.forEach(function(section) {
        var visibleItems = section.querySelectorAll('.nav-item:not([data-hidden-by-role])');
        if (visibleItems.length === 0) {
            section.style.display = 'none';
        }
    });

    revealSidebar(role);
}

// Reveal sidebar after role-based hiding is applied
function revealSidebar(role) {
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) {
        sidebarNav.style.visibility = 'visible';
    }
    // Also update the early-hide style if it exists
    const earlyStyle = document.getElementById('early-sidebar-hide');
    if (earlyStyle) {
        // Keep messages card hidden for analyst role
        if (role === 'analyst') {
            earlyStyle.textContent = '.sidebar-nav{visibility:visible}#recent-messages-card{display:none!important}';
        } else {
            earlyStyle.textContent = '.sidebar-nav{visibility:visible}#recent-messages-card{display:block}';
        }
    }

    // Also directly hide the messages card for analyst
    if (role === 'analyst') {
        const messagesCard = document.getElementById('recent-messages-card');
        if (messagesCard) {
            messagesCard.style.display = 'none';
        }
    }

    // Scroll the active nav item into view so it's always visible after navigation
    if (sidebarNav) {
        const activeItem = sidebarNav.querySelector('.nav-item.active');
        if (activeItem) {
            setTimeout(function() {
                activeItem.scrollIntoView({ block: 'nearest' });
            }, 0);
        }
    }
}

function getCurrentPageSlug() {
    const path = window.location.pathname;
    const match = path.match(/\/admin-([^.]+)/);
    return match ? match[1] : null;
}

function showAccessDenied() {
    // Clear body safely
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }

    // Create elements safely
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; justify-content: center; align-items: center; height: 100vh; background: #f7fafc;';

    const card = document.createElement('div');
    card.style.cssText = 'text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 500px;';

    const icon = document.createElement('div');
    icon.style.cssText = 'font-size: 64px; margin-bottom: 20px;';
    icon.textContent = '🚫';

    const title = document.createElement('h1');
    title.style.cssText = 'color: #1a202c; margin-bottom: 12px;';
    title.textContent = 'Access Denied';

    const message = document.createElement('p');
    message.style.cssText = 'color: #4a5568; margin-bottom: 24px;';
    message.textContent = "You don't have permission to access this page.";

    // Find first allowed page to redirect to
    var redirectPage = '/admin-dashboard.html';
    var dbPerms = [];
    try { dbPerms = JSON.parse(sessionStorage.getItem('adminPermissions') || '[]'); } catch(e) {}
    if (dbPerms.length > 0) {
        var firstAllowed = dbPerms.find(function(p) { return p.can_view; });
        if (firstAllowed) redirectPage = '/admin-' + firstAllowed.page_slug + '.html';
    }

    const button = document.createElement('button');
    button.style.cssText = 'padding: 12px 24px; background: #000; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;';
    button.textContent = 'Go to Allowed Page';
    button.onclick = function() {
        window.location.href = redirectPage;
    };

    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(button);
    container.appendChild(card);
    document.body.appendChild(container);
}

function showDeviceBlockedMessage() {
    alert('🔒 Device Not Authorized\n\nThis account is locked to a different device. Please contact the Super Admin to reset your device lock.');
}

function redirectToLogin() {
    if (!window.location.pathname.includes('admin-login')) {
        window.location.href = '/admin-login.html';
    }
}

// Export public API
window.adminAuth = {
    checkAuth,
    login,
    logout,
    getSupabase: () => supabaseClient,
    hasPermission: hasPagePermission,
    getCurrentPage: getCurrentPageSlug,
    getRole: () => sessionStorage.getItem('adminRole'),
    getEmail: () => sessionStorage.getItem('adminEmail'),
    getFullName: () => sessionStorage.getItem('adminFullName'),
    getPermissions: () => adminPermissions,
    getRolePages,
    applySidebarPermissions,
    ROLE_PERMISSIONS
};

// Handle session expired event
window.addEventListener('admin:session-expired', function() {
    // console.log('Session expired, logging out');
    logout();
});

// Apply sidebar permissions immediately on script load if role is already stored
// This prevents the flash of all sidebar items for returning users
(function() {
    const storedRole = sessionStorage.getItem('adminRole');
    // console.log('Admin-auth init - stored role:', storedRole);

    if (storedRole) {
        // Set data-role on body immediately for CSS-based hiding
        if (document.body) {
            document.body.setAttribute('data-role', storedRole);
            // console.log('Set data-role on body:', storedRole);
        }

        if (storedRole !== 'super_admin') {
            // Apply immediately if DOM is ready, otherwise wait
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    // console.log('DOMContentLoaded - applying sidebar permissions');
                    applySidebarPermissions(storedRole);
                });
            } else {
                // console.log('DOM ready - applying sidebar permissions immediately');
                applySidebarPermissions(storedRole);
            }
        }
    }

    // Also apply on window load as fallback
    window.addEventListener('load', function() {
        const role = sessionStorage.getItem('adminRole');
        if (role && role !== 'super_admin') {
            // console.log('Window load - reapplying sidebar permissions');
            applySidebarPermissions(role);
        }
    });
})();
