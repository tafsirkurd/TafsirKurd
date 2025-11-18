/**
 * Apply alert and notification translations from AI Studio
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const translationFile = path.join(__dirname, '../alerts-notifications-for-ai-studio.txt');

if (!fs.existsSync(translationFile)) {
    console.error('❌ Translation file not found!');
    process.exit(1);
}

console.log('📖 Reading alert/notification translations...\n');

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
console.log(`📝 Sample translations:`);
translations.slice(0, 3).forEach(({original, translated}) => {
    console.log(`   "${original}" → "${translated}"`);
});
console.log(`   ... and ${translations.length - 3} more\n`);

// Files to process
const filesToProcess = [
    'Quran.html',
    'bookmarks.html',
    'profile.html',
    'goals.html',
    'reading-goal.html',
    'settings.html',
    'login.html',
    'complete-signup.html',
    'onboarding.html',
    'admin.html'
];

// Apply replacements
let totalReplacements = 0;
let filesModified = 0;

filesToProcess.forEach(filename => {
    const filePath = path.join(srcDir, filename);

    if (!fs.existsSync(filePath)) {
        return;
    }

    console.log(`🔄 Processing ${filename}...`);

    let content = fs.readFileSync(filePath, 'utf8');
    let replacements = 0;

    translations.forEach(({ original, translated }) => {
        // Skip if they're the same (already in Badini)
        if (original === translated) return;

        // Escape special regex characters in original text
        const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Replace all occurrences
        const regex = new RegExp(escapedOriginal, 'g');
        const beforeCount = (content.match(regex) || []).length;

        if (beforeCount > 0) {
            content = content.replace(regex, translated);
            replacements += beforeCount;
            totalReplacements += beforeCount;
            console.log(`   ✓ Replaced "${original.substring(0, 40)}..." (${beforeCount}x)`);
        }
    });

    if (replacements > 0) {
        // Write back to file
        fs.writeFileSync(filePath, content, 'utf8');
        filesModified++;
        console.log(`   ✅ ${replacements} replacements made\n`);
    } else {
        console.log(`   ⚠️  No matches found\n`);
    }
});

console.log(`\n🎉 Translation complete!`);
console.log(`📊 Summary:`);
console.log(`   - Files checked: ${filesToProcess.length}`);
console.log(`   - Files modified: ${filesModified}`);
console.log(`   - Total replacements: ${totalReplacements}`);
console.log(`\n📋 Next steps:`);
console.log(`   1. Test the application to verify translations`);
console.log(`   2. If good, commit changes: git add . && git commit -m "Update alerts to Badini"`);
