// Admin Authentication Utilities
// Shared authentication logic for admin dashboard

// Initialize Supabase Client
let supabaseClient = null;

async function initSupabase() {
    if (supabaseClient) return true;

    try {
        const SUPABASE_URL = 'https://gijupzejtbpifjzwadee.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpanVwemVqdGJwaWZqendh ZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5NjczNjUsImV4cCI6MjA2MjU0MzM2NX0.OWHdA-wTf2aQLlQnMxU6cJaGH2ow8vRQlaCW8q8Q1vU';

        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

    try {
        const response = await fetch('/admin-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify', token: adminToken })
        });

        const data = await response.json();

        if (data.success) {
            // Update UI with admin info
            const emailElements = document.querySelectorAll('.admin-email, .sidebar-profile-email');
            emailElements.forEach(el => {
                if (el) el.textContent = data.email || 'tefsirkurd@gmail.com';
            });

            // Initialize Supabase after auth
            await initSupabase();
            return true;
        } else {
            sessionStorage.removeItem('adminToken');
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.error('Session verification error:', error);
        sessionStorage.removeItem('adminToken');
        redirectToLogin();
        return false;
    }
}

// Login function
async function adminLogin(email, password) {
    try {
        const response = await fetch('/admin-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'login',
                email,
                password
            })
        });

        const data = await response.json();

        if (data.success) {
            sessionStorage.setItem('adminToken', data.token);
            return { success: true };
        } else {
            return { success: false, error: data.error || 'Login failed' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Connection error' };
    }
}

// Logout function
async function adminLogout() {
    try {
        const token = sessionStorage.getItem('adminToken');

        await fetch('/admin-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout', token })
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminSessionId');
    window.location.href = '/admin-login.html';
}

// Redirect to login
function redirectToLogin() {
    // Check if we're already on login page
    if (!window.location.pathname.includes('admin-login.html')) {
        window.location.href = '/admin-login.html';
    }
}

// Export functions
window.adminAuth = {
    checkAuth,
    login: adminLogin,
    logout: adminLogout,
    initSupabase,
    getSupabase: () => supabaseClient
};
