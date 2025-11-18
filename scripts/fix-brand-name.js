/**
 * Fix incorrect brand name translations
 * AI Studio incorrectly translates "تەفسیر کورد" to "تەفسیرا کورد"
 * This script fixes it back to the correct form
 */

const fs = require('fs');
const path = require('path');

const translationFile = path.join(__dirname, '../kurdish-for-ai-studio.txt');

if (!fs.existsSync(translationFile)) {
    console.error('❌ Translation file not found!');
    process.exit(1);
}

console.log('🔧 Fixing brand name in translation file...\n');

let content = fs.readFileSync(translationFile, 'utf8');

// Count occurrences before fix
const wrongCount = (content.match(/تەفسیرا کورد/g) || []).length;

if (wrongCount === 0) {
    console.log('✅ No issues found! Brand name is already correct.');
    process.exit(0);
}

console.log(`⚠️  Found ${wrongCount} incorrect instances of "تەفسیرا کورد"`);
console.log('   Fixing to "تەفسیر کورد"...\n');

// Replace all instances
content = content.replace(/تەفسیرا کورد/g, 'تەفسیر کورد');

// Save back
fs.writeFileSync(translationFile, content, 'utf8');

// Verify
const afterCount = (content.match(/تەفسیرا کورد/g) || []).length;
const correctCount = (content.match(/تەفسیر کورد/g) || []).length;

console.log('✅ Fix complete!');
console.log(`   - Corrected: ${wrongCount} instances`);
console.log(`   - Remaining wrong: ${afterCount}`);
console.log(`   - Correct instances: ${correctCount}`);
console.log('\n📋 Next step: Run the translation script');
console.log('   node scripts/apply-ai-studio-translations.js');
