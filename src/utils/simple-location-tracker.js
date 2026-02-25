// Simple Location Tracker - Just sends user ID to server
// Server does all the work: IP detection, location lookup, database save

(async function() {
    // Wait for auth to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        // Dynamically find the Supabase auth token key (avoids hardcoding project ID)
        const authKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        const authData = authKey ? localStorage.getItem(authKey) : null;

        if (!authData) return;

        const parsed = JSON.parse(authData);
        const userId = parsed?.user?.id;
        const accessToken = parsed?.access_token;

        if (!userId || !accessToken) return;

        // Send to Cloudflare function — pass auth token so server can verify identity
        const response = await fetch('/track-location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            body: JSON.stringify({ userId: userId })
        });

        await response.json();

    } catch (error) {
        // Silently ignore tracking errors
    }
})();
