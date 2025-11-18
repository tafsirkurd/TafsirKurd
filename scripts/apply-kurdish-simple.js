/**
 * Apply simple Kurdish improvements
 * Compares original extraction with edited version
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const originalFile = path.join(__dirname, '../kurdish-texts-simple.txt');
const editedFile = path.join(__dirname, '../kurdish-texts-edited.txt');

if (!fs.existsSync(originalFile)) {
    console.error('❌ Original file not found: kurdish-texts-simple.txt');
    process.exit(1);
}

if (!fs.existsSync(editedFile)) {
    console.error('❌ Edited file not found: kurdish-texts-edited.txt');
    console.error('   Your friend should save the edited version as "kurdish-texts-edited.txt"');
    process.exit(1);
}

console.log('📖 Comparing original and edited versions...\n');

const originalContent = fs.readFileSync(originalFile, 'utf8');
const editedContent = fs.readFileSync(editedFile, 'utf8');

const originalLines = originalContent.split('\n').filter(line =>
    line.trim() && !line.startsWith('#')
);

const editedLines = editedContent.split('\n').filter(line =>
    line.trim() && !line.startsWith('#')
);

if (originalLines.length !== editedLines.length) {
    console.error('⚠️  Warning: Original and edited files have different number of lines');
    console.error(`   Original: ${originalLines.length} lines`);
    console.error(`   Edited: ${editedLines.length} lines`);
    console.error('   Make sure your friend only edited texts, not added/removed lines\n');
}

const improvements = [];

const minLength = Math.min(originalLines.length, editedLines.length);

for (let i = 0; i < minLength; i++) {
    const original = originalLines[i].trim();
    const edited = editedLines[i].trim();

    if (original !== edited && original && edited) {
        improvements.push({
            original,
            improved: edited
        });
    }
}

if (improvements.length === 0) {
    console.log('ℹ️  No changes detected between files');
    console.log('   Either texts are correct or file wasn\'t edited');
    process.exit(0);
}

console.log(`✅ Found ${improvements.length} improvements!\n`);
console.log(`📝 Sample improvements:`);
improvements.slice(0, 5).forEach(({original, improved}) => {
    console.log(`   "${original.substring(0, 30)}..."`);
    console.log(`   → "${improved.substring(0, 30)}..."\n`);
});
console.log(`   ... and ${Math.max(0, improvements.length - 5)} more\n`);

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
        const regex = new RegExp(escapedOriginal, 'g');
        const beforeCount = (fileContent.match(regex) || []).length;

        if (beforeCount > 0) {
            fileContent = fileContent.replace(regex, improved);
            replacements += beforeCount;
            totalReplacements += beforeCount;
        }
    });

    if (replacements > 0) {
        fs.writeFileSync(filePath, fileContent, 'utf8');
        filesModified++;
        console.log(`   ✅ ${replacements} replacements\n`);
    } else {
        console.log(`   ⚠️  No matches\n`);
    }
});

console.log(`\n🎉 Kurdish improvements applied!`);
console.log(`📊 Summary:`);
console.log(`   - Files checked: ${filesToProcess.length}`);
console.log(`   - Files modified: ${filesModified}`);
console.log(`   - Total replacements: ${totalReplacements}`);
console.log(`   - Improvements from friend: ${improvements.length}`);
