/**
 * Prayer Times Proxy — amozhgary.tv
 * Fetches and parses the official Kurdistan prayer timetable.
 *
 * GET /prayer-kurd?city=Duhok&month=2&year=2026
 * Returns: { city, year, month, days: { "25": { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, hijri } } }
 *
 * Times are returned in 24h format (amozhgary.tv serves 12h without AM/PM).
 * Hijri date is the raw Kurdish string e.g. "25ی شعبان 1447".
 */

const CITY_KURDISH = {
  Duhok:        'دهۆک',
  Erbil:        'هەولێر',
  Sulaymaniyah: 'سلێمانی',
  Zakho:        'زاخۆ'
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  const url   = new URL(request.url);
  const city  = url.searchParams.get('city');
  const month = parseInt(url.searchParams.get('month'));
  const year  = parseInt(url.searchParams.get('year'));

  const kurdishName = CITY_KURDISH[city];
  if (!kurdishName || !month || !year || month < 1 || month > 12) {
    return jsonResp({ error: 'city must be Duhok/Erbil/Sulaymaniyah/Zakho; month 1-12; year required' }, 400);
  }

  const pageUrl = 'https://amozhgary.tv/bang/' + encodeURIComponent(kurdishName) + '?month=' + month;

  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TafsirKurd/1.0)' }
    });
    if (!res.ok) throw new Error('upstream HTTP ' + res.status);
    const html = await res.text();
    const days = parseMonthlyTimes(html);
    if (Object.keys(days).length === 0) throw new Error('parse returned no days');
    return jsonResp({ city, year, month, days });
  } catch (e) {
    return jsonResp({ error: e.message }, 502);
  }
}

function parseMonthlyTimes(html) {
  const days = {};

  // Each rendered row:
  //   <div class="ps-4">DAY_NAME<br/>HH_DAYی HIJRI_MONTH HIJRI_YEAR</div>
  //   <div class="hidden md:table-cell text-sm">DD - KURDISH_MONTH - YYYY</div>
  //   <div>FAJR</div><div>SUNRISE</div><div>DHUHR</div>
  //   <div>ASR</div><div>MAGHRIB</div><div>ISHA</div>

  const datePattern = /(\d{1,2})\s*-\s*[\u0600-\u06FF][^<\-]+-\s*\d{4}/g;
  let m;

  while ((m = datePattern.exec(html)) !== null) {
    const gregDay = parseInt(m[1]);
    const pos     = m.index;

    // Hijri: look 400 chars before the Gregorian date cell
    const before     = html.slice(Math.max(0, pos - 400), pos);
    const hijriMatch = before.match(/(\d{1,2})ی\s*([\u0600-\u06FF]+)\s*(\d{4})/);
    const hijriStr   = hijriMatch
      ? hijriMatch[1] + 'ی ' + hijriMatch[2] + ' ' + hijriMatch[3]
      : null;

    // Times: look 600 chars after the Gregorian date cell
    const after    = html.slice(pos + m[0].length, pos + m[0].length + 600);
    const rawTimes = [];
    const timeRe   = />(\d{2}:\d{2})</g;
    let   tm;
    while ((tm = timeRe.exec(after)) !== null && rawTimes.length < 6) {
      rawTimes.push(tm[1]);
    }

    if (rawTimes.length === 6) {
      const t = to24h(rawTimes);
      days[gregDay] = { Fajr: t[0], Sunrise: t[1], Dhuhr: t[2], Asr: t[3], Maghrib: t[4], Isha: t[5] };
      if (hijriStr) days[gregDay].hijri = hijriStr;
    }
  }

  return days;
}

/**
 * amozhgary.tv renders Asr/Maghrib/Isha in 12h without AM/PM.
 * E.g. Asr "03:37" = 15:37.  Detect by reversal: if a time < previous prayer, add 12h.
 */
function to24h(rawTimes) {
  const result   = [];
  let   prevMins = 0;
  for (const t of rawTimes) {
    const parts = t.split(':');
    let h    = parseInt(parts[0]);
    const mi = parseInt(parts[1]);
    let mins = h * 60 + mi;
    if (h < 12 && mins < prevMins) {
      h    += 12;
      mins += 720;
    }
    prevMins = mins;
    result.push((h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi);
  }
  return result;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control':               status === 200 ? 'public, max-age=3600' : 'no-cache'
    }
  });
}
