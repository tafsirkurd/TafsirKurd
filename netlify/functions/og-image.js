// Dynamic Open Graph Image Generator for TafsirKurd
// Generates social card images on-the-fly

exports.handler = async (event, context) => {
  try {
    const { lang = 'ku', page = 'home', theme = 'light' } = event.queryStringParameters || {};

    // Define content based on page
    const content = {
      home: {
        title: 'تەفسیر کورد',
        titleEn: 'Tafsir Kurd',
        subtitle: 'شرۆڤەکردنا قورئانا پیرۆز ب زمانێ کوردی',
        subtitleEn: 'Kurdish Quran Tafsir Online',
        url: 'tafsirkurd.com'
      },
      quran: {
        title: 'قورئانا پیرۆز',
        titleEn: 'Holy Quran',
        subtitle: 'وەرگێڕان و تەفسیر ب زمانی کوردی (بادینی)',
        subtitleEn: 'Kurdish Translation & Tafsir',
        url: 'tafsirkurd.com/quran'
      }
    };

    const data = content[page] || content.home;

    // Generate SVG social card
    const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a365d;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2d4a7c;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="1200" height="630" fill="url(#grad)"/>

      <!-- Decorative pattern -->
      <circle cx="100" cy="100" r="150" fill="#ffffff" opacity="0.05"/>
      <circle cx="1100" cy="530" r="150" fill="#ffffff" opacity="0.05"/>

      <!-- Logo/Brand -->
      <g filter="url(#shadow)">
        <rect x="80" y="80" width="120" height="120" rx="20" fill="#ffffff" opacity="0.1"/>
        <text x="140" y="155" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle">تک</text>
      </g>

      <!-- Main Title (Kurdish) -->
      <text x="600" y="280" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#ffffff" text-anchor="middle" filter="url(#shadow)">
        ${data.title}
      </text>

      <!-- English Title -->
      <text x="600" y="340" font-family="Arial, sans-serif" font-size="48" fill="#e2e8f0" text-anchor="middle">
        ${data.titleEn}
      </text>

      <!-- Subtitle (Kurdish) -->
      <text x="600" y="420" font-family="Arial, sans-serif" font-size="32" fill="#cbd5e0" text-anchor="middle">
        ${data.subtitle}
      </text>

      <!-- Subtitle (English) -->
      <text x="600" y="470" font-family="Arial, sans-serif" font-size="28" fill="#a0aec0" text-anchor="middle">
        ${data.subtitleEn}
      </text>

      <!-- URL -->
      <text x="600" y="550" font-family="Arial, sans-serif" font-size="24" fill="#90cdf4" text-anchor="middle">
        ${data.url}
      </text>
    </svg>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      },
      body: svg
    };
  } catch (error) {
    console.error('Error generating OG image:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate image' })
    };
  }
};
