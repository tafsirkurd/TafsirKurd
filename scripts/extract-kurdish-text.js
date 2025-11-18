/**
 * Extract Kurdish text from HTML files for translation
 * This script extracts all visible text content from HTML files
 * so you can easily translate it with AI tools
 */

const fs = require('fs');
const path = require('path');

// Files to extract text from (excluding index.html since it's already correct)
const filesToProcess = [
    'Quran.html',
    'Dashboard.html',
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

const srcDir = path.join(__dirname, '../src');
const outputFile = path.join(__dirname, '../kurdish-text-to-translate.txt');

let output = '# Kurdish Text Extraction for Badini Translation\n';
output += '# Copy each section to AI tool for translation\n';
output += '# Format: [FILENAME] | Original Text | [Leave this column for translation]\n\n';

filesToProcess.forEach(filename => {
    const filePath = path.join(srcDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${filename} - file not found`);
        return;
    }

    console.log(`📄 Processing ${filename}...`);

    const content = fs.readFileSync(filePath, 'utf8');

    output += `\n${'='.repeat(80)}\n`;
    output += `FILE: ${filename}\n`;
    output += `${'='.repeat(80)}\n\n`;

    // Extract text between > and < tags (visible text)
    // This regex finds content between HTML tags
    const textMatches = content.match(/(?<=>)[^<>]+(?=<)/g);

    if (textMatches) {
        const uniqueTexts = new Set();

        textMatches.forEach(text => {
            const trimmed = text.trim();

            // Only include text that:
            // - Is not empty
            // - Contains Kurdish/Arabic characters
            // - Is not just numbers or punctuation
            // - Is longer than 2 characters
            if (trimmed &&
                trimmed.length > 2 &&
                /[\u0600-\u06FF\u0750-\u077F]/.test(trimmed) &&
                !trimmed.match(/^[\d\s\-.,!?():;]+$/)) {
                uniqueTexts.add(trimmed);
            }
        });

        Array.from(uniqueTexts).forEach(text => {
            output += `${filename} | ${text} | [TRANSLATE HERE]\n`;
        });
    }

    output += '\n';
});

fs.writeFileSync(outputFile, output, 'utf8');

console.log(`\n✅ Extraction complete!`);
console.log(`📝 File saved: ${outputFile}`);
console.log(`\n📋 Next steps:`);
console.log(`   1. Open kurdish-text-to-translate.txt`);
console.log(`   2. Copy sections to AI tool (ChatGPT/Claude)`);
console.log(`   3. Ask: "Translate this Kurdish text to Badini Kurdish dialect"`);
console.log(`   4. Paste translations back into the [TRANSLATE HERE] column`);
console.log(`   5. Run the replace script to update all files`);
