// PDF Proxy — fetches PDF from R2 server-side and returns with CORS headers
// Allows Capacitor WebView (capacitor://localhost) to load PDFs via PDF.js

const ALLOWED_DOMAIN = 'r2.dev';

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    const pdfUrl = url.searchParams.get('url');
    if (!pdfUrl) {
        return new Response('Missing url param', { status: 400, headers: corsHeaders });
    }

    // Only allow fetching from our R2 domain
    let parsed;
    try { parsed = new URL(pdfUrl); } catch(e) {
        return new Response('Invalid URL', { status: 400, headers: corsHeaders });
    }
    if (!parsed.hostname.endsWith(ALLOWED_DOMAIN)) {
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    const resp = await fetch(pdfUrl, { method: request.method });
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', resp.headers.get('Content-Type') || 'application/pdf');
    const cl = resp.headers.get('Content-Length');
    if (cl) headers.set('Content-Length', cl);

    return new Response(resp.body, { status: resp.status, headers });
}
