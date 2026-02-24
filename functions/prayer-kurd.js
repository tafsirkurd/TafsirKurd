/**
 * Prayer Times Proxy — amozhgary.tv (debug v2)
 */

const CITY_KURDISH = {
  Duhok:        '\u062f\u0647\u06c6\u06a9',
  Erbil:        '\u0647\u06d5\u0648\u0644\u06ce\u0631',
  Sulaymaniyah: '\u0633\u0644\u06ce\u0645\u0627\u0646\u06cc',
  Zakho:        '\u0632\u0627\u062e\u06c6'
};

export async function onRequest(context) {
  try {
    const { request } = context;

    if (request.method === 'OPTIONS') {
      return resp(null, 204);
    }

    const url   = new URL(request.url);
    const city  = url.searchParams.get('city')  || '';
    const month = parseInt(url.searchParams.get('month') || '0');
    const year  = parseInt(url.searchParams.get('year')  || '0');
    const debug = url.searchParams.get('debug') === '1';

    const kurdishName = CITY_KURDISH[city];
    if (!kurdishName || month < 1 || month > 12 || !year) {
      return resp({ error: 'Invalid params' }, 400);
    }

    const pageUrl = 'https://amozhgary.tv/bang/' + encodeURIComponent(kurdishName) + '?month=' + month;

    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' }
    });

    if (!res.ok) {
      return resp({ error: 'upstream ' + res.status }, 502);
    }

    const html = await res.text();

    if (debug) {
      // Find the first time match and show 800 chars around it
      const idx = html.indexOf('>05:');
      const sample = idx >= 0 ? html.slice(Math.max(0, idx - 400), idx + 400) : 'NOT FOUND';
      return resp({ htmlSize: html.length, sample });
    }

    const days = parseMonthlyTimes(html);
    return resp({ city, year, month, days });

  } catch (e) {
    return resp({ error: String(e) }, 500);
  }
}

function parseMonthlyTimes(html) {
  const days = {};
  const dateRe = /(\d{1,2})\s*-\s*[\u0600-\u06FF][^\-<]+-\s*\d{4}/g;
  let m;
  while ((m = dateRe.exec(html)) !== null) {
    const gregDay = parseInt(m[1]);
    const pos     = m.index;
    const after   = html.slice(pos + m[0].length, pos + m[0].length + 600);
    const raw     = [];
    const tRe     = />(\d{2}:\d{2})</g;
    let   tm;
    while ((tm = tRe.exec(after)) !== null && raw.length < 6) {
      raw.push(tm[1]);
    }
    if (raw.length === 6) {
      const t = to24h(raw);
      const before = html.slice(Math.max(0, pos - 400), pos);
      const hm = before.match(/(\d{1,2})\u06CC\s*([\u0600-\u06FF]+)\s*(\d{4})/);
      days[gregDay] = { Fajr: t[0], Sunrise: t[1], Dhuhr: t[2], Asr: t[3], Maghrib: t[4], Isha: t[5] };
      if (hm) days[gregDay].hijri = hm[1] + '\u06CC ' + hm[2] + ' ' + hm[3];
    }
  }
  return days;
}

function to24h(times) {
  const out = [];
  let prev = 0;
  for (const t of times) {
    const p = t.split(':');
    let h = parseInt(p[0]);
    const m = parseInt(p[1]);
    let mins = h * 60 + m;
    if (h < 12 && mins < prev) { h += 12; mins += 720; }
    prev = mins;
    out.push((h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m);
  }
  return out;
}

function resp(data, status) {
  return new Response(data == null ? '' : JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
