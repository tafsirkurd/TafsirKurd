/**
 * Replace Kurdish text in HTML files with Badini translations
 * This script reads the translation file and replaces text in all HTML files
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const translationFile = path.join(__dirname, '../kurdish-text-to-translate.txt');

if (!fs.existsSync(translationFile)) {
    console.error('❌ Translation file not found!');
    console.error('   Please run extract-kurdish-text.js first');
    process.exit(1);
}

console.log('📖 Reading translations...\n');

const translationContent = fs.readFileSync(translationFile, 'utf8');
const lines = translationContent.split('\n');

// Parse translations: filename | original | translation
const translations = {};

lines.forEach(line => {
    // Skip comments and empty lines
    if (line.startsWith('#') || line.startsWith('=') || line.startsWith('FILE:') || !line.trim()) {
        return;
    }

    const parts = line.split('|').map(p => p.trim());

    if (parts.length === 3 && parts[2] && parts[2] !== '[TRANSLATE HERE]') {
        const filename = parts[0];
        const original = parts[1];
        const translated = parts[2];

        if (!translations[filename]) {
            translations[filename] = [];
        }

        translations[filename].push({
            original,
            translated
        });
    }
});

if (Object.keys(translations).length === 0) {
    console.error('❌ No translations found!');
    console.error('   Please add translations to the [TRANSLATE HERE] column');
    process.exit(1);
}

console.log(`✅ Found translations for ${Object.keys(translations).length} files\n`);

// Apply replacements
Object.keys(translations).forEach(filename => {
    const filePath = path.join(srcDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${filename} - file not found`);
        return;
    }

    console.log(`🔄 Processing ${filename}...`);

    let content = fs.readFileSync(filePath, 'utf8');
    let replacements = 0;

    translations[filename].forEach(({ original, translated }) => {
        // Escape special regex characters in original text
        const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Replace all occurrences
        const regex = new RegExp(escapedOriginal, 'g');
        const matches = content.match(regex);

        if (matches) {
            content = content.replace(regex, translated);
            replacements += matches.length;
        }
    });

    // Write back to file
    fs.writeFileSync(filePath, content, 'utf8');

    console.log(`   ✅ ${replacements} replacements made`);
});

console.log(`\n🎉 Translation complete!`);
console.log(`\n📋 Next steps:`);
console.log(`   1. Review the changes in your files`);
console.log(`   2. Test the pages to make sure everything looks good`);
console.log(`   3. Deploy when ready`);
