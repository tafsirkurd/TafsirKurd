const https = require('https');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const username = 'tafsirkurd'; // Your Instagram username

    // Fetch Instagram profile page
    const instagramData = await fetchInstagramProfile(username);

    if (!instagramData || !instagramData.edge_owner_to_timeline_media) {
      throw new Error('Failed to fetch Instagram data');
    }

    // Get latest 3 posts
    const posts = instagramData.edge_owner_to_timeline_media.edges
      .slice(0, 3)
      .map(edge => {
        const node = edge.node;
        const shortcode = node.shortcode;

        // Determine if it's a reel or regular post
        const isReel = node.is_video && node.product_type === 'clips';
        const postType = isReel ? 'reel' : 'p';

        return {
          url: `https://www.instagram.com/${postType}/${shortcode}/`,
          shortcode: shortcode,
          type: postType,
          thumbnail: node.thumbnail_src || node.display_url,
          caption: node.edge_media_to_caption.edges[0]?.node.text || '',
          likes: node.edge_liked_by?.count || 0,
          comments: node.edge_media_to_comment?.count || 0,
          timestamp: node.taken_at_timestamp,
          isVideo: node.is_video
        };
      });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        posts: posts,
        cached_at: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Instagram fetch error:', error);

    // Return fallback data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        posts: [
          {
            url: "https://www.instagram.com/reel/DFOAsUFo653/",
            shortcode: "DFOAsUFo653",
            type: "reel"
          },
          {
            url: "https://www.instagram.com/reel/DCxIb3sI7gm/",
            shortcode: "DCxIb3sI7gm",
            type: "reel"
          },
          {
            url: "https://www.instagram.com/reel/DExsA5lIBVl/",
            shortcode: "DExsA5lIBVl",
            type: "reel"
          }
        ]
      })
    };
  }
};

function fetchInstagramProfile(username) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.instagram.com',
      path: `/${username}/?__a=1&__d=dis`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Try to parse JSON response
          const jsonData = JSON.parse(data);

          if (jsonData.graphql && jsonData.graphql.user) {
            resolve(jsonData.graphql.user);
          } else if (jsonData.data && jsonData.data.user) {
            resolve(jsonData.data.user);
          } else {
            // Try to extract JSON from HTML
            const scriptMatch = data.match(/window\._sharedData\s*=\s*({.+?});/);
            if (scriptMatch) {
              const sharedData = JSON.parse(scriptMatch[1]);
              const userPage = sharedData.entry_data?.ProfilePage?.[0];
              if (userPage?.graphql?.user) {
                resolve(userPage.graphql.user);
              } else {
                reject(new Error('Could not find user data in shared data'));
              }
            } else {
              reject(new Error('Could not parse Instagram response'));
            }
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}
