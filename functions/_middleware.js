// Cloudflare Pages Middleware - Rate limiting + Dynamic OG tags

export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // ===== RATE LIMITING — admin API endpoints only (not .html pages) =====
    const adminApiPaths = ['/admin-auth', '/admin-management', '/admin-stats', '/admin-books', '/admin-messages-api', '/admin-users-data'];
    const isAdminApi = adminApiPaths.some(p => url.pathname === p || url.pathname.startsWith(p + '/'));

    if (isAdminApi && request.method === 'POST' && env.ADMIN_KV) {
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const bucket = Math.floor(Date.now() / 60000); // 1-minute rolling window
        const key = `ratelimit:${clientIP}:${bucket}`;
        const current = parseInt(await env.ADMIN_KV.get(key) || '0');
        if (current >= 60) { // max 60 requests/min per IP
            return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
            });
        }
        await env.ADMIN_KV.put(key, String(current + 1), { expirationTtl: 120 });
    }

    // Only process islamvoice pages with video param
    if (!url.pathname.includes('islamvoice') || !url.searchParams.get('video')) {
        return next();
    }

    const videoId = url.searchParams.get('video');

    // Check if this is a bot/crawler
    const userAgent = request.headers.get('user-agent') || '';
    const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterest|googlebot|bingbot/i.test(userAgent);

    // For regular users, just pass through
    if (!isCrawler) {
        return next();
    }

    try {
        const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
        const supabaseKey = env.SUPABASE_ANON_KEY?.replace(/[\n\r\s]/g, '');

        if (!supabaseUrl || !supabaseKey) {
            return next();
        }

        // Fetch video details from Supabase
        const apiResponse = await fetch(
            `${supabaseUrl}/rest/v1/islamvoice_episodes?id=eq.${videoId}&select=id,title,description,thumbnail_url,islamvoice_series(name_ku)`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            }
        );

        if (!apiResponse.ok) {
            return next();
        }

        const videos = await apiResponse.json();
        const video = videos[0];

        if (!video) {
            return next();
        }

        // Prepare OG data
        const title = video.title || 'دەنگێ ئیسلامێ';
        const description = video.description || video.islamvoice_series?.name_ku || 'ببینە زنجیرەیێن ڤیدیویی یێن ئیسلامی';
        const thumbnail = video.thumbnail_url || 'https://tafsirkurd.com/assets/images/og-image.png';
        const videoUrl = `https://tafsirkurd.com/islamvoice.html?video=${videoId}`;

        // Generate a minimal HTML with OG tags for crawlers
        const crawlerHtml = `<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} - تەفسیر کورد</title>
    <meta property="og:type" content="video.other">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(thumbnail)}">
    <meta property="og:image:width" content="1280">
    <meta property="og:image:height" content="720">
    <meta property="og:url" content="${escapeHtml(videoUrl)}">
    <meta property="og:site_name" content="تەفسیر کورد">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(thumbnail)}">
    <meta http-equiv="refresh" content="0;url=${escapeHtml(videoUrl)}">
</head>
<body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(title)}">
    <p><a href="${escapeHtml(videoUrl)}">Watch on TafsirKurd</a></p>
</body>
</html>`;

        return new Response(crawlerHtml, {
            status: 200,
            headers: {
                'Content-Type': 'text/html;charset=UTF-8',
                'Cache-Control': 'public, max-age=3600'
            }
        });

    } catch (error) {
        console.error('OG middleware error:', error);
        return next();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
