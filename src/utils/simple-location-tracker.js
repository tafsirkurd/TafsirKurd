// Simple Location Tracker - Just sends user ID to server
// Server does all the work: IP detection, location lookup, database save

(async function() {
    console.log('🌍 Simple Location Tracker: Starting...');

    // Wait a bit for auth to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        // Try to get user ID from localStorage (works even if Supabase CDN fails)
        const authData = localStorage.getItem('sb-sroaorqiuocygfzggbax-auth-token');

        if (!authData) {
            console.log('👤 No auth data found, skipping location tracking');
            return;
        }

        const parsed = JSON.parse(authData);
        const userId = parsed?.user?.id;
        const userEmail = parsed?.user?.email;

        if (!userId) {
            console.log('👤 No user ID found, skipping location tracking');
            return;
        }

        console.log('✅ Found user ID:', userId);
        console.log('📍 Sending location tracking request...');

        // Send to Cloudflare function - it does everything
        const response = await fetch('/track-location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                userEmail: userEmail
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Location tracked successfully!');
            if (result.location) {
                console.log('📍 Your location:', result.location);
            }
        } else {
            console.error('❌ Location tracking failed:', result.error);
        }

    } catch (error) {
        console.error('❌ Location tracker error:', error);
    }
})();
