/**
 * Apply Kurdish improvements from review file
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const reviewFile = path.join(__dirname, '../kurdish-review-complete.txt');

if (!fs.existsSync(reviewFile)) {
    console.error('❌ Review file not found!');
    process.exit(1);
}

console.log('📖 Reading Kurdish review improvements...\n');

const content = fs.readFileSync(reviewFile, 'utf8');
const lines = content.split('\n');

const improvements = [];

lines.forEach(line => {
    // Skip comments, empty lines, and section headers
    if (!line.trim() || line.startsWith('#') || line.includes('═══')) {
        return;
    }

    // Parse improvement line: ORIGINAL | IMPROVED
    if (line.includes('|')) {
        const parts = line.split('|');
        if (parts.length >= 2) {
            const original = parts[0].trim();
            const improved = parts[1].trim();

            // Only add if we have both and it's not just "OK"
            if (original && improved && improved !== 'OK' && improved.toLowerCase() !== 'ok') {
                improvements.push({
                    original,
                    improved
                });
            }
        }
    }
});

if (improvements.length === 0) {
    console.log('ℹ️  No improvements found (all texts marked as OK or not reviewed yet)');
    console.log('   This is normal if your friend hasn\'t reviewed the file yet.');
    process.exit(0);
}

console.log(`✅ Found ${improvements.length} improvements to apply\n`);
console.log(`📝 Sample improvements:`);
improvements.slice(0, 5).forEach(({original, improved}) => {
    console.log(`   "${original.substring(0, 30)}..." → "${improved.substring(0, 30)}..."`);
});
console.log(`   ... and ${improvements.length - 5} more\n`);

// Files to process
const filesToProcess = [
    'index.html',
    'Quran.html',
    'bookmarks.html',
    'profile.html',
    'goals.html',
    'reading-goal.html',
    'settings.html',
    'login.html',
    'complete-signup.html',
    'onboarding.html',
    'privacy-policy.html',
    'terms-and-conditions.html',
    'admin.html'
];

// Apply improvements
let totalReplacements = 0;
let filesModified = 0;

filesToProcess.forEach(filename => {
    const filePath = path.join(srcDir, filename);

    if (!fs.existsSync(filePath)) {
        return;
    }

    console.log(`🔄 Processing ${filename}...`);

    let fileContent = fs.readFileSync(filePath, 'utf8');
    let replacements = 0;

    improvements.forEach(({ original, improved }) => {
        // Escape special regex characters
        const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Replace all occurrences
        const regex = new RegExp(escapedOriginal, 'g');
        const beforeCount = (fileContent.match(regex) || []).length;

        if (beforeCount > 0) {
            fileContent = fileContent.replace(regex, improved);
            replacements += beforeCount;
            totalReplacements += beforeCount;
            console.log(`   ✓ "${original.substring(0, 35)}..." (${beforeCount}x)`);
        }
    });

    if (replacements > 0) {
        // Write back to file
        fs.writeFileSync(filePath, fileContent, 'utf8');
        filesModified++;
        console.log(`   ✅ ${replacements} replacements\n`);
    } else {
        console.log(`   ⚠️  No matches\n`);
    }
});

console.log(`\n🎉 Kurdish review improvements applied!`);
console.log(`📊 Summary:`);
console.log(`   - Files checked: ${filesToProcess.length}`);
console.log(`   - Files modified: ${filesModified}`);
console.log(`   - Total replacements: ${totalReplacements}`);
console.log(`   - Improvements applied: ${improvements.length}`);
console.log(`\n📋 Next steps:`);
console.log(`   1. Test all pages to verify improvements`);
console.log(`   2. Check that all text reads naturally`);
console.log(`   3. Commit changes if everything looks good`);
