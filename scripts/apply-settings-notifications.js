/**
 * Apply settings notifications translations
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const translationFile = path.join(__dirname, '../settings-notifications-for-ai.txt');

if (!fs.existsSync(translationFile)) {
    console.error('❌ Translation file not found!');
    process.exit(1);
}

console.log('📖 Reading settings notifications translations...\n');

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

            // Only add if we have both
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

// Process settings.html
const filePath = path.join(srcDir, 'settings.html');

if (!fs.existsSync(filePath)) {
    console.error('❌ settings.html not found!');
    process.exit(1);
}

console.log(`🔄 Processing settings.html...`);

let fileContent = fs.readFileSync(filePath, 'utf8');
let replacements = 0;

translations.forEach(({ original, translated }) => {
    // Skip if same
    if (original === translated) return;

    // Escape special regex characters
    const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedOriginal, 'g');
    const beforeCount = (fileContent.match(regex) || []).length;

    if (beforeCount > 0) {
        fileContent = fileContent.replace(regex, translated);
        replacements += beforeCount;
        console.log(`   ✓ "${original}" (${beforeCount}x)`);
    }
});

if (replacements > 0) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`\n   ✅ ${replacements} replacements made\n`);
} else {
    console.log(`\n   ⚠️  No matches found\n`);
}

console.log(`🎉 Settings notifications updated!`);
console.log(`📋 Test the settings page to verify all notifications are correct.`);
