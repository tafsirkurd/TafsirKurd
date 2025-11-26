// Location Tracker - Captures visitor location data
// This script tracks user location using IP geolocation API

(async function initLocationTracking() {
    // Check if Supabase is available
    if (typeof supabase === 'undefined') {
        console.warn('Supabase not loaded, skipping location tracking');
        return;
    }

    // Prevent running multiple times
    if (window.locationTrackingStarted) {
        return;
    }
    window.locationTrackingStarted = true;

    try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.log('No authenticated user, skipping location tracking');
            return;
        }

        console.log('📍 Starting location tracking for user:', user.id);

        // Fetch location data from ipapi.co (free, no API key needed)
        const response = await fetch('https://ipapi.co/json/');
        const locationData = await response.json();

        if (!locationData || locationData.error) {
            console.error('Failed to get location data:', locationData?.reason || 'Unknown error');
            return;
        }

        console.log('📍 Location data received:', {
            city: locationData.city,
            region: locationData.region,
            country: locationData.country_name,
            ip: locationData.ip
        });

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
            console.error('Error updating location data:', updateError);
        } else {
            console.log('✅ Location data saved successfully');
        }

    } catch (error) {
        console.error('Location tracking error:', error);
    }
})();
