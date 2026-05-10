import { createClient } from '@supabase/supabase-js';

const CORS = {
    'Access-Control-Allow-Origin':  'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type':                 'application/json',
};
const REPO      = 'tafsirkurd/TafsirKurd';
const REPO_FILE = 'ios/App/App.xcodeproj/project.pbxproj';

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS')
        return new Response('{}', { status: 200, headers: CORS });

    try {
        return await run(request, env);
    } catch (e) {
        return new Response(
            JSON.stringify({ error: 'crash', detail: String(e) }),
            { status: 500, headers: CORS }
        );
    }
}

async function run(request, env) {
    if (request.method !== 'POST')
        return j({ error: 'POST only' }, 405);

    let body;
    try { body = await request.json(); }
    catch (e) { return j({ error: 'Invalid JSON' }, 400); }

    const token = ((request.headers.get('Authorization') || '').replace('Bearer ', '')).trim();
    if (!token) return j({ error: 'No auth token' }, 401);

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
        return j({ error: 'Supabase env vars missing' }, 500);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: session } = await supabase
        .from('admin_sessions')
        .select('user_id, admin_users(role, is_active)')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (!session || !session.admin_users || !session.admin_users.is_active)
        return j({ error: 'Unauthorized' }, 403);

    if (!env.GITHUB_TOKEN)
        return j({ error: 'GITHUB_TOKEN not set' }, 500);

    const ghH = {
        'Accept':               'application/vnd.github.v3+json',
        'Authorization':        'Bearer ' + env.GITHUB_TOKEN,
        'User-Agent':           'TafsirKurd-Admin/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
    };
    const fileUrl = 'https://api.github.com/repos/' + REPO + '/contents/' + REPO_FILE;

    const fileRes = await fetch(fileUrl, { headers: ghH });
    if (!fileRes.ok) {
        const detail = await fileRes.text().catch(function() { return ''; });
        return j({ error: 'GitHub fetch failed', status: fileRes.status, detail: detail.slice(0, 300) }, 500);
    }

    const fileData = await fileRes.json();
    if (!fileData || !fileData.content)
        return j({ error: 'No content from GitHub', keys: Object.keys(fileData || {}) }, 500);

    const raw   = fileData.content.replace(/\n/g, '');
    const bytes = Uint8Array.from(atob(raw), function(c) { return c.charCodeAt(0); });
    const content = new TextDecoder().decode(bytes);

    const curBuild   = parseInt((content.match(/CURRENT_PROJECT_VERSION\s*=\s*(\d+)/)  || ['','0'])[1]);
    const curVersion =          (content.match(/MARKETING_VERSION\s*=\s*([\d.]+)/)     || ['','1.0.0'])[1];

    if (body.action === 'read')
        return j({ buildNumber: curBuild, marketingVersion: curVersion });

    if (body.action !== 'commit')
        return j({ error: 'Unknown action' }, 400);

    const newBuild   = String(body.buildNumber      || '').trim();
    const newVersion = String(body.marketingVersion || '').trim();

    if (!newBuild || !/^\d+$/.test(newBuild))
        return j({ error: 'Build number must be a positive integer' }, 400);
    if (!newVersion || !/^\d+\.\d+(\.\d+)?$/.test(newVersion))
        return j({ error: 'Marketing version must be X.Y or X.Y.Z' }, 400);
    if (parseInt(newBuild) <= curBuild)
        return j({ error: 'Build number must be greater than ' + curBuild }, 400);

    const updated = content
        .replace(/CURRENT_PROJECT_VERSION\s*=\s*\d+/g,  'CURRENT_PROJECT_VERSION = ' + newBuild)
        .replace(/MARKETING_VERSION\s*=\s*[\d.]+/g,      'MARKETING_VERSION = ' + newVersion);

    const enc = new TextEncoder().encode(updated);
    let bin = '';
    for (let i = 0; i < enc.length; i++) bin += String.fromCharCode(enc[i]);
    const encoded = btoa(bin);

    const msg = 'bump(ios): ' + curVersion + ' -> ' + newVersion + ' build ' + curBuild + ' -> ' + newBuild;

    const putRes = await fetch(fileUrl, {
        method:  'PUT',
        headers: Object.assign({}, ghH, { 'Content-Type': 'application/json' }),
        body:    JSON.stringify({
            message:   msg,
            content:   encoded,
            sha:       fileData.sha,
            branch:    'main',
            committer: { name: 'TafsirKurd Admin', email: 'admin@tafsirkurd.com' },
        }),
    });

    if (!putRes.ok) {
        const detail = await putRes.text().catch(function() { return ''; });
        return j({ error: 'GitHub write failed', status: putRes.status, detail: detail.slice(0, 300) }, 500);
    }

    let putData = {};
    try { putData = await putRes.json(); } catch (e) { /* ignore */ }

    return j({
        success:          true,
        sha:              (putData.commit && putData.commit.sha) ? putData.commit.sha.slice(0, 7) : '?',
        message:          msg,
        buildNumber:      parseInt(newBuild),
        marketingVersion: newVersion,
    });
}

function j(data, status) {
    return new Response(JSON.stringify(data), { status: status || 200, headers: CORS });
}
