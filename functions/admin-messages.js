// Redirect /admin-messages to /admin-messages.html
export async function onRequest(context) {
    const { request } = context;

    // For any request to /admin-messages, redirect to the HTML page
    return Response.redirect(new URL('/admin-messages.html', request.url).href, 302);
}
