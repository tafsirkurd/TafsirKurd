// Auto-notify — thin wrapper around admin-notifications-api auto_notify_content
// Call this endpoint every 15 minutes from an external cron service.
// Authorization: Bearer {CRON_SECRET}

export async function onRequest(context) {
    const { request, env } = context;

    const auth = request.headers.get('Authorization') || '';
    const secret = env.NOTIF_CRON_SECRET || env.CRON_SECRET;
    if (!secret || auth !== `Bearer ${secret}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const baseUrl = new URL(request.url).origin;
    const res = await fetch(`${baseUrl}/admin-notifications-api`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': auth,
        },
        body: JSON.stringify({ action: 'auto_notify_content' }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
    });
}
