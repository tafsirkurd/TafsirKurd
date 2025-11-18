/**
 * Extract ALL Kurdish text from all pages for review
 * Creates a clean, easy-to-read format for native speakers to review
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const outputFile = path.join(__dirname, '../kurdish-review-complete.txt');

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

console.log('🔍 Extracting ALL Kurdish text for review...\n');

let allTexts = new Map(); // text -> [files where it appears]

filesToProcess.forEach(filename => {
    const filePath = path.join(srcDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${filename} - not found`);
        return;
    }

    console.log(`📄 Processing ${filename}...`);

    const content = fs.readFileSync(filePath, 'utf8');
    let count = 0;

    // Extract from HTML content between tags
    const htmlMatches = content.match(/(?<=>)([^<>]+)(?=<)/g);
    if (htmlMatches) {
        htmlMatches.forEach(text => {
            const trimmed = text.trim();
            if (isKurdishText(trimmed)) {
                addText(trimmed, filename);
                count++;
            }
        });
    }

    // Extract from JavaScript strings
    const jsStringMatches = content.match(/(['"`])([^\1]{2,}?)\1/g);
    if (jsStringMatches) {
        jsStringMatches.forEach(match => {
            const text = match.slice(1, -1).trim();
            if (isKurdishText(text)) {
                addText(text, filename);
                count++;
            }
        });
    }

    // Extract from HTML attributes
    const attrMatches = content.match(/(?:placeholder|title|alt|aria-label|content)=["']([^"']+)["']/gi);
    if (attrMatches) {
        attrMatches.forEach(match => {
            const text = match.split('=')[1].replace(/['"]/g, '').trim();
            if (isKurdishText(text)) {
                addText(text, filename);
                count++;
            }
        });
    }

    console.log(`   ✅ Found ${count} Kurdish texts`);
});

function isKurdishText(text) {
    if (!text || text.length < 2) return false;

    // Must contain Kurdish/Arabic script
    if (!/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return false;

    // Skip code patterns
    if (text.includes('function') || text.includes('const ') || text.includes('return')) return false;
    if (text.includes('console.') || text.includes('document.')) return false;
    if (text.includes('getElementById') || text.includes('querySelector')) return false;
    if (text.match(/\$\{.*\}/)) return false;
    if (text.includes('http') || text.includes('.js') || text.includes('.css')) return false;

    // Skip pure numbers/symbols
    if (text.match(/^[\d\s\-.,!?():;۰-۹٠-٩]+$/)) return false;

    // Skip too short or too long
    if (text.length < 2 || text.length > 500) return false;

    // Skip Arabic Quran text (contains Quranic diacritics or classical Arabic patterns)
    if (text.match(/[\u064B-\u065F]/)) return false; // Arabic diacritics (fatha, kasra, etc.)
    if (text.match(/بِسْمِ|اللَّه|الرَّحْمَٰن|الرَّحِيم/)) return false; // Bismillah
    if (text.match(/^(ٱ|أ|إ)[لا-ي\s]+$/)) return false; // Pure Arabic text

    // Skip Surah names in Arabic
    const arabicSurahNames = [
        'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال',
        'التوبة', 'يونس', 'هود', 'يوسف', 'الرعد', 'ابراهيم', 'الحجر', 'النحل', 'الإسراء',
        'الكهف', 'مريم', 'طه', 'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء',
        'النمل', 'القصص', 'العنكبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبإ', 'فاطر',
        'يس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية',
        'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاريات', 'الطور', 'النجم', 'القمر',
        'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف', 'الجمعة',
        'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج',
        'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الانسان', 'المرسلات', 'النبإ', 'النازعات',
        'عبس', 'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى',
        'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق',
        'القدر', 'البينة', 'الزلزلة', 'العاديات', 'القارعة', 'التكاثر', 'العصر', 'الهمزة',
        'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس'
    ];

    for (const surah of arabicSurahNames) {
        if (text.includes(surah)) return false;
    }

    // Skip if contains common Arabic Quran words
    if (text.match(/يَا|قَالَ|وَ[لا-ي]{2,}|إِنَّ|أَنَّ/)) return false;

    // Skip English surah names with Arabic
    if (text.match(/Al-[A-Za-z]+\s*\(/)) return false;

    // Skip numbered surah references like "2:127" or "البقرة 255"
    if (text.match(/\d+:\d+/)) return false;
    if (text.match(/[٠-٩]{1,3}:[٠-٩]{1,3}/)) return false;

    // Ensure good ratio of Kurdish characters
    const kurdishChars = (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars > 0 && (kurdishChars / totalChars) < 0.3) return false;

    // Must contain typical Kurdish letters (not found in standard Arabic)
    // Kurdish uses: ڤ ێ ۆ پ چ ژ گ
    const hasKurdishLetters = /[ڤێۆپچژگ]/.test(text);
    if (!hasKurdishLetters && text.length > 10) return false; // Long text without Kurdish letters is likely Arabic

    return true;
}

function addText(text, filename) {
    if (!allTexts.has(text)) {
        allTexts.set(text, []);
    }
    if (!allTexts.get(text).includes(filename)) {
        allTexts.get(text).push(filename);
    }
}

// Generate output file
console.log(`\n📝 Generating review file...\n`);

let output = '# Kurdish Badini Review - All Text\n';
output += '# Instructions for reviewer:\n';
output += '# 1. Review each Kurdish text below\n';
output += '# 2. If text is correct Badini, write "OK" after |\n';
output += '# 3. If text needs improvement, write the better Badini version after |\n';
output += '# Format: CURRENT_TEXT | IMPROVED_TEXT (or "OK")\n';
output += '# \n';
output += '# Important:\n';
output += '# - Keep brand name as: تەفسیر کورد (no ا)\n';
output += '# - Keep emojis and special characters\n';
output += '# - Focus on natural Badini dialect\n';
output += '# - Fix any Sorani words to proper Badini\n\n';

// Sort alphabetically for easier review
const sortedTexts = Array.from(allTexts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

// Group by file for context
const fileGroups = {};
sortedTexts.forEach(([text, files]) => {
    files.forEach(file => {
        if (!fileGroups[file]) {
            fileGroups[file] = [];
        }
        fileGroups[file].push(text);
    });
});

// Output organized by file
filesToProcess.forEach(filename => {
    if (fileGroups[filename] && fileGroups[filename].length > 0) {
        output += `\n\n═══════════════════════════════════════════════════\n`;
        output += `     ${filename.toUpperCase()}\n`;
        output += `═══════════════════════════════════════════════════\n\n`;

        // Remove duplicates within file
        const uniqueTexts = [...new Set(fileGroups[filename])];

        uniqueTexts.forEach(text => {
            output += `${text} | \n\n`;
        });
    }
});

fs.writeFileSync(outputFile, output, 'utf8');

console.log(`✅ Extraction complete!`);
console.log(`📊 Statistics:`);
console.log(`   - Total unique Kurdish texts: ${allTexts.size}`);
console.log(`   - Files processed: ${filesToProcess.length}`);
console.log(`   - Output file: kurdish-review-complete.txt`);
console.log(`\n📋 Next steps:`);
console.log(`   1. Send "kurdish-review-complete.txt" to your friend`);
console.log(`   2. Friend reviews and fills in improvements after |`);
console.log(`   3. Send back the completed file`);
console.log(`   4. Run: node scripts/apply-kurdish-review.js`);
