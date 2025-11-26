// Location Tracker - Captures visitor location data
// This script tracks user location using IP geolocation API

(async function initLocationTracking() {
    console.log('🌍 Location Tracker: Script loaded');

    // Check if Supabase is available
    if (typeof supabase === 'undefined') {
        console.warn('⚠️ Location Tracker: Supabase not loaded, retrying in 1 second...');
        setTimeout(initLocationTracking, 1000);
        return;
    }

    // Prevent running multiple times
    if (window.locationTrackingStarted) {
        console.log('📍 Location Tracker: Already running');
        return;
    }
    window.locationTrackingStarted = true;

    try {
        console.log('📍 Location Tracker: Checking authentication...');

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

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

        // Fetch location data from ipapi.co (free, no API key needed)
        const response = await fetch('https://ipapi.co/json/');

        if (!response.ok) {
            console.error('❌ Location Tracker: API request failed:', response.status);
            return;
        }

        const locationData = await response.json();

        if (!locationData || locationData.error) {
            console.error('❌ Location Tracker: Failed to get location:', locationData?.reason || 'Unknown error');
            return;
        }

        console.log('✅ Location Tracker: Location data received:', {
            city: locationData.city,
            region: locationData.region,
            country: locationData.country_name,
            ip: locationData.ip
        });

        console.log('💾 Location Tracker: Saving to database...');

        // Update user_data table with location information
        const { data: updateData, error: updateError } = await supabase
            .from('user_data')
            .upsert({
                user_id: user.id,
                email: user.email,
                city: locationData.city || null,
                region: locationData.region || null,
                country: locationData.country_name || null,
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
