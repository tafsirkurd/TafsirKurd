export default {
  async fetch(request) {
    // Fetch directly from Pages origin, bypassing CDN cache
    const resp = await fetch('https://tafsirkurd.pages.dev/service-worker.js', {
      cf: { cacheEverything: false }
    });
    if (!resp.ok) {
      return new Response('Service worker unavailable', { status: 502 });
    }
    return new Response(resp.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
};
