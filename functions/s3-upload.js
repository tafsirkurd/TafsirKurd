// Cloudflare Pages Function - R2 Presigned URL Generator
// Generates presigned URLs for direct R2 uploads from admin panel
// R2 is S3-compatible with FREE egress (data transfer)

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: corsHeaders }
        );
    }

    try {
        /* ── Detect proxy-upload mode (FormData) vs presign mode (JSON) ── */
        const ct = request.headers.get('Content-Type') || '';
        if (ct.includes('multipart/form-data')) {
            return await handleProxyUpload(request, env, corsHeaders);
        }

        const body = await request.json();
        const { filename, contentType, folder = 'videos', bucket: bucketOverride } = body;

        if (!filename || !contentType) {
            return new Response(
                JSON.stringify({ error: 'Missing filename or contentType' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Validate admin token
        const adminToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!adminToken) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: corsHeaders }
            );
        }

        // Verify admin token with your auth system
        const isValidAdmin = await verifyAdminToken(adminToken, env);
        if (!isValidAdmin) {
            return new Response(
                JSON.stringify({ error: 'Invalid admin token' }),
                { status: 401, headers: corsHeaders }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `${folder}/${timestamp}-${sanitizedFilename}`;

        // Check if using R2 or S3
        const useR2 = env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY;

        let presignedUrl, publicUrl;

        if (useR2) {
            // Cloudflare R2 configuration
            const accessKeyId = env.R2_ACCESS_KEY_ID;
            const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
            const accountId = env.CF_ACCOUNT_ID;
            const bucket = bucketOverride || env.R2_BUCKET || 'tafsirkurd-videos';
            /* Each R2 bucket has its own r2.dev public subdomain */
            const publicDomain = bucket === 'tafsirkurd-books'
                ? (env.R2_BOOKS_PUBLIC_DOMAIN || env.R2_PUBLIC_DOMAIN)
                : env.R2_PUBLIC_DOMAIN;

            if (!accessKeyId || !secretAccessKey || !accountId) {
                console.error('Missing R2 credentials');
                return new Response(
                    JSON.stringify({ error: 'Server configuration error - R2 credentials missing' }),
                    { status: 500, headers: corsHeaders }
                );
            }

            // Generate presigned URL for R2
            presignedUrl = await generateR2PresignedUrl({
                accessKeyId,
                secretAccessKey,
                accountId,
                bucket,
                key,
                contentType,
                expiresIn: 3600
            });

            // Public URL - use custom domain if configured, otherwise use r2.dev
            publicUrl = publicDomain
                ? `https://${publicDomain}/${key}`
                : `https://pub-${accountId}.r2.dev/${bucket}/${key}`;

        } else {
            // Fallback to AWS S3
            const accessKeyId = env.AWS_ACCESS_KEY_ID;
            const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
            const bucket = env.AWS_S3_BUCKET;
            const region = env.AWS_S3_REGION || 'eu-north-1';

            if (!accessKeyId || !secretAccessKey || !bucket) {
                console.error('Missing AWS credentials');
                return new Response(
                    JSON.stringify({ error: 'Server configuration error' }),
                    { status: 500, headers: corsHeaders }
                );
            }

            presignedUrl = await generateS3PresignedUrl({
                accessKeyId,
                secretAccessKey,
                bucket,
                region,
                key,
                contentType,
                expiresIn: 3600
            });

            const cloudfrontDomain = env.AWS_CLOUDFRONT_DOMAIN;
            publicUrl = cloudfrontDomain
                ? `https://${cloudfrontDomain}/${key}`
                : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        }

        return new Response(
            JSON.stringify({
                success: true,
                uploadUrl: presignedUrl,
                publicUrl: publicUrl,
                key: key,
                storage: useR2 ? 'r2' : 's3'
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Upload error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}

/* ── Proxy upload: browser sends file to this function, function PUTs to R2 ──
   Avoids CORS issues since the browser never talks to r2.cloudflarestorage.com */
async function handleProxyUpload(request, env, corsHeaders) {
    const adminToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!adminToken) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const isValid = await verifyAdminToken(adminToken, env);
    if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid admin token' }), { status: 401, headers: corsHeaders });
    }

    const formData = await request.formData();
    const file        = formData.get('file');
    const folder      = formData.get('folder') || 'uploads';
    const bucketName  = formData.get('bucket') || env.R2_BUCKET || 'tafsirkurd-videos';

    if (!file || typeof file === 'string') {
        return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: corsHeaders });
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const contentType = file.type || 'application/octet-stream';

    /* Generate presigned PUT URL and execute it server-side */
    const accessKeyId     = env.R2_ACCESS_KEY_ID;
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
    const accountId       = env.CF_ACCOUNT_ID;

    if (!accessKeyId || !secretAccessKey || !accountId) {
        return new Response(JSON.stringify({ error: 'R2 credentials missing' }), { status: 500, headers: corsHeaders });
    }

    const presignedUrl = await generateR2PresignedUrl({
        accessKeyId, secretAccessKey, accountId,
        bucket: bucketName, key, contentType, expiresIn: 300
    });

    const fileBuffer = await file.arrayBuffer();
    const putRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: fileBuffer
    });

    if (!putRes.ok) {
        const errText = await putRes.text();
        console.error('R2 PUT failed:', putRes.status, errText);
        return new Response(JSON.stringify({ error: 'R2 upload failed: ' + putRes.status }), { status: 502, headers: corsHeaders });
    }

    // Files in tafsirkurd-books are served through Pages functions (BOOKS_BUCKET R2 binding).
    // This avoids needing public bucket access and works regardless of env var configuration.
    let publicUrl;
    if (bucketName === 'tafsirkurd-books' && key.startsWith('book-covers/')) {
        publicUrl = `https://tafsirkurd.com/book-cover?key=${encodeURIComponent(key)}`;
    } else if (bucketName === 'tafsirkurd-books' && key.startsWith('pdfs/')) {
        publicUrl = `https://tafsirkurd.com/pdf-proxy?key=${encodeURIComponent(key)}`;
    } else {
        const publicDomain = env.R2_PUBLIC_DOMAIN;
        publicUrl = publicDomain
            ? `https://${publicDomain}/${key}`
            : `https://pub-${accountId}.r2.dev/${key}`;
    }

    return new Response(JSON.stringify({ success: true, publicUrl, key }), { status: 200, headers: corsHeaders });
}

