/**
 * Prayer Times Proxy — amozhgary.tv
 *
 * GET /prayer-kurd?city=Duhok&month=2&year=2026
 * Returns: { city, year, month, days: { "1": { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, hijri } } }
 *
 * HTML structure: table with rows containing Kurdish date "DD - MonthName - YYYY"
 * followed by 6 prayer time cells in HH:MM 24h format.
 *
 * CITY_URL values are the English path segments used by amozhgary.tv.
 * Site switched from Kurdish-encoded paths (%D8%AF%D9%87%DB%86%DA%A9) to
 * plain English names (/bang/Duhok) — updated May 2026.
 */

const CITY_URL = {
  Sulaymaniyah:  'Sulaymaniyah',
  Erbil:         'Erbil',
  Duhok:         'Duhok',
  Kirkuk:        'Kirkuk',
  Halabja:       'Halabja',
  Kfry:          'Kfry',
  Rania:         'Rania',
  Koya:          'Koya',
  Qaladze:       'Qaladze',
  Zakho:         'Zakho',
  Bardarash:     'Bardarash',
  Mosul:         'Mosul',
  Darbandikhan:  'Darbandikhan',
  Kalar:         'Kalar',
  Akre:          'Akre',
  Daquq:         'Daquq',
  Makhmur:       'Makhmur',
  Mandali:       'Mandali',
  Qarahanjir:    'Qarahanjir',
  DuzKhormatou:  'Duz%20Khormatou',
};

export async function onRequest(context) {
  try {
    const { request } = context;
    if (request.method === 'OPTIONS') return resp(null, 204);

    const url   = new URL(request.url);
    const city  = url.searchParams.get('city')  || '';
    const month = parseInt(url.searchParams.get('month') || '0');
    const year  = parseInt(url.searchParams.get('year')  || '0');

    const cityPath = CITY_URL[city];
    if (!cityPath || month < 1 || month > 12 || !year) {
      return resp({ error: 'Invalid params' }, 400);
    }

    // cityPath is already percent-encoded — do NOT wrap with encodeURIComponent
    const pageUrl = 'https://amozhgary.tv/bang/' + cityPath + '?month=' + month;

    // 8-second timeout — fail fast so the app's Aladhan fallback kicks in quickly
    // rather than waiting Cloudflare's default 30s per-fetch limit.
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 8000);
    let res;
    try {
      res = await fetch(pageUrl, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TafsirKurd/1.0)' }
      });
    } finally {
      clearTimeout(tid);
    }
    if (!res.ok) return resp({ error: 'upstream ' + res.status }, 502);

    const html = await res.text();
    const days = parseMonthlyTimes(html);
    return resp({ city, year, month, days });

  } catch (e) {
    const isTimeout = e && (e.name === 'AbortError' || String(e).includes('AbortError'));
    return resp({ error: isTimeout ? 'upstream-timeout' : String(e) }, 502);
  }
}

function parseMonthlyTimes(html) {
  const days = {};

  // Match: "DD - KurdishMonth - YYYY" (inside <span> in the hidden Gregorian date cell)
  const dateRe = /(\d{1,2})\s*-\s*[\u0600-\u06FF][^\-<]+-\s*\d{4}/g;
  let m;

  while ((m = dateRe.exec(html)) !== null) {
    const gregDay = parseInt(m[1]);
    const pos     = m.index;

    // Window of 1500 chars — enough to cover 6 prayer <td> cells (~165 chars each)
    // plus the closing tags and Hijri cell (~230 chars) before the times start.
    const after  = html.slice(pos + m[0].length, pos + m[0].length + 1500);
    const raw    = [];
    const tRe    = />(\d{2}:\d{2})</g;
    let tm;
    while ((tm = tRe.exec(after)) !== null && raw.length < 6) raw.push(tm[1]);

    if (raw.length === 6) {
      const t = to24h(raw);
      days[gregDay] = { Fajr: t[0], Sunrise: t[1], Dhuhr: t[2], Asr: t[3], Maghrib: t[4], Isha: t[5] };

      // Hijri: look backward for "DDی MonthName YYYY" within 500 chars before date
      const before = html.slice(Math.max(0, pos - 500), pos);
      const hm = before.match(/(\d{1,2})\u06CC\s*([\u0600-\u06FF]+)\s*(\d{4})/);
      if (hm) days[gregDay].hijri = hm[1] + '\u06CC ' + hm[2] + ' ' + hm[3];
    }
  }

  return days;
}

/**
 * amozhgary.tv renders Asr/Maghrib/Isha in 12h without AM/PM.
 * Detect by sequential reversal: if a time < previous prayer time, it's PM → add 12h.
 */
function to24h(times) {
  const out = []; let prev = 0;
  for (const t of times) {
    const p = t.split(':');
    let h = parseInt(p[0]);
    const mi = parseInt(p[1]);
    let mins = h * 60 + mi;
    if (h < 12 && mins < prev) { h += 12; mins += 720; }
    prev = mins;
    out.push((h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi);
  }
  return out;
}

function resp(data, status) {
  return new Response(data == null ? '' : JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
