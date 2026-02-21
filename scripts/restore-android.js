const fs = require('fs');
const { execSync } = require('child_process');

const keysToRestore = [
  'tabs.quran','tabs.goals','tabs.settings','header.goals','reader.ayah',
  'sidebar.surah','sidebar.juz','goals.delete.cancel','goals.delete.confirm',
  'wizard.confirm_title','wizard.preset.khatm','wizard.custom_name',
  'wizard.btn_start','wizard.detail.begin','profile.login','profile.title',
  'profile.change_pass','auth.email','auth.name','repeat.surah','repeat.start',
  'bookmarks.surahs','bookmarks.notes','bookmarks.note','bookmarks.sort.oldest',
  'onboarding.slide3.feature1','onboarding.slide3.feature2',
  'onboarding.slide3.feature3','onboarding.slide3.feature4'
];

// Extract from git history
const orig = execSync('git -C C:/TafsirKurd show HEAD~1:src/utils/bulk-translations.js').toString();
const allMatches = [...orig.matchAll(/\{\s*key_id:\s*"([^"]+)",\s*kurdish_text:\s*"([^"]*)",\s*category:\s*"([^"]*)",\s*page:\s*"([^"]*)"\s*\}/g)];
const toRestore = allMatches.filter(m => keysToRestore.includes(m[1]));

console.log(`Found ${toRestore.length} entries to restore`);

// Read current bulk-translations.js
const bulkFile = 'C:/TafsirKurd/src/utils/bulk-translations.js';
let content = fs.readFileSync(bulkFile, 'utf8');

// Append before the closing ]
const restoreLines = toRestore.map(m =>
  `    { key_id: "${m[1]}", kurdish_text: "${m[2]}", category: "${m[3]}", page: "${m[4]}" }`
).join(',\n');

content = content.replace(/\n\]/, ',\n' + restoreLines + '\n]');
fs.writeFileSync(bulkFile, content);
console.log('Restored to bulk-translations.js');

// Also remove these from the SQL delete file
let sql = fs.readFileSync('C:/TafsirKurd/scripts/delete-duplicates.sql', 'utf8');
for (const m of toRestore) {
  sql = sql.replace(new RegExp(`  '${m[1].replace('.','\.')}',?\n`), '');
}
fs.writeFileSync('C:/TafsirKurd/scripts/delete-duplicates.sql', sql);
console.log('Removed from SQL delete file');
