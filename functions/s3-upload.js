// Cloudflare Pages Function - S3 Presigned URL Generator
// Generates presigned URLs for direct S3 uploads from admin panel

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
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
        const body = await request.json();
        const { filename, contentType, folder = 'videos' } = body;

        if (!filename || !contentType) {
            return new Response(
                JSON.stringify({ error: 'Missing filename or contentType' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Validate admin token (simple check - you can enhance this)
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

        // Get S3 credentials from environment
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

        // Generate presigned URL
        const presignedUrl = await generatePresignedUrl({
            accessKeyId,
            secretAccessKey,
            bucket,
            region,
            key,
            contentType,
            expiresIn: 3600 // 1 hour
        });

        // CloudFront URL (if configured) or direct S3 URL
        const cloudfrontDomain = env.AWS_CLOUDFRONT_DOMAIN;
        const publicUrl = cloudfrontDomain
            ? `https://${cloudfrontDomain}/${key}`
            : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

        return new Response(
            JSON.stringify({
                success: true,
                uploadUrl: presignedUrl,
                publicUrl: publicUrl,
                key: key
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('S3 upload error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: error.message }),
            { status: 500, headers: corsHeaders }
        );
    }
}

// Verify admin token against your auth system
async function verifyAdminToken(token, env) {
    try {
        // Use Supabase to verify the admin session
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/rest/v1/admin_sessions?token=eq.${token}&is_active=eq.true&select=id,expires_at`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!response.ok) return false;

        const sessions = await response.json();
        if (!sessions || sessions.length === 0) return false;

        // Check if session is not expired
        const session = sessions[0];
        if (new Date(session.expires_at) < new Date()) return false;

        return true;
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}

// Generate AWS S3 presigned URL using AWS Signature Version 4
async function generatePresignedUrl({ accessKeyId, secretAccessKey, bucket, region, key, contentType, expiresIn }) {
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

    // Create canonical request
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

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Hex(canonicalRequest);

    const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        canonicalRequestHash
    ].join('\n');

    // Calculate signature
    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = await hmacHex(signingKey, stringToSign);

    // Add signature to params
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
