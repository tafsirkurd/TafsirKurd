// Check environment variable formatting
export async function onRequest(context) {
    const { env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (context.request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

        const analysis = {
            exists: !!serviceKey,
            length: serviceKey.length,
            startsWithEyJ: serviceKey.startsWith('eyJ'),
            hasSpacesAtStart: serviceKey.length > 0 && serviceKey[0] === ' ',
            hasSpacesAtEnd: serviceKey.length > 0 && serviceKey[serviceKey.length - 1] === ' ',
            hasNewlines: serviceKey.includes('\n') || serviceKey.includes('\r'),
            firstChars: serviceKey.substring(0, 10),
            lastChars: serviceKey.substring(serviceKey.length - 10),
            trimmedLength: serviceKey.trim().length,
            needsTrimming: serviceKey.trim().length !== serviceKey.length
        };

        return new Response(
            JSON.stringify({
                message: 'Environment variable analysis',
                SUPABASE_SERVICE_ROLE_KEY: analysis,
                SUPABASE_URL: {
                    exists: !!env.SUPABASE_URL,
                    value: env.SUPABASE_URL || 'NOT SET'
                },
                recommendation: analysis.needsTrimming
                    ? '⚠️ Your service key has extra spaces or newlines! Copy it again from Supabase and paste carefully.'
                    : analysis.startsWithEyJ
                    ? '✅ Key format looks correct!'
                    : '❌ Key does not start with "eyJ" - it may be incorrect.'
            }, null, 2),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({
                error: 'Exception occurred',
                message: error.message
            }),
            { status: 500, headers: corsHeaders }
        );
    }
}
