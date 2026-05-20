/**
 * quran-search Worker
 * Semantic search over all 6236 Quran verses using:
 *   - Workers AI: bge-m3 multilingual embeddings (Arabic-native)
 *   - Vectorize: cosine similarity index of pre-seeded verse vectors
 *
 * POST /search   { "q": "Arabic or transliterated query" }
 * → { "results": [{ "sn": 2, "an": 255, "score": 0.91 }, …] }
 *
 * GET  /health   → { "ok": true }
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/health') {
      return json({ ok: true });
    }

    if (url.pathname === '/search' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }

      const q = (body.q || '').trim();
      if (!q || q.length < 2) {
        return json({ error: 'Query too short' }, 400);
      }

      // 1. Embed the query using bge-m3 (multilingual, Arabic-native, 1024 dims)
      let embedding;
      try {
        const aiRes = await env.AI.run('@cf/baai/bge-m3', { text: [q] });
        // bge-m3 returns { shape, data } where data is array of float arrays
        embedding = aiRes.data ? aiRes.data[0] : (aiRes[0] || aiRes);
      } catch (e) {
        return json({ error: 'Embedding failed: ' + e.message }, 502);
      }

      if (!embedding || !embedding.length) {
        return json({ error: 'Empty embedding' }, 502);
      }

      // 2. Query Vectorize for nearest verses
      let matches;
      try {
        const vRes = await env.VECTORIZE.query(embedding, {
          topK: 20,
          returnValues: false,
          returnMetadata: 'all',
        });
        matches = vRes.matches || [];
      } catch (e) {
        return json({ error: 'Vector query failed: ' + e.message }, 502);
      }

      // 3. Parse ids back to {sn, an} — stored as "sn:an" strings
      const results = matches.map(m => {
        const [sn, an] = m.id.split(':').map(Number);
        return { sn, an, score: Math.round(m.score * 1000) / 1000 };
      });

      return json({ results });
    }

    return json({ error: 'Not found' }, 404);
  },
};
