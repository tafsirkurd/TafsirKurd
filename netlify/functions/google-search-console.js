/**
 * Google Search Console Data Fetcher
 * Fetches search analytics data from Google Search Console API
 */

const { google } = require('googleapis');

exports.handler = async (event, context) => {
  // Enable CORS and minimal caching
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, s-maxage=60' // Cache for 1 minute only
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

    // Try without dimensions first to get summary data
    const summaryResponse = await searchconsole.searchanalytics.query({
      siteUrl: 'https://tafsirkurd.com/',
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        rowLimit: 1
      }
    });

    console.log('Summary Response (no dimensions):', JSON.stringify(summaryResponse.data, null, 2));

    // Fetch search analytics data with query dimension
    const response = await searchconsole.searchanalytics.query({
      siteUrl: 'https://tafsirkurd.com/',
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query'],
        rowLimit: 100
      }
    });

    // Log the API response for debugging
    console.log('Search Console API Response:', JSON.stringify(response.data, null, 2));
    console.log('Number of rows returned:', response.data.rows ? response.data.rows.length : 0);

    // Process the data
    const rows = response.data.rows || [];

    // Format query data (already aggregated by query dimension)
    const queries = rows.map(row => ({
      query: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr ? (row.ctr * 100).toFixed(2) : '0.00',
      position: row.position ? row.position.toFixed(1) : '0.0'
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

    // Get summary stats from the summary response (no dimensions)
    const summaryRow = summaryResponse.data.rows && summaryResponse.data.rows.length > 0
      ? summaryResponse.data.rows[0]
      : null;

    const totalClicks = summaryRow ? summaryRow.clicks : 0;
    const totalImpressions = summaryRow ? summaryRow.impressions : 0;
    const avgCTR = summaryRow ? (summaryRow.ctr * 100).toFixed(2) : '0.00';
    const avgPosition = summaryRow ? summaryRow.position.toFixed(1) : '0.0';

    // Check if there's actually any data
    if (!summaryRow || totalImpressions === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          noData: true,
          message: 'No search data available yet. This is normal for newly verified sites. Data usually appears within 24-48 hours after verification.',
          data: {
            summary: {
              totalClicks: 0,
              totalImpressions: 0,
              avgCTR: '0.00',
              avgPosition: '0.0',
              dateRange: {
                start: formatDate(startDate),
                end: formatDate(endDate)
              }
            },
            queries: [],
            pages: []
          }
        })
      };
    }

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
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);

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
