/**
 * Apply index.html message translations from AI Studio
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const translationFile = path.join(__dirname, '../index-messages-for-ai-studio.txt');

if (!fs.existsSync(translationFile)) {
    console.error('❌ Translation file not found!');
    process.exit(1);
}

console.log('📖 Reading index.html message translations...\n');

const content = fs.readFileSync(translationFile, 'utf8');
const lines = content.split('\n');

const translations = [];

lines.forEach(line => {
    // Skip comments and empty lines
    if (!line.trim() || line.startsWith('#')) {
        return;
    }

    // Parse translation line: ORIGINAL | TRANSLATION
    if (line.includes('|')) {
        const parts = line.split('|');
        if (parts.length >= 2) {
            const original = parts[0].trim();
            const translated = parts[1].trim();

            // Only add if we have both original and translation
            if (original && translated) {
                translations.push({
                    original,
                    translated
                });
            }
        }
    }
});

if (translations.length === 0) {
    console.error('❌ No translations found!');
    console.error('   Make sure the file has format: ORIGINAL | TRANSLATION');
    process.exit(1);
}

console.log(`✅ Found ${translations.length} translations\n`);
console.log(`📝 Translations:`);
translations.forEach(({original, translated}) => {
    console.log(`   "${original}" → "${translated}"`);
});
console.log('');

// Process index.html
const filePath = path.join(srcDir, 'index.html');

if (!fs.existsSync(filePath)) {
    console.error('❌ index.html not found!');
    process.exit(1);
}

console.log(`🔄 Processing index.html...`);

let content_file = fs.readFileSync(filePath, 'utf8');
let replacements = 0;

translations.forEach(({ original, translated }) => {
    // Skip if they're the same (already in Badini)
    if (original === translated) return;

    // Escape special regex characters in original text
    const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace all occurrences
    const regex = new RegExp(escapedOriginal, 'g');
    const beforeCount = (content_file.match(regex) || []).length;

    if (beforeCount > 0) {
        content_file = content_file.replace(regex, translated);
        replacements += beforeCount;
        console.log(`   ✓ Replaced "${original}" (${beforeCount}x)`);
    }
});

if (replacements > 0) {
    // Write back to file
    fs.writeFileSync(filePath, content_file, 'utf8');
    console.log(`   ✅ ${replacements} replacements made\n`);
} else {
    console.log(`   ⚠️  No matches found\n`);
}

console.log(`\n🎉 Translation complete!`);
console.log(`📊 Summary:`);
console.log(`   - Total replacements: ${replacements}`);
console.log(`\n📋 Next steps:`);
console.log(`   1. Test the contact form on index.html`);
console.log(`   2. Verify all messages appear correctly`);
