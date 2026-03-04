// Cloudflare Pages Middleware - Dynamic OG tags for video sharing

export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);

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
