// PDF Proxy — serves PDFs from R2 via binding (no public bucket access needed)
// Falls back to fetch for non-books buckets. Adds CORS headers for Capacitor WebView.

const ALLOWED_DOMAIN = 'r2.dev';

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

    // Direct key access — used when pdf_url is stored as /pdf-proxy?key=pdfs/...
    // Bypasses public-URL validation; only the key prefix is checked.
    const directKey = url.searchParams.get('key');
    if (directKey) {
        if (!directKey.startsWith('pdfs/')) {
            return new Response('Forbidden', { status: 403, headers: corsHeaders });
        }
        if (!env.BOOKS_BUCKET) {
            return new Response('Storage not configured', { status: 503, headers: corsHeaders });
        }
        try {
            const object = await env.BOOKS_BUCKET.get(directKey);
            if (!object) return new Response('Not Found', { status: 404, headers: corsHeaders });
            const headers = new Headers(corsHeaders);
            headers.set('Content-Type', object.httpMetadata?.contentType || 'application/pdf');
            if (object.size) headers.set('Content-Length', String(object.size));
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            return new Response(object.body, { headers });
        } catch (e) {
            return new Response('Failed to fetch PDF', { status: 502, headers: corsHeaders });
        }
    }

    const pdfUrl = url.searchParams.get('url');
    if (!pdfUrl) {
        return new Response('Missing url param', { status: 400, headers: corsHeaders });
    }

    let parsed;
    try { parsed = new URL(pdfUrl); } catch(e) {
        return new Response('Invalid URL', { status: 400, headers: corsHeaders });
    }
    if (!parsed.hostname.endsWith(ALLOWED_DOMAIN)) {
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    // Try R2 binding — avoids needing public bucket access
    if (env.BOOKS_BUCKET) {
        try {
            const key = parsed.pathname.replace(/^\//, '');
            // Only serve objects under the pdfs/ prefix — prevents exposing other bucket contents
            if (!key.startsWith('pdfs/')) {
                return new Response('Forbidden', { status: 403, headers: corsHeaders });
            }
            const object = await env.BOOKS_BUCKET.get(key);
            if (object) {
                const headers = new Headers(corsHeaders);
                headers.set('Content-Type', object.httpMetadata?.contentType || 'application/pdf');
                if (object.size) headers.set('Content-Length', String(object.size));
                return new Response(object.body, { headers });
            }
        } catch(e) {
            // fall through to fetch
        }
    }

    // Fallback: fetch from public URL (for other buckets or if binding misses)
    try {
        const resp = await fetch(pdfUrl, { method: request.method });
        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', resp.headers.get('Content-Type') || 'application/pdf');
        const cl = resp.headers.get('Content-Length');
        if (cl) headers.set('Content-Length', cl);
        return new Response(resp.body, { status: resp.status, headers });
    } catch(e) {
        return new Response('Failed to fetch PDF', { status: 502, headers: corsHeaders });
    }
}
