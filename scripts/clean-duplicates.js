/**
 * Cleans duplicate kurdish_text entries from bulk-translations.js
 * Strategy:
 *   - For each group of keys sharing the same text:
 *     - KEEP: keys actually used in HTML via data-t
 *     - DELETE: keys NOT used in HTML that share text with a kept key
 *     - If NONE used in HTML: keep the last one (most specific), delete the rest
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/TafsirKurd';
const BULK_FILE = path.join(ROOT, 'src/utils/bulk-translations.js');
const SRC_DIR = path.join(ROOT, 'src');

// 1. Load bulk-translations entries
const raw = fs.readFileSync(BULK_FILE, 'utf8');
const entries = [];
const lineRegex = /\{\s*key_id:\s*"([^"]+)",\s*kurdish_text:\s*"([^"]*)",\s*category:\s*"([^"]*)",\s*page:\s*"([^"]*)"\s*\}/g;
let m;
while ((m = lineRegex.exec(raw)) !== null) {
    entries.push({ key_id: m[1], kurdish_text: m[2], category: m[3], page: m[4] });
}
console.log(`Total entries: ${entries.length}`);

// 2. Find all data-t keys used in HTML
const htmlFiles = fs.readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.html') && !f.startsWith('admin-'))
    .map(f => path.join(SRC_DIR, f));

const usedKeys = new Set();
for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const dtRegex = /data-t(?:-placeholder|-title)?="([^"]+)"/g;
    let dm;
    while ((dm = dtRegex.exec(content)) !== null) {
        usedKeys.add(dm[1]);
    }
}
console.log(`data-t keys in HTML: ${usedKeys.size}`);

// 3. Group by kurdish_text
const textGroups = {};
for (const entry of entries) {
    const text = entry.kurdish_text.trim();
    if (!text) continue;
    if (!textGroups[text]) textGroups[text] = [];
    textGroups[text].push(entry);
}

// 4. Decide what to delete
const toDelete = new Set();
let dupGroups = 0;

for (const [text, group] of Object.entries(textGroups)) {
    if (group.length < 2) continue;
    dupGroups++;

    const usedInHtml = group.filter(e => usedKeys.has(e.key_id));
    const notUsed = group.filter(e => !usedKeys.has(e.key_id));

    if (usedInHtml.length > 0) {
        // Delete all not-used-in-HTML ones
        for (const e of notUsed) {
            toDelete.add(e.key_id);
        }
    } else {
        // None used in HTML — keep the last entry (most specific), delete all others
        const keep = group[group.length - 1];
        for (const e of group) {
            if (e.key_id !== keep.key_id) toDelete.add(e.key_id);
        }
    }
}

console.log(`Duplicate groups: ${dupGroups}`);
console.log(`Keys to delete: ${toDelete.size}`);

// 5. Write cleaned bulk-translations.js
const cleaned = entries.filter(e => !toDelete.has(e.key_id));
console.log(`Remaining entries: ${cleaned.length}`);

// Reconstruct file preserving the array wrapper
const header = raw.substring(0, raw.indexOf('[') + 1);
const footer = raw.substring(raw.lastIndexOf(']'));
const body = cleaned.map(e =>
    `    { key_id: "${e.key_id}", kurdish_text: "${e.kurdish_text}", category: "${e.category}", page: "${e.page}" }`
).join(',\n');

const newContent = header + '\n' + body + '\n' + footer;
fs.writeFileSync(BULK_FILE, newContent, 'utf8');
console.log('✓ bulk-translations.js written');

// 6. Write list of keys to delete from Supabase
const deleteList = [...toDelete].sort();
fs.writeFileSync(path.join(ROOT, 'scripts/keys-to-delete.json'), JSON.stringify(deleteList, null, 2));
console.log(`✓ keys-to-delete.json written with ${deleteList.length} keys`);
