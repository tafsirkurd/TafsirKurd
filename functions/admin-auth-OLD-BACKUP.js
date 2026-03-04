// This file is a disabled backup — do not use.
// Kept for reference only. All requests are rejected.
export async function onRequest() {
    return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}
