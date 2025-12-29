// Migrated from Netlify to Cloudflare Pages
// Get client IP address

export async function onRequest(context) {
    const { request } = context;

    // Cloudflare provides the client IP in CF-Connecting-IP header
    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
               'unknown';

    return new Response(JSON.stringify({ ip }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}