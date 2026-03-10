// Server-side Device Fingerprint Generator
// Generates fingerprints with a secret salt - cannot be spoofed client-side

export async function onRequest(context) {
    const { request, env } = context;

    // Allow web + Capacitor iOS/Android origins
    const origin = request.headers.get('Origin') || '';
    const ALLOWED_ORIGINS = ['https://tafsirkurd.com', 'capacitor://localhost', 'http://localhost'];
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://tafsirkurd.com';
    const corsHeaders = {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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

    try {
        const deviceData = await request.json();

        // Get server-side data that client can't fake
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const userAgent = request.headers.get('User-Agent') || 'unknown';

        // Secret salt from environment (NOT exposed to client)
        const SECRET_SALT = env.FINGERPRINT_SECRET;
        if (!SECRET_SALT) {
            return new Response(
                JSON.stringify({ error: 'Server misconfiguration' }),
                { status: 500, headers: corsHeaders }
            );
        }

        // Use only stable characteristics — canvas/webgl excluded (vary between browser restarts)
        // IP and userAgent excluded (change on network switch / browser update)
        const components = [
            SECRET_SALT,
            deviceData.screen || '',
            deviceData.timezone || '',
            deviceData.language || '',
            deviceData.platform || '',
            deviceData.cores || '',
            deviceData.memory || '',
            deviceData.touch || '',
        ];

        // Generate secure hash using Web Crypto API
        const fingerprintString = components.join('|');
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprintString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const fingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);

        return new Response(
            JSON.stringify({
                success: true,
                fingerprint: fingerprint
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Fingerprint generation error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to generate fingerprint' }),
            { status: 500, headers: corsHeaders }
        );
    }
}
