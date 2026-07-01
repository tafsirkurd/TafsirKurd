// Admin GitHub Commits API — proxy GitHub API for private repo
// Requires env.GITHUB_TOKEN (fine-grained PAT with Contents: read on tafsirkurd/TafsirKurd)
// and env.SUPABASE_URL + env.SUPABASE_SERVICE_ROLE_KEY for auth validation.
import { createClient } from '@supabase/supabase-js';

const CORS = {
    'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
};

// Human-readable labels for GitHub API error codes.
const GH_STATUS_LABELS = {
    401: 'GitHub token is invalid or has expired. Regenerate the GITHUB_TOKEN secret in Cloudflare Pages.',
    403: 'GitHub token lacks permission to read this repository. Verify the fine-grained PAT has Contents: Read.',
    404: 'Repository not found. Confirm the repo name and that the token owner has access.',
    429: 'GitHub API rate limit exceeded. Wait a minute and retry.',
    422: 'GitHub API rejected the request parameters.',
};

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const token = ((request.headers.get('Authorization') || '').replace('Bearer ', '') || body.token || '').trim();
    if (!token) return json({ error: 'No token' }, 401);

    const { data: session } = await supabase
        .from('admin_sessions')
        .select('user_id, admin_users(role, is_active)')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (!session?.admin_users?.is_active) return json({ error: 'Unauthorized' }, 403);

    if (!env.GITHUB_TOKEN) return json({ error: 'GITHUB_TOKEN not configured in Cloudflare Pages environment secrets.' }, 500);

    const perPage = Math.min(parseInt(body.per_page) || 20, 50);
    const ref     = 'main';
    const ghUrl   = `https://api.github.com/repos/tafsirkurd/TafsirKurd/commits?per_page=${perPage}&sha=${ref}`;

    let ghRes;
    try {
        ghRes = await fetch(ghUrl, {
            headers: {
                'Accept':               'application/vnd.github.v3+json',
                'Authorization':        `Bearer ${env.GITHUB_TOKEN}`,
                'User-Agent':           'TafsirKurd-Admin/1.0',
                'X-GitHub-Api-Version': '2022-11-28',
            }
        });
    } catch (e) {
        return json({ error: 'Network error reaching GitHub API.', detail: String(e) }, 502);
    }

    if (!ghRes.ok) {
        const ghBody = await ghRes.text().catch(() => '');
        let ghMsg;
        try { ghMsg = JSON.parse(ghBody).message || ghBody; } catch { ghMsg = ghBody; }

        const label = GH_STATUS_LABELS[ghRes.status] || `GitHub API returned ${ghRes.status}.`;
        return json({
            error: label,
            github_status: ghRes.status,
            github_message: ghMsg.slice(0, 300),
        }, ghRes.status === 401 || ghRes.status === 403 ? ghRes.status : 502);
    }

    const commits = await ghRes.json();
    return json({ success: true, commits });
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: CORS });
}
