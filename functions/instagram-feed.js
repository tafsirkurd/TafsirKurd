// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/instagram-feed.js

const https = require('https');

export async function onRequest(context) {
    const { request, env } = context;
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const username = 'tafsirkurd';

    // Use RSS bridge service (free, no API key needed)
    const posts = await fetchInstagramViaRSS(username);

    if (posts && posts.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          posts: posts,
          cached_at: new Date().toISOString()
        })
      };
    }

    throw new Error('No posts found');

  } catch (error) {
    console.error('Instagram fetch error:', error);

    // Return fallback - let client use Supabase
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        use_supabase: true,
        posts: []
      })
    };
  }
};

async function fetchInstagramViaRSS(username) {
  return new Promise((resolve, reject) => {
    // Use RSS.app bridge service
    const options = {
      hostname: 'rss.app',
      path: `/feeds/v1.1/_${Buffer.from(`https://www.instagram.com/${username}/`).toString('base64')}.rss`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Parse RSS XML
          const items = [];
          const itemMatches = data.matchAll(/<item>(.*?)<\/item>/gs);

          for (const match of itemMatches) {
            const item = match[1];
            const linkMatch = item.match(/<link>(.*?)<\/link>/);

            if (linkMatch && items.length < 3) {
              const url = linkMatch[1].trim();
              const reelMatch = url.match(/\/reel\/([A-Za-z0-9_-]+)/);
              const postMatch = url.match(/\/p\/([A-Za-z0-9_-]+)/);

              if (reelMatch || postMatch) {
                items.push({
                  url: url,
                  shortcode: (reelMatch || postMatch)[1],
                  type: reelMatch ? 'reel' : 'p'
                });
              }
            }
          }

          if (items.length > 0) {
            resolve(items);
          } else {
            reject(new Error('No items found in RSS'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}
