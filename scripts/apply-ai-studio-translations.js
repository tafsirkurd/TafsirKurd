/**
 * Apply translations from Google AI Studio format
 * Handles flexible formatting with whitespace
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const translationFile = path.join(__dirname, '../kurdish-for-ai-studio.txt');

if (!fs.existsSync(translationFile)) {
    console.error('❌ Translation file not found!');
    process.exit(1);
}

console.log('📖 Reading translations from Google AI Studio format...\n');

const content = fs.readFileSync(translationFile, 'utf8');
const lines = content.split('\n');

const translations = {};
let currentFile = '';
let translationPairs = [];

lines.forEach(line => {
    // Detect file sections
    if (line.includes('===') && line.includes('.html')) {
        const match = line.match(/===\s+(.+?\.html)\s+===/);
        if (match) {
            currentFile = match[1];
            if (!translations[currentFile]) {
                translations[currentFile] = [];
            }
        }
        return;
    }

    // Skip comments, empty lines, and instruction lines
    if (!line.trim() ||
        line.startsWith('#') ||
        line.toLowerCase().includes('instruction') ||
        line.toLowerCase().includes('keep the format') ||
        !currentFile) {
        return;
    }

    // Parse translation line: ORIGINAL | TRANSLATION
    // Handle both formats: with spaces or without
    if (line.includes('|')) {
        const parts = line.split('|');
        if (parts.length >= 2) {
            const original = parts[0].trim();
            const translated = parts[1].trim();

            // Only add if we have both original and translation
            if (original && translated) {
                translations[currentFile].push({
                    original,
                    translated
                });
                translationPairs.push(`"${original}" → "${translated}"`);
            }
        }
    }
});

const filesWithTranslations = Object.keys(translations).filter(f => translations[f].length > 0);

if (filesWithTranslations.length === 0) {
    console.error('❌ No translations found!');
    console.error('   Make sure the file has format: ORIGINAL | TRANSLATION');
    process.exit(1);
}

console.log(`✅ Found ${translationPairs.length} translations for ${filesWithTranslations.length} files\n`);
console.log(`📝 Sample translations:`);
translationPairs.slice(0, 5).forEach(pair => console.log(`   ${pair}`));
console.log(`   ... and ${translationPairs.length - 5} more\n`);

// Ask for confirmation
console.log(`⚠️  This will modify ${filesWithTranslations.length} HTML files.`);
console.log(`   Files: ${filesWithTranslations.join(', ')}\n`);

// Apply replacements
let totalReplacements = 0;
let filesModified = 0;

filesWithTranslations.forEach(filename => {
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
        const beforeCount = (content.match(regex) || []).length;

        if (beforeCount > 0) {
            content = content.replace(regex, translated);
            replacements += beforeCount;
            totalReplacements += beforeCount;
        }
    });

    if (replacements > 0) {
        // Write back to file
        fs.writeFileSync(filePath, content, 'utf8');
        filesModified++;
        console.log(`   ✅ ${replacements} replacements made`);
    } else {
        console.log(`   ⚠️  No matches found`);
    }
});

console.log(`\n🎉 Translation complete!`);
console.log(`📊 Summary:`);
console.log(`   - Files modified: ${filesModified}/${filesWithTranslations.length}`);
console.log(`   - Total replacements: ${totalReplacements}`);
console.log(`\n📋 Next steps:`);
console.log(`   1. Open a few pages to verify translations look correct`);
console.log(`   2. If good, deploy: npm run deploy:prod`);
console.log(`   3. If issues, restore from git: git checkout src/`);
