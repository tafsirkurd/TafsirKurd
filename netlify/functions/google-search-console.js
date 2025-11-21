/**
 * Google Search Console Data Fetcher
 * Fetches search analytics data from Google Search Console API
 */

const { google } = require('googleapis');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get OAuth credentials from environment variables
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          needsSetup: true,
          message: 'Google Search Console API not configured. Please set up OAuth credentials.',
          setupInstructions: 'See GOOGLE_SEARCH_CONSOLE_SETUP.md for instructions'
        })
      };
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      'https://tafsirkurd.com'
    );

    oauth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN
    });

    // Initialize Search Console API
    const searchconsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client
    });

    // Calculate date range (last 28 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    // Fetch search analytics data
    const response = await searchconsole.searchanalytics.query({
      siteUrl: 'https://tafsirkurd.com/',
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query', 'page', 'country', 'device'],
        rowLimit: 100,
        dimensionFilterGroups: []
      }
    });

    // Process the data
    const rows = response.data.rows || [];

    // Aggregate by query
    const queryMap = new Map();
    rows.forEach(row => {
      const query = row.keys[0];
      if (!queryMap.has(query)) {
        queryMap.set(query, {
          query: query,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          position: 0,
          count: 0
        });
      }
      const data = queryMap.get(query);
      data.clicks += row.clicks || 0;
      data.impressions += row.impressions || 0;
      data.position += row.position || 0;
      data.count += 1;
    });

    // Calculate averages and format data
    const queries = Array.from(queryMap.values()).map(item => ({
      query: item.query,
      clicks: item.clicks,
      impressions: item.impressions,
      ctr: item.clicks > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) : '0.00',
      position: (item.position / item.count).toFixed(1)
    })).sort((a, b) => b.impressions - a.impressions);

    // Get top pages
    const pageResponse = await searchconsole.searchanalytics.query({
      siteUrl: 'https://tafsirkurd.com/',
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['page'],
        rowLimit: 20
      }
    });

    const pages = (pageResponse.data.rows || []).map(row => ({
      page: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.clicks > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : '0.00',
      position: (row.position || 0).toFixed(1)
    }));

    // Get summary stats
    const totalClicks = queries.reduce((sum, q) => sum + q.clicks, 0);
    const totalImpressions = queries.reduce((sum, q) => sum + q.impressions, 0);
    const avgCTR = totalClicks > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
    const avgPosition = queries.length > 0 ?
      (queries.reduce((sum, q) => sum + parseFloat(q.position), 0) / queries.length).toFixed(1) : '0.0';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          summary: {
            totalClicks,
            totalImpressions,
            avgCTR,
            avgPosition,
            dateRange: {
              start: formatDate(startDate),
              end: formatDate(endDate)
            }
          },
          queries: queries.slice(0, 50), // Top 50 queries
          pages: pages.slice(0, 20), // Top 20 pages
          lastUpdated: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Search Console API Error:', error);

    // Check if it's an authentication error
    if (error.message && error.message.includes('invalid_grant')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          needsReauth: true,
          message: 'Google authentication expired. Please re-authenticate.',
          error: 'Authentication token expired'
        })
      };
    }

    // Check if no data available yet
    if (error.code === 400 || (error.message && error.message.includes('No data'))) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          noData: true,
          message: 'No search data available yet. This is normal for newly verified sites. Data usually appears within 24-48 hours.',
          data: {
            summary: {
              totalClicks: 0,
              totalImpressions: 0,
              avgCTR: '0.00',
              avgPosition: '0.0',
              dateRange: {
                start: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              }
            },
            queries: [],
            pages: []
          }
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to fetch Search Console data',
        error: error.message
      })
    };
  }
};
