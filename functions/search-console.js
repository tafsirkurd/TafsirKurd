// Cloudflare Pages Function - Google Search Console API
// Fetches performance data from Google Search Console

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: corsHeaders }
        );
    }

    // Verify admin session token
    const authHeader = request.headers.get('Authorization') || '';
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
        const { action, dateRange } = await request.json();

        // Get Google credentials from environment variables
        // Option 1: Individual env vars (preferred)
        // Option 2: Base64 encoded JSON
        // Option 3: Raw JSON
        let credentials;

        if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
            // Use individual environment variables
            credentials = {
                client_email: env.GOOGLE_CLIENT_EMAIL,
                private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            };
        } else if (env.GOOGLE_SERVICE_ACCOUNT) {
            const rawCreds = env.GOOGLE_SERVICE_ACCOUNT;
            try {
                // Try base64 decoding first
                let decoded;
                try {
                    decoded = atob(rawCreds);
                } catch (e) {
                    decoded = rawCreds;
                }
                // Fix newlines for JSON parsing
                decoded = decoded.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '\\n');
                credentials = JSON.parse(decoded);
            } catch (parseError) {
                return new Response(
                    JSON.stringify({ error: 'Invalid credentials format: ' + parseError.message }),
                    { status: 500, headers: corsHeaders }
                );
            }
        } else {
            return new Response(
                JSON.stringify({ error: 'Google credentials not configured. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.' }),
                { status: 500, headers: corsHeaders }
            );
        }

        if (!credentials.client_email || !credentials.private_key) {
            return new Response(
                JSON.stringify({ error: 'Google credentials not configured' }),
                { status: 500, headers: corsHeaders }
            );
        }

        // Get access token
        const accessToken = await getGoogleAccessToken(credentials);

        const siteUrl = 'https://tafsirkurd.com/';

        // Calculate date range
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1); // Yesterday

        let startDate = new Date();
        switch (dateRange) {
            case '24hours':
                startDate.setDate(startDate.getDate() - 2);
                break;
            case '7days':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '3months':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case '28days':
            default:
                startDate.setDate(startDate.getDate() - 28);
        }

        const formatDate = (d) => d.toISOString().split('T')[0];

        if (action === 'performance') {
            // Fetch all data in parallel
            const [totals, queries, pages, countries, devices, daily] = await Promise.all([
                // Total metrics
                fetchSearchAnalytics(accessToken, siteUrl, {
                    startDate: formatDate(startDate),
                    endDate: formatDate(endDate),
                    dimensions: [],
                    rowLimit: 1
                }),
                // Top queries
                fetchSearchAnalytics(accessToken, siteUrl, {
                    startDate: formatDate(startDate),
                    endDate: formatDate(endDate),
                    dimensions: ['query'],
                    rowLimit: 20
                }),
                // Top pages
                fetchSearchAnalytics(accessToken, siteUrl, {
                    startDate: formatDate(startDate),
                    endDate: formatDate(endDate),
                    dimensions: ['page'],
                    rowLimit: 20
                }),
                // Countries
                fetchSearchAnalytics(accessToken, siteUrl, {
                    startDate: formatDate(startDate),
                    endDate: formatDate(endDate),
                    dimensions: ['country'],
                    rowLimit: 20
                }),
                // Devices
                fetchSearchAnalytics(accessToken, siteUrl, {
                    startDate: formatDate(startDate),
                    endDate: formatDate(endDate),
                    dimensions: ['device'],
                    rowLimit: 10
                }),
                // Daily data for chart
                fetchSearchAnalytics(accessToken, siteUrl, {
                    startDate: formatDate(startDate),
                    endDate: formatDate(endDate),
                    dimensions: ['date'],
                    rowLimit: 100
                })
            ]);

            return new Response(
                JSON.stringify({
                    success: true,
                    data: {
                        totals: totals.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 },
                        queries: queries.rows || [],
                        pages: pages.rows || [],
                        countries: countries.rows || [],
                        devices: devices.rows || [],
                        daily: daily.rows || [],
                        dateRange: { start: formatDate(startDate), end: formatDate(endDate) }
                    }
                }),
                { status: 200, headers: corsHeaders }
            );
        }

        if (action === 'sitemaps') {
            const sitemaps = await fetchSitemaps(accessToken, siteUrl);
            return new Response(
                JSON.stringify({ success: true, data: sitemaps }),
                { status: 200, headers: corsHeaders }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { status: 400, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Search Console API error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}

// Get Google OAuth access token using service account
async function getGoogleAccessToken(credentials) {
    const now = Math.floor(Date.now() / 1000);

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
    };

    const jwt = await createJWT(header, payload, credentials.private_key);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
        throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
    }

    return tokenData.access_token;
}

// Create JWT for Google OAuth
async function createJWT(header, payload, privateKey) {
    const encoder = new TextEncoder();

    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const signInput = `${headerB64}.${payloadB64}`;

    // Import the private key
    const pemContents = privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\s/g, '');

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        encoder.encode(signInput)
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${signInput}.${signatureB64}`;
}

// Fetch Search Analytics data
async function fetchSearchAnalytics(accessToken, siteUrl, options) {
    const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                startDate: options.startDate,
                endDate: options.endDate,
                dimensions: options.dimensions,
                rowLimit: options.rowLimit || 25,
                dataState: 'final'
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        console.error('Search Analytics error:', error);
        return { rows: [] };
    }

    return response.json();
}

// Fetch sitemaps
async function fetchSitemaps(accessToken, siteUrl) {
    const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
        {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }
    );

    if (!response.ok) {
        return { sitemap: [] };
    }

    return response.json();
}
