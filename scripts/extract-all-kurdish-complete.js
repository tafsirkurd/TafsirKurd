/**
 * Complete Kurdish text extraction - includes EVERYTHING
 * Extracts from HTML tags, JavaScript strings, placeholders, titles, etc.
 */

const fs = require('fs');
const path = require('path');

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
    'privacy-policy.html',
    'terms-and-conditions.html',
    'admin.html'
];

const srcDir = path.join(__dirname, '../src');
const outputFile = path.join(__dirname, '../kurdish-for-ai-studio.txt');

console.log('🔍 Extracting ALL Kurdish text (complete extraction)...\n');

let allTexts = new Map(); // Use Map to track: text -> Set of filenames

filesToProcess.forEach(filename => {
    const filePath = path.join(srcDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${filename} - not found`);
        return;
    }

    console.log(`📄 Processing ${filename}...`);

    const content = fs.readFileSync(filePath, 'utf8');
    let count = 0;

    // 1. Extract from HTML tags (visible text)
    const htmlMatches = content.match(/(?<=>)[^<>]+(?=<)/g);
    if (htmlMatches) {
        htmlMatches.forEach(text => {
            const trimmed = text.trim();
            if (isKurdishText(trimmed)) {
                addText(trimmed, filename);
                count++;
            }
        });
    }

    // 2. Extract from JavaScript strings (single and double quotes)
    const jsStringMatches = content.match(/['"]([^'"]{3,})['"]/g);
    if (jsStringMatches) {
        jsStringMatches.forEach(match => {
            const text = match.slice(1, -1).trim(); // Remove quotes
            if (isKurdishText(text) && !text.includes('http') && !text.includes('.js') && !text.includes('.css')) {
                addText(text, filename);
                count++;
            }
        });
    }

    // 2b. Extract from alert() calls specifically
    const alertMatches = content.match(/alert\(['"](.*?)['"]\)/g);
    if (alertMatches) {
        alertMatches.forEach(match => {
            const text = match.replace(/alert\(['"]/, '').replace(/['"]\)/, '').trim();
            if (isKurdishText(text)) {
                addText(text, filename);
                count++;
            }
        });
    }

    // 3. Extract from template literals
    const templateMatches = content.match(/`([^`]{3,})`/g);
    if (templateMatches) {
        templateMatches.forEach(match => {
            const text = match.slice(1, -1).trim();
            if (isKurdishText(text) && !text.includes('${')) {
                addText(text, filename);
                count++;
            }
        });
    }

    // 4. Extract from HTML attributes
    const attrMatches = content.match(/(?:placeholder|title|alt|aria-label)=["']([^"']+)["']/gi);
    if (attrMatches) {
        attrMatches.forEach(match => {
            const text = match.split('=')[1].replace(/['"]/g, '').trim();
            if (isKurdishText(text)) {
                addText(text, filename);
                count++;
            }
        });
    }

    // 5. Extract from meta tags
    const metaMatches = content.match(/<meta[^>]+content=["']([^"']+)["'][^>]*>/gi);
    if (metaMatches) {
        metaMatches.forEach(match => {
            const contentMatch = match.match(/content=["']([^"']+)["']/i);
            if (contentMatch) {
                const text = contentMatch[1].trim();
                if (isKurdishText(text)) {
                    addText(text, filename);
                    count++;
                }
            }
        });
    }

    // 6. Extract from title tags
    const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && isKurdishText(titleMatch[1])) {
        addText(titleMatch[1].trim(), filename);
        count++;
    }

    console.log(`   ✅ Found ${count} Kurdish texts`);
});

// Helper function to check if text contains Kurdish characters
function isKurdishText(text) {
    if (!text || text.length < 2) return false;

    // Must contain Kurdish/Arabic script
    if (!/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return false;

    // Skip if it's just numbers/punctuation
    if (text.match(/^[\d\s\-.,!?():;]+$/)) return false;

    // Skip URLs and file paths
    if (text.includes('http') || text.includes('.js') || text.includes('.css')) return false;

    // Skip if too long (likely HTML code)
    if (text.length > 500) return false;

    // Skip JavaScript code patterns (but not Kurdish text)
    if (text.includes('function') || text.includes('const ') || text.includes('let ') || text.includes('var ')) return false;
    if (text.includes('console.') || text.includes('document.')) return false;
    if (text.includes('=>') || text.includes('===') || text.includes('!==')) return false;
    if (text.includes('if (') || text.includes('if(') || text.includes('for (')) return false;
    if (text.includes('getElementById') || text.includes('querySelector')) return false;
    if (text.includes('textContent') || text.includes('innerHTML')) return false;

    // Skip code symbols and operators
    if (text.includes('｜｜') || text.includes('&&') || text.includes('||')) return false;
    if (text.match(/\$\{.*\}/)) return false; // Template literal variables
    if (text.includes(';') && text.includes('(')) return false; // Likely code

    // Skip HTML/CSS fragments
    if (text.match(/^[<>\/\[\]{}]+$/)) return false;
    if (text.includes('class=') || text.includes('style=')) return false;

    // Skip very short fragments (likely noise)
    if (text.length < 3) return false;

    // Ensure it has a reasonable ratio of Kurdish characters
    const kurdishChars = (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars > 0 && (kurdishChars / totalChars) < 0.3) return false;

    return true;
}

// Helper function to add text with filename tracking
function addText(text, filename) {
    if (!allTexts.has(text)) {
        allTexts.set(text, new Set());
    }
    allTexts.get(text).add(filename);
}

// Generate output file
console.log(`\n📝 Generating translation file...\n`);

let output = '# Kurdish Sorani to Badini Translation - COMPLETE EXTRACTION\n';
output += '# Instructions: Translate each line to Badini Kurdish\n';
output += '# Format: ORIGINAL_TEXT | BADINI_TRANSLATION\n';
output += '# Keep Arabic Quran verses unchanged\n';
output += '# Keep brand name as: تەفسیر کورد (no ا)\n\n';

// Sort texts alphabetically for easier processing
const sortedTexts = Array.from(allTexts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

// Group by first occurrence file
const fileGroups = {};
sortedTexts.forEach(([text, files]) => {
    const firstFile = Array.from(files)[0];
    if (!fileGroups[firstFile]) {
        fileGroups[firstFile] = [];
    }
    fileGroups[firstFile].push(text);
});

// Output by file
filesToProcess.forEach(filename => {
    if (fileGroups[filename]) {
        output += `\n=== ${filename} ===\n`;
        fileGroups[filename].forEach(text => {
            // Escape any | characters in the original text
            const escapedText = text.replace(/\|/g, '｜');
            output += `${escapedText} | \n`;
        });
    }
});

fs.writeFileSync(outputFile, output, 'utf8');

console.log(`✅ Extraction complete!`);
console.log(`📊 Statistics:`);
console.log(`   - Total unique Kurdish texts: ${allTexts.size}`);
console.log(`   - Files processed: ${filesToProcess.length}`);
console.log(`   - Output file: kurdish-for-ai-studio.txt`);
console.log(`\n📋 Next steps:`);
console.log(`   1. Open kurdish-for-ai-studio.txt`);
console.log(`   2. Copy to Google AI Studio`);
console.log(`   3. Ask: "Translate from Sorani to Badini Kurdish, keep brand name as تەفسیر کورد"`);
console.log(`   4. Save translations back to the file`);
console.log(`   5. Run: node scripts/fix-brand-name.js`);
console.log(`   6. Run: node scripts/apply-ai-studio-translations.js`);
