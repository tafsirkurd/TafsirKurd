/**
 * seed-vectorize.mjs
 *
 * One-time script: embeds all 6236 Quran verses (Arabic text only) using
 * Cloudflare Workers AI (bge-m3) and upserts them into a Vectorize index.
 *
 * Usage:
 *   node scripts/seed-vectorize.mjs
 *
 * Required env vars (set in your shell or a .env file):
 *   CF_ACCOUNT_ID   — Cloudflare account ID
 *   CF_API_TOKEN    — API token with Workers AI + Vectorize write permissions
 *   CF_VECTORIZE_INDEX — Vectorize index name (e.g. "quran-verses")
 *
 * Run once after creating the Vectorize index:
 *   npx wrangler vectorize create quran-verses --dimensions=1024 --metric=cosine
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const ACCOUNT_ID   = process.env.CF_ACCOUNT_ID;
const API_TOKEN    = process.env.CF_API_TOKEN;
const INDEX_NAME   = process.env.CF_VECTORIZE_INDEX || 'quran-verses';
const AI_MODEL     = '@cf/baai/bge-m3';
const EMBED_BATCH  = 50;   // verses per AI request (bge-m3 handles up to 100)
const UPSERT_BATCH = 200;  // vectors per Vectorize upsert call

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('❌  Set CF_ACCOUNT_ID and CF_API_TOKEN env vars first.');
  process.exit(1);
}

// ── Load Quran data ───────────────────────────────────────────────────────────
const quranPath = join(__dir, '../src/data/quran.json');
const quranRaw  = JSON.parse(readFileSync(quranPath, 'utf8'));

// Flatten to [{sn, an, text}]
const verses = [];
for (const [sn, ayahs] of Object.entries(quranRaw)) {
  for (const a of ayahs) {
    verses.push({ sn: Number(sn), an: a.verse, text: a.text });
  }
}
console.log(`📖  Loaded ${verses.length} verses`);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function embedBatch(texts) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${encodeURIComponent(AI_MODEL)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texts }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API ${res.status}: ${err}`);
  }
  const body = await res.json();
  // bge-m3 REST response: { result: { data: [[float, ...], ...], shape: [...] } }
  const data = body.result?.data || body.result || body.data;
  if (!data || !data.length) throw new Error('Empty AI response: ' + JSON.stringify(body).slice(0, 200));
  return data; // array of float[] — one per input text
}

async function upsertVectors(vectors) {
  // Vectorize REST upsert: NDJSON body
  const ndjson = vectors.map(v => JSON.stringify(v)).join('\n');
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/vectorize/v2/indexes/${INDEX_NAME}/upsert`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/x-ndjson',
    },
    body: ndjson,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vectorize upsert ${res.status}: ${err}`);
  }
  const body = await res.json();
  return body.result?.upsertedCount || 0;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const allVectors = [];
  const batches = chunk(verses, EMBED_BATCH);
  let done = 0;

  console.log(`🔢  Embedding in ${batches.length} batches of ${EMBED_BATCH}…`);

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const texts = batch.map(v => v.text);

    let embeddings;
    try {
      embeddings = await embedBatch(texts);
    } catch (e) {
      console.error(`  ✗ Batch ${bi + 1} embed failed: ${e.message}. Retrying once…`);
      await new Promise(r => setTimeout(r, 2000));
      embeddings = await embedBatch(texts);
    }

    for (let i = 0; i < batch.length; i++) {
      const v = batch[i];
      allVectors.push({
        id: `${v.sn}:${v.an}`,
        values: embeddings[i],
        metadata: { sn: v.sn, an: v.an },
      });
    }

    done += batch.length;
    process.stdout.write(`\r  ✓ ${done}/${verses.length} verses embedded`);

    // Polite rate-limiting: 40ms between AI calls
    if (bi < batches.length - 1) await new Promise(r => setTimeout(r, 40));
  }

  console.log('\n📤  Upserting to Vectorize…');
  const upsertBatches = chunk(allVectors, UPSERT_BATCH);
  let totalUpserted = 0;

  for (let ub = 0; ub < upsertBatches.length; ub++) {
    const count = await upsertVectors(upsertBatches[ub]);
    totalUpserted += count;
    console.log(`  ✓ Batch ${ub + 1}/${upsertBatches.length} → ${totalUpserted} vectors upserted`);
    if (ub < upsertBatches.length - 1) await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅  Done. ${totalUpserted} verse vectors stored in "${INDEX_NAME}".`);
  console.log('   Next: deploy the quran-search worker with `npx wrangler deploy -c workers/quran-search/wrangler.toml`');
}

main().catch(e => { console.error('\n❌ ', e.message); process.exit(1); });
