// Serves book cover images from the BOOKS_BUCKET R2 binding.
// Avoids needing public bucket access — same pattern as pdf-proxy.js.

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    const key = url.searchParams.get('key');
    if (!key || !key.startsWith('book-covers/')) {
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    if (!env.BOOKS_BUCKET) {
        return new Response('Storage not configured', { status: 503, headers: corsHeaders });
    }

    try {
        const object = await env.BOOKS_BUCKET.get(key);
        if (!object) {
            return new Response('Not Found', { status: 404, headers: corsHeaders });
        }

        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        if (object.size) headers.set('Content-Length', String(object.size));

        return new Response(object.body, { headers });
    } catch (e) {
        return new Response('Failed to fetch image', { status: 502, headers: corsHeaders });
    }
}
