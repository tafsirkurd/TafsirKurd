const UPLOAD_SECRET = 'tk_r2_img_2026_K8mX3pW7nR9vJ4sQ';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (request.method === 'POST' && key === 'upload') {
      if (request.headers.get('Authorization') !== 'Bearer ' + UPLOAD_SECRET)
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...cors } });
      try {
        const form = await request.formData();
        const file = form.get('file');
        const imgKey = form.get('key');
        if (!file || !imgKey) return new Response(JSON.stringify({ error: 'Missing file or key' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });
        await env.IMAGES.put(imgKey, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type || 'image/jpeg', cacheControl: 'public, max-age=31536000' }
        });
        return new Response(JSON.stringify({ url: 'https://tafsirkurd-images.tefsirkurd.workers.dev/' + imgKey }), {
          headers: { 'Content-Type': 'application/json', ...cors }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } });
      }
    }

    if (request.method === 'DELETE' && key) {
      if (request.headers.get('Authorization') !== 'Bearer ' + UPLOAD_SECRET)
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...cors } });
      await env.IMAGES.delete(key);
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...cors } });
    }

    if (request.method === 'GET' && key) {
      const obj = await env.IMAGES.get(key);
      if (!obj) return new Response('Not Found', { status: 404 });
      const headers = new Headers(cors);
      obj.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000');
      return new Response(obj.body, { headers });
    }

    return new Response('Not Found', { status: 404 });
  }
};
