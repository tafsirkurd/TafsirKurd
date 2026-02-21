const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = 'C:/TafsirKurd/src';
const KURDISH = /[\u0600-\u06FF]/;

// Pages to scan (filename -> page slug)
const htmlFiles = fs.readdirSync(SRC)
  .filter(f => f.endsWith('.html') && !f.startsWith('admin-'))
  .map(f => ({ file: path.join(SRC, f), page: f.replace('.html','') }));
// Also scan app
htmlFiles.push({ file: path.join(SRC, 'app/index.html'), page: 'android' });

const allEntries = [];   // { key_id, kurdish_text, page, category, hasDataT }
const missingDataT = []; // elements that need data-t added: { file, selector, text, key_id }

function slugify(text) {
  // Generate a short readable key from Kurdish text
  return text.trim().replace(/[\u0600-\u06FF]/g, c => c).substring(0, 30)
    .replace(/\s+/g, '_').replace(/[^a-zA-Z0-9\u0600-\u06FF_]/g, '').substring(0,25);
}

function getCategory(el) {
  const tag = el.tagName.toLowerCase();
  const cls = el.className || '';
  if (tag === 'button' || cls.includes('btn')) return 'ui';
  if (tag === 'a' || tag === 'nav' || cls.includes('nav')) return 'nav';
  if (['h1','h2','h3','h4','h5','h6'].includes(tag)) return 'content';
  if (tag === 'p') return 'content';
  if (tag === 'label' || tag === 'span' || tag === 'input') return 'ui';
  return 'general';
}

const keyCounters = {};
function makeKey(page, tag, text) {
  const base = page + '_' + tag;
  keyCounters[base] = (keyCounters[base] || 0) + 1;
  return base + '_' + keyCounters[base];
}

for (const { file, page } of htmlFiles) {
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Skip script/style content
  doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());

  // Walk all elements
  const elements = doc.querySelectorAll('*');
  const fileEdits = []; // { original, replacement } for this file

  elements.forEach(el => {
    // Only look at leaf or near-leaf text nodes
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === 3) // TEXT_NODE
      .map(n => n.textContent.trim())
      .filter(t => t.length >= 2 && KURDISH.test(t))
      .join(' ').trim();

    if (!directText) return;

    const dataT = el.getAttribute('data-t');
    const tag = el.tagName.toLowerCase();
    const category = getCategory(el);

    if (dataT) {
      // Already has data-t — just record it
      allEntries.push({
        key_id: dataT,
        kurdish_text: directText,
        page,
        category,
        hasDataT: true
      });
    } else {
      // No data-t — generate key, record as missing
      const key = makeKey(page, tag, directText);
      allEntries.push({
        key_id: key,
        kurdish_text: directText,
        page,
        category,
        hasDataT: false
      });
      missingDataT.push({ file, key_id: key, text: directText, tag });
    }
  });
}

// Deduplicate by key_id (data-t wins)
const byKey = {};
allEntries.sort((a,b) => (a.hasDataT ? 0:1) - (b.hasDataT ? 0:1));
for (const e of allEntries) {
  if (!byKey[e.key_id]) byKey[e.key_id] = e;
}

// Deduplicate by text (keep data-t source)
const byText = {};
const toRemove = new Set();
for (const [key, e] of Object.entries(byKey)) {
  const text = e.kurdish_text.trim();
  if (byText[text]) {
    const ex = byText[text];
    if (ex.hasDataT && !e.hasDataT) toRemove.add(key);
    else if (e.hasDataT && !ex.hasDataT) { toRemove.add(ex.key_id); byText[text] = e; }
  } else byText[text] = e;
}
for (const k of toRemove) delete byKey[k];

const final = Object.values(byKey).sort((a,b) => {
  if (a.page < b.page) return -1;
  if (a.page > b.page) return 1;
  return a.key_id.localeCompare(b.key_id);
});

console.log('Total entries: ' + final.length);
const withDataT = final.filter(e => e.hasDataT).length;
const withoutDataT = final.filter(e => !e.hasDataT).length;
console.log('  With data-t: ' + withDataT);
console.log('  Without data-t (need adding): ' + withoutDataT);

const pageCounts = {};
final.forEach(e => { pageCounts[e.page] = (pageCounts[e.page]||0)+1; });
Object.entries(pageCounts).sort((a,b)=>b[1]-a[1]).forEach(([p,c]) => console.log('  '+p+': '+c));

fs.writeFileSync('C:/TafsirKurd/scripts/scan-results.json', JSON.stringify(final, null, 2));
console.log('scan-results.json saved');
