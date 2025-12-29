// Migrated from Netlify to Cloudflare Pages
// Configuration endpoint

export async function onRequest(context) {
    const { env } = context;

    const config = {
        supabaseUrl: env.SUPABASE_URL || 'https://nvwgepkhzobgwnzibpvq.supabase.co',
        supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
        turnstileSiteKey: env.CLOUDFLARE_TURNSTILE_SITE_KEY || ''
    };

    return new Response(JSON.stringify(config), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}