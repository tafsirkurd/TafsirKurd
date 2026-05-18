/**
 * Google Analytics Data API Function
 * Fetches real analytics data from GA4
 */

export async function onRequest(context) {
    const { env } = context;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS
    if (context.request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // Verify admin session token
    const authHeader = context.request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, '');

    if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: corsHeaders });
    }

    const sessionRes = await fetch(
        `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${new Date().toISOString()}&select=user_id`,
        { headers: { 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}` } }
    );
    const sessions = sessionRes.ok ? await sessionRes.json() : [];
    if (!sessions || sessions.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401, headers: corsHeaders });
    }

    try {
        // Get credentials from environment variables
        const propertyId = env.GA_PROPERTY_ID;
        const serviceAccountEmail = env.GA_SERVICE_ACCOUNT_EMAIL;
        const privateKey = env.GA_PRIVATE_KEY;

        if (!propertyId || !serviceAccountEmail || !privateKey) {
            console.error('Missing GA credentials in environment variables');
            return new Response(JSON.stringify({
                error: 'Google Analytics not configured',
                message: 'Please set up GA_PROPERTY_ID, GA_SERVICE_ACCOUNT_EMAIL, and GA_PRIVATE_KEY in Cloudflare environment variables'
            }), { status: 500, headers: corsHeaders });
        }

        // Get date range from query parameters (default: 30 days)
        const url = new URL(context.request.url);
        const days = parseInt(url.searchParams.get('days')) || 30;
        const startDate = `${days}daysAgo`;

        // Get access token using Service Account
        const accessToken = await getAccessToken(serviceAccountEmail, privateKey);

        // Fetch analytics data
        const [overviewData, pageData, deviceData, countryData, trafficData, sourceData, browserData] = await Promise.all([
            fetchOverviewMetrics(propertyId, accessToken, startDate),
            fetchPageMetrics(propertyId, accessToken, startDate),
            fetchDeviceMetrics(propertyId, accessToken, startDate),
            fetchCountryMetrics(propertyId, accessToken, startDate),
            fetchTrafficOverTime(propertyId, accessToken, startDate),
            fetchTrafficSources(propertyId, accessToken, startDate),
            fetchBrowserMetrics(propertyId, accessToken, startDate)
        ]);

        // Return combined data
        return new Response(JSON.stringify({
            success: true,
            overview: overviewData,
            pages: pageData,
            devices: deviceData,
            countries: countryData,
            trafficChart: trafficData,
            sources: sourceData,
            browsers: browserData,
            dateRange: { days, startDate, endDate: 'today' },
            timestamp: new Date().toISOString()
        }), { headers: corsHeaders });

    } catch (error) {
        console.error('Error fetching Google Analytics data:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch analytics data',
            message: error.message
        }), { status: 500, headers: corsHeaders });
    }
}

/**
 * Get OAuth2 access token using Service Account credentials
 */
async function getAccessToken(email, privateKey) {
    const jwtHeader = {
        alg: 'RS256',
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtClaim = {
        iss: email,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };

    // Create JWT
    const jwt = await createJWT(jwtHeader, jwtClaim, privateKey);

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Failed to get access token: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
}

/**
 * Create JWT token
 */
async function createJWT(header, claim, privateKey) {
    const encoder = new TextEncoder();

    // Base64 URL encode
    const base64UrlEncode = (obj) => {
        const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const headerEncoded = base64UrlEncode(header);
    const claimEncoded = base64UrlEncode(claim);
    const message = `${headerEncoded}.${claimEncoded}`;

    // Import private key - handle both escaped \n and actual newlines
    let keyData = privateKey;
    // If the key has escaped newlines, convert them
    if (keyData.includes('\\n')) {
        keyData = keyData.replace(/\\n/g, '\n');
    }

    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = keyData.substring(
        keyData.indexOf(pemHeader) + pemHeader.length,
        keyData.indexOf(pemFooter)
    ).replace(/\s/g, '');

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    // Sign message
    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        encoder.encode(message)
    );

    const signatureEncoded = base64UrlEncode(
        String.fromCharCode(...new Uint8Array(signature))
    );

    return `${message}.${signatureEncoded}`;
}

/**
 * Fetch overview metrics (total views, users, session duration, bounce rate)
 */
async function fetchOverviewMetrics(propertyId, accessToken, startDate = '30daysAgo') {
    const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate, endDate: 'today' }],
                metrics: [
                    { name: 'screenPageViews' },
                    { name: 'activeUsers' },
                    { name: 'averageSessionDuration' },
                    { name: 'bounceRate' }
                ]
            })
        }
    );

    if (!response.ok) {
        throw new Error(`GA API error: ${await response.text()}`);
    }

    const data = await response.json();
    const row = data.rows?.[0]?.metricValues || [];

    return {
        totalViews: parseInt(row[0]?.value || 0),
        uniqueVisitors: parseInt(row[1]?.value || 0),
        avgSessionDuration: parseFloat(row[2]?.value || 0),
        bounceRate: parseFloat(row[3]?.value || 0)
    };
}

/**
 * Fetch page-level metrics
 */
async function fetchPageMetrics(propertyId, accessToken, startDate = '30daysAgo') {
    const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate, endDate: 'today' }],
                dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
                metrics: [
                    { name: 'screenPageViews' },
                    { name: 'activeUsers' },
                    { name: 'averageSessionDuration' }
                ],
                orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit: 20
            })
        }
    );

    if (!response.ok) {
        throw new Error(`GA API error: ${await response.text()}`);
    }

    const data = await response.json();
    return (data.rows || []).map(row => ({
        path: row.dimensionValues[0].value,
        title: row.dimensionValues[1].value,
        views: parseInt(row.metricValues[0].value),
        unique: parseInt(row.metricValues[1].value),
        avgTime: parseFloat(row.metricValues[2].value)
    }));
}

/**
 * Fetch device breakdown
 */
async function fetchDeviceMetrics(propertyId, accessToken, startDate = '30daysAgo') {
    const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate, endDate: 'today' }],
                dimensions: [{ name: 'deviceCategory' }],
                metrics: [{ name: 'activeUsers' }]
            })
        }
    );

    if (!response.ok) {
        throw new Error(`GA API error: ${await response.text()}`);
    }

    const data = await response.json();
    const devices = {};
    let total = 0;

    (data.rows || []).forEach(row => {
        const device = row.dimensionValues[0].value.toLowerCase();
        const users = parseInt(row.metricValues[0].value);
        devices[device] = users;
        total += users;
    });

    return {
        mobile: total > 0 ? ((devices.mobile || 0) / total * 100).toFixed(1) : '0',
        desktop: total > 0 ? ((devices.desktop || 0) / total * 100).toFixed(1) : '0',
        tablet: total > 0 ? ((devices.tablet || 0) / total * 100).toFixed(1) : '0'
    };
}

/**
 * Fetch top countries
 */
async function fetchCountryMetrics(propertyId, accessToken, startDate = '30daysAgo') {
    const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate, endDate: 'today' }],
                dimensions: [{ name: 'country' }],
                metrics: [{ name: 'activeUsers' }],
                orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
                limit: 10
            })
        }
    );

    if (!response.ok) {
        throw new Error(`GA API error: ${await response.text()}`);
    }

    const data = await response.json();
    return (data.rows || []).map(row => ({
        name: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value)
    }));
}

/**
 * Fetch traffic over time (day by day for chart)
 */
async function fetchTrafficOverTime(propertyId, accessToken, startDate = '30daysAgo') {
    const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate, endDate: 'today' }],
                dimensions: [{ name: 'date' }],
                metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
                orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
            })
        }
    );

    if (!response.ok) {
        throw new Error(`GA API error: ${await response.text()}`);
    }

    const data = await response.json();
    return (data.rows || []).map(row => ({
        date: row.dimensionValues[0].value,
        views: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value)
    }));
}

/**
 * Fetch traffic sources (referral, direct, organic, etc.)
 */
async function fetchTrafficSources(propertyId, accessToken, startDate = '30daysAgo') {
    const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate, endDate: 'today' }],
                dimensions: [{ name: 'sessionDefaultChannelGroup' }],
                metrics: [{ name: 'sessions' }],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
            })
        }
    );

    if (!response.ok) {
        throw new Error(`GA API error: ${await response.text()}`);
    }

    const data = await response.json();
    const sources = (data.rows || []).map(row => ({
        source: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value)
    }));

    // Calculate percentages
    const total = sources.reduce((sum, s) => sum + s.sessions, 0);
    return sources.map(s => ({
        ...s,
        percentage: total > 0 ? ((s.sessions / total) * 100).toFixed(1) : '0'
    }));
}

/**
 * Fetch browser breakdown
 */
async function fetchBrowserMetrics(propertyId, accessToken, startDate = '30daysAgo') {
    const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateRanges: [{ startDate, endDate: 'today' }],
                dimensions: [{ name: 'browser' }],
                metrics: [{ name: 'activeUsers' }],
                orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
                limit: 10
            })
        }
    );

    if (!response.ok) {
        throw new Error(`GA API error: ${await response.text()}`);
    }

    const data = await response.json();
    const browsers = (data.rows || []).map(row => ({
        browser: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value)
    }));

    // Calculate percentages
    const total = browsers.reduce((sum, b) => sum + b.users, 0);
    return browsers.map(b => ({
        ...b,
        percentage: total > 0 ? ((b.users / total) * 100).toFixed(1) : '0'
    }));
}