// Verify admin token against your auth system
async function verifyAdminToken(token, env) {
    try {
        const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, '');

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials');
            return false;
        }

        const url = `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&select=id,expires_at,user_id`;

        const response = await fetch(url, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) return false;

        const sessions = await response.json();
        if (!sessions || sessions.length === 0) return false;

        const session = sessions[0];
        if (new Date(session.expires_at) < new Date()) return false;

        return true;
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}

// Generate Cloudflare R2 presigned URL (S3-compatible)
async function generateR2PresignedUrl({ accessKeyId, secretAccessKey, accountId, bucket, key, contentType, expiresIn }) {
    const service = 's3';
    const region = 'auto'; // R2 always uses 'auto' as region
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const endpoint = `https://${host}/${bucket}/${key}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const credential = `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;

    const params = new URLSearchParams({
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': credential,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': expiresIn.toString(),
        'X-Amz-SignedHeaders': 'content-type;host'
    });

    const canonicalUri = `/${bucket}/${key}`;
    const canonicalQueryString = params.toString().split('&').sort().join('&');
    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
    const signedHeaders = 'content-type;host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
        'PUT',
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Hex(canonicalRequest);

    const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        canonicalRequestHash
    ].join('\n');

    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = await hmacHex(signingKey, stringToSign);

    params.set('X-Amz-Signature', signature);

    return `${endpoint}?${params.toString()}`;
}

// Generate AWS S3 presigned URL (fallback)
async function generateS3PresignedUrl({ accessKeyId, secretAccessKey, bucket, region, key, contentType, expiresIn }) {
    const service = 's3';
    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const endpoint = `https://${host}/${key}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const credential = `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;

    const params = new URLSearchParams({
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': credential,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': expiresIn.toString(),
        'X-Amz-SignedHeaders': 'content-type;host'
    });

    const canonicalUri = '/' + key;
    const canonicalQueryString = params.toString().split('&').sort().join('&');
    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
    const signedHeaders = 'content-type;host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
        'PUT',
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Hex(canonicalRequest);

    const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        canonicalRequestHash
    ].join('\n');

    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = await hmacHex(signingKey, stringToSign);

    params.set('X-Amz-Signature', signature);

    return `${endpoint}?${params.toString()}`;
}

// Helper functions for AWS Signature V4
async function sha256Hex(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function hmac(key, message) {
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        typeof key === 'string' ? new TextEncoder().encode(key) : key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
    return new Uint8Array(signature);
}

async function hmacHex(key, message) {
    const sig = await hmac(key, message);
    return Array.from(sig).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(secretKey, dateStamp, region, service) {
    const kDate = await hmac('AWS4' + secretKey, dateStamp);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, service);
    const kSigning = await hmac(kService, 'aws4_request');
    return kSigning;
}
