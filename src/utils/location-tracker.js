// Location Tracker - Captures visitor location data
// This script tracks user location using IP geolocation API

(async function initLocationTracking() {
    console.log('🌍 Location Tracker: Script loaded');

    // Prevent running multiple times
    if (window.locationTrackingStarted) {
        console.log('📍 Location Tracker: Already running');
        return;
    }
    window.locationTrackingStarted = true;

    // Wait for Supabase to be available (check both window.supabase and global supabase)
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
        if (typeof window.supabase !== 'undefined' || typeof supabase !== 'undefined') {
            console.log('✅ Location Tracker: Supabase found');
            break;
        }
        console.warn(`⚠️ Location Tracker: Waiting for Supabase... (${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
    }

    if (retries >= maxRetries) {
        console.error('❌ Location Tracker: Supabase not available after 10 seconds');
        return;
    }

    // Use whichever supabase client is available
    const supabaseClient = window.supabase || supabase;

    try {
        console.log('📍 Location Tracker: Checking authentication...');

        // Get current user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError) {
            console.error('❌ Location Tracker: Auth error:', userError);
            return;
        }

        if (!user) {
            console.log('👤 Location Tracker: No authenticated user, skipping');
            return;
        }

        console.log('✅ Location Tracker: User authenticated:', user.id);
        console.log('📍 Location Tracker: Fetching location data...');

        // Fetch location data from our Netlify function (no CORS issues)
        const response = await fetch('/.netlify/functions/get-location');

        if (!response.ok) {
            console.error('❌ Location Tracker: API request failed:', response.status);
            return;
        }

        const locationData = await response.json();

        if (!locationData || !locationData.success) {
            console.error('❌ Location Tracker: Failed to get location:', locationData?.error || 'Unknown error');
            return;
        }

        console.log('✅ Location Tracker: Location data received:', {
            city: locationData.city,
            region: locationData.region,
            country: locationData.country,
            ip: locationData.ip
        });

        console.log('💾 Location Tracker: Saving to database...');

        // Update user_data table with location information
        const { data: updateData, error: updateError } = await supabaseClient
            .from('user_data')
            .upsert({
                user_id: user.id,
                email: user.email,
                city: locationData.city || null,
                region: locationData.region || null,
                country: locationData.country || null,
                country_code: locationData.country_code || null,
                ip_address: locationData.ip || null,
                timezone: locationData.timezone || null,
                latitude: locationData.latitude || null,
                longitude: locationData.longitude || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (updateError) {
            console.error('❌ Location Tracker: Database error:', updateError);
            console.error('Full error details:', JSON.stringify(updateError, null, 2));
        } else {
            console.log('✅ Location Tracker: Data saved successfully!');
            console.log('📊 Saved data:', updateData);
        }

    } catch (error) {
        console.error('❌ Location Tracker: Unexpected error:', error);
        console.error('Error stack:', error.stack);
    }
})();
