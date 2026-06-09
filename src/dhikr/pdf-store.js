/* PDF offline storage — Cache API wrapper
   Caches PDFs by book ID so they survive offline.
   The proxy URL is used as the cache key. */
var PdfStore = (function () {
  var CACHE_NAME = 'tafsirkurd-pdfs-v1';
  var PROXY_BASE = 'https://tafsirkurd.com/pdf-proxy?url=';

  function proxyUrl(pdfUrl) {
    // If the URL already points to our pdf-proxy endpoint, use it as-is (avoid double-wrapping).
    if (pdfUrl && pdfUrl.includes('/pdf-proxy?')) return pdfUrl;
    return PROXY_BASE + encodeURIComponent(pdfUrl);
  }

  function supported() {
    return typeof caches !== 'undefined';
  }

  /* Returns true if this book's PDF is cached */
  async function has(book) {
    if (!supported() || !book.pdf_url) return false;
    try {
      var cache = await caches.open(CACHE_NAME);
      var match = await cache.match(proxyUrl(book.pdf_url));
      return !!match;
    } catch (e) { return false; }
  }

  /* Download PDF, cache it, and return ArrayBuffer.
     onProgress(pct 0-100) called during fetch. */
  async function download(book, onProgress) {
    var url = proxyUrl(book.pdf_url);
    var resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    // Stream body to track progress
    var contentLength = parseInt(resp.headers.get('content-length') || '0', 10);
    var reader = resp.body.getReader();
    var chunks = [];
    var received = 0;
    while (true) {
      var _r = await reader.read();
      if (_r.done) break;
      chunks.push(_r.value);
      received += _r.value.length;
      if (contentLength > 0 && onProgress) onProgress(Math.round(received / contentLength * 100));
    }
    if (onProgress) onProgress(100);

    // Combine chunks
    var total = chunks.reduce(function (s, c) { return s + c.length; }, 0);
    var buf = new Uint8Array(total);
    var offset = 0;
    chunks.forEach(function (c) { buf.set(c, offset); offset += c.length; });
    var arrayBuffer = buf.buffer;

    // Store in Cache API as a synthetic Response
    var cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(arrayBuffer.slice(0), {
      headers: { 'Content-Type': 'application/pdf' }
    }));

    return arrayBuffer;
  }

  /* Load cached PDF as ArrayBuffer, or null if not cached */
  async function load(book) {
    if (!supported() || !book.pdf_url) return null;
    try {
      var cache = await caches.open(CACHE_NAME);
      var match = await cache.match(proxyUrl(book.pdf_url));
      if (!match) return null;
      return await match.arrayBuffer();
    } catch (e) { return null; }
  }

  /* Delete cached PDF for a book */
  async function remove(book) {
    if (!supported() || !book.pdf_url) return false;
    try {
      var cache = await caches.open(CACHE_NAME);
      return await cache.delete(proxyUrl(book.pdf_url));
    } catch (e) { return false; }
  }

  /* List all cached books — returns array of {url, sizeApprox} */
  async function listAll() {
    if (!supported()) return [];
    try {
      var cache = await caches.open(CACHE_NAME);
      var keys = await cache.keys();
      var results = [];
      for (var i = 0; i < keys.length; i++) {
        var r = await cache.match(keys[i]);
        var buf = r ? await r.arrayBuffer() : null;
        results.push({
          proxyUrl: keys[i].url,
          pdfUrl: decodeURIComponent(keys[i].url.replace(PROXY_BASE, '')),
          bytes: buf ? buf.byteLength : 0
        });
      }
      return results;
    } catch (e) { return []; }
  }

  /* Human-readable file size */
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  return { has: has, download: download, load: load, remove: remove, listAll: listAll, fmtSize: fmtSize, supported: supported };
})();
