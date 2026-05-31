/**
 * Supabase reverse proxy Worker
 * Forwards all traffic from db.tafsirkurd.com → gijupzejtbpifjzwadee.supabase.co
 *
 * Handles: REST, Auth, Storage (streaming), Edge Functions, Realtime (WebSocket)
 *
 * STREAMING GUARANTEE
 * -------------------
 * upstream.body is a ReadableStream. Passing it directly to new Response() pipes
 * bytes to the client as they arrive — no buffering, no memory accumulation.
 * This means 100 MB audio files and large PDFs flow through at wire speed.
 * We NEVER call .arrayBuffer() / .text() / .json() on the upstream body.
 *
 * RANGE REQUESTS
 * --------------
 * The `Range` header is forwarded as-is. Supabase/storage returns 206 Partial Content
 * with the correct Content-Range. This is what Capacitor WebView needs for audio seeking.
 *
 * REDIRECT HANDLING
 * -----------------
 * Storage signed URLs that redirect to S3/R2 CDN are followed internally (redirect:'follow').
 * The client receives the final file content — no broken redirect chains on mobile WebViews.
 *
 * ACCEPT-ENCODING
 * ---------------
 * We forward the client's Accept-Encoding exactly as sent. We do not add our own.
 * This prevents CF from requesting gzip from Supabase when the client expects identity,
 * which would otherwise corrupt binary downloads in some Capacitor versions.
 *
 * WEBSOCKET PROTOCOL
 * ------------------
 * Supabase Realtime uses the Phoenix transport (Sec-WebSocket-Protocol: phoenix).
 * The backend's 101 response includes this header and we must forward it. Browsers,
 * and especially Safari on iOS, close the connection if the negotiated protocol in
 * the 101 does not match what the client advertised.
 */

const SUPABASE_HTTPS = 'https://gijupzejtbpifjzwadee.supabase.co';
const SUPABASE_WSS   = 'wss://gijupzejtbpifjzwadee.supabase.co';

// Headers from incoming requests that must NOT reach Supabase.
// `host` is included explicitly: CF's fetch() runtime already overrides it based
// on the target URL, but stripping it documents the intent and avoids any edge case
// where the wrong host leaks into a non-standard CF configuration.
const STRIP_REQUEST_HEADERS = new Set([
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
  'host',
]);

export default {
  async fetch(request) {
    const upgrade = request.headers.get('Upgrade');
    if (upgrade?.toLowerCase() === 'websocket') {
      return proxyWebSocket(request);
    }
    return proxyHttp(request);
  },
};

// ─── HTTP proxy ────────────────────────────────────────────────────────────────

async function proxyHttp(request) {
  const url    = new URL(request.url);
  const target = SUPABASE_HTTPS + url.pathname + url.search;

  const headers = forwardHeaders(request.headers);

  // If client did not send Accept-Encoding, explicitly request identity so CF
  // does not inject its own compression preference on the subrequest.
  if (!headers.has('accept-encoding')) {
    headers.set('accept-encoding', 'identity');
  }

  // Storage signed-URL requests redirect to S3/R2 CDN. Follow those server-side
  // so the Worker returns the file content directly (mobile WebViews may not have
  // CORS access to the CDN origin).
  //
  // Auth and all other paths use 'manual': Supabase /auth/v1/authorize returns a
  // 302 to accounts.google.com. With 'follow' the Worker fetches Google's HTML
  // server-side and serves it under db.tafsirkurd.com, breaking Google's CSP and
  // CORS checks. With 'manual' the 302 is forwarded to the browser unchanged so
  // the browser navigates to accounts.google.com with the correct origin.
  const redirectMode = url.pathname.startsWith('/storage/') ? 'follow' : 'manual';

  const upstream = await fetch(target, {
    method:   request.method,
    headers,
    body:     request.body,
    redirect: redirectMode,
  });

  // upstream.body is a ReadableStream — piped directly, never buffered.
  // For redirect responses (status 3xx) upstream.body is null; that is correct —
  // the browser receives the empty-body 302 with Location header and follows it.
  return new Response(upstream.body, {
    status:     upstream.status,
    statusText: upstream.statusText,
    headers:    upstream.headers,
  });
}

// ─── WebSocket proxy (Supabase Realtime) ──────────────────────────────────────

async function proxyWebSocket(request) {
  const url    = new URL(request.url);
  const target = SUPABASE_WSS + url.pathname + url.search;

  // CF Workers requires new WebSocket() for OUTBOUND connections.
  // fetch() with Upgrade:websocket only works for INBOUND (client→Worker).
  // new WebSocket() is the correct CF Workers client WebSocket API.
  const clientProto = request.headers.get('sec-websocket-protocol');
  const subprotocols = clientProto ? clientProto.split(',').map(s => s.trim()) : [];
  const backend = subprotocols.length
    ? new WebSocket(target, subprotocols)
    : new WebSocket(target);

  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();

  // Queue messages that arrive before the backend is open
  const pendingToBackend = [];

  // Pipe: client → backend
  server.addEventListener('message', ({ data }) => {
    if (backend.readyState === WebSocket.OPEN) {
      try { backend.send(data); } catch {}
    } else {
      pendingToBackend.push(data);
    }
  });

  backend.addEventListener('open', () => {
    while (pendingToBackend.length) {
      try { backend.send(pendingToBackend.shift()); } catch {}
    }
  });

  // Pipe: backend → client
  backend.addEventListener('message', ({ data }) => {
    try { server.send(data); } catch {}
  });

  server.addEventListener('close',  ({ code, reason }) => { try { backend.close(code, reason); } catch {} });
  backend.addEventListener('close', ({ code, reason }) => { try { server.close(code, reason);  } catch {} });
  server.addEventListener('error',  () => { try { backend.close(1011); } catch {} });
  backend.addEventListener('error', () => { try { server.close(1011);  } catch {} });

  // Echo the first requested subprotocol so Safari iOS does not drop the connection.
  // (Supabase Realtime uses "phoenix"; Safari closes if the 101 does not echo it.)
  const upgradeHeaders = new Headers();
  if (clientProto) upgradeHeaders.set('sec-websocket-protocol', subprotocols[0]);

  return new Response(null, { status: 101, webSocket: client, headers: upgradeHeaders });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function forwardHeaders(incoming) {
  const out = new Headers();
  for (const [k, v] of incoming) {
    if (!STRIP_REQUEST_HEADERS.has(k.toLowerCase())) {
      out.set(k, v);
    }
  }
  return out;
}
