// Enhanced Admin Authentication Utilities with Device Locking
// Includes device fingerprinting and permission checks

let supabaseClient = null;
let adminPermissions = [];

async function initSupabase() {
    if (supabaseClient) return true;

    // Ensure supabase-js global is available — Rocket Loader can defer the
    // <head> CDN script so window.supabase is undefined at call time.
    if (!window.supabase) {
        await new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.36.0/dist/umd/supabase.js';
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

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

        console.log('✅ Supabase initialized');
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

    // Get device fingerprint (get() returns a Promise — must await)
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

            // Update UI with admin info
            const emailElements = document.querySelectorAll('.admin-email, .sidebar-profile-email');
            emailElements.forEach(el => {
                if (el) el.textContent = data.email || '';
            });

            const nameElements = document.querySelectorAll('.admin-name, .sidebar-profile-name');
            nameElements.forEach(el => {
                if (el) el.textContent = data.fullName || 'Admin';
            });

            document.querySelectorAll('.sidebar-profile-info').forEach(el => el.classList.add('loaded'));

            // Initialize Supabase and heartbeat
            await initSupabase();

            // Start heartbeat monitor
            if (window.adminHeartbeat) {
                window.adminHeartbeat.start();
            }

            // Restore visibility hidden by admin-guard.js
            document.documentElement.style.visibility = '';

            // Check page permission
            const currentPage = getCurrentPageSlug();
            if (currentPage && !hasPagePermission(currentPage, 'view')) {
                showAccessDenied();
                return false;
            }

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

            console.log('✅ Login successful');

            // Start heartbeat
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

    // Super admin has all permissions
    if (role === 'super_admin') {
        return true;
    }

    // Check in stored permissions
    const perms = adminPermissions.find(p => p.page_slug === pageSlug);
    if (!perms) return false;

    if (permissionType === 'view') return perms.can_view;
    if (permissionType === 'edit') return perms.can_edit;
    if (permissionType === 'delete') return perms.can_delete;

    return false;
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

    const button = document.createElement('button');
    button.style.cssText = 'padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;';
    button.textContent = 'Go to Dashboard';
    button.onclick = function() {
        window.location.href = '/admin-dashboard.html';
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
    getPermissions: () => adminPermissions
};

// Handle session expired event
window.addEventListener('admin:session-expired', function() {
    console.log('Session expired, logging out');
    logout();
});

// Safety fallback: if visibility is still hidden after 4s, force it visible.
// Guards against cases where checkAuth() is never called or throws before restoring.
setTimeout(function() {
    if (document.documentElement.style.visibility === 'hidden') {
        document.documentElement.style.visibility = '';
    }
}, 4000);
