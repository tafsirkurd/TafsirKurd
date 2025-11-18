/**
 * Extract Kurdish text in simplest format - one text per line
 * Friend only needs to edit the texts that need fixing
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const outputFile = path.join(__dirname, '../kurdish-texts-simple.txt');

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

console.log('🔍 Extracting Kurdish text (simple format)...\n');

let textsByFile = {}; // Group texts by file

// Process index.html for alerts/notifications only
const indexPath = path.join(srcDir, 'index.html');
if (fs.existsSync(indexPath)) {
    console.log(`📄 Processing index.html (alerts/notifications only)...`);
    const content = fs.readFileSync(indexPath, 'utf8');
    textsByFile['index.html'] = new Set();

    // Only extract from alerts and notifications
    const alertMatches = content.match(/alert\(['"](.*?)['"]\)/g);
    if (alertMatches) {
        alertMatches.forEach(match => {
            const text = match.replace(/alert\(['"]/, '').replace(/['"]\)/, '').trim();
            if (isKurdishText(text)) {
                textsByFile['index.html'].add(text);
            }
        });
    }

    const notifMatches = content.match(/(?:textContent|innerHTML)\s*=\s*['"](.*?)['"]/g);
    if (notifMatches) {
        notifMatches.forEach(match => {
            const text = match.replace(/.*=\s*['"]/, '').replace(/['"]$/, '').trim();
            if (isKurdishText(text)) {
                textsByFile['index.html'].add(text);
            }
        });
    }
}

filesToProcess.forEach(filename => {
    const filePath = path.join(srcDir, filename);

    if (!fs.existsSync(filePath)) {
        return;
    }

    console.log(`📄 Processing ${filename}...`);

    const content = fs.readFileSync(filePath, 'utf8');
    textsByFile[filename] = new Set();

    // Extract from HTML content
    const htmlMatches = content.match(/(?<=>)([^<>]+)(?=<)/g);
    if (htmlMatches) {
        htmlMatches.forEach(text => {
            const trimmed = text.trim();
            if (isKurdishText(trimmed)) {
                textsByFile[filename].add(trimmed);
            }
        });
    }

    // Extract from JavaScript strings
    const jsStringMatches = content.match(/(['"`])([^\1]{2,}?)\1/g);
    if (jsStringMatches) {
        jsStringMatches.forEach(match => {
            const text = match.slice(1, -1).trim();
            if (isKurdishText(text)) {
                textsByFile[filename].add(text);
            }
        });
    }

    // Extract from HTML attributes
    const attrMatches = content.match(/(?:placeholder|title|alt|aria-label|content)=["']([^"']+)["']/gi);
    if (attrMatches) {
        attrMatches.forEach(match => {
            const text = match.split('=')[1].replace(/['"]/g, '').trim();
            if (isKurdishText(text)) {
                textsByFile[filename].add(text);
            }
        });
    }
});

function isKurdishText(text) {
    if (!text || text.length < 2) return false;
    if (!/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return false;
    if (text.includes('function') || text.includes('const ') || text.includes('return')) return false;
    if (text.includes('console.') || text.includes('document.')) return false;
    if (text.includes('getElementById') || text.includes('querySelector')) return false;
    if (text.match(/\$\{.*\}/)) return false;
    if (text.includes('http') || text.includes('.js') || text.includes('.css')) return false;
    if (text.match(/^[\d\s\-.,!?():;۰-۹٠-٩]+$/)) return false;
    if (text.length < 2 || text.length > 500) return false;
    if (text.match(/[\u064B-\u065F]/)) return false;
    if (text.match(/بِسْمِ|اللَّه|الرَّحْمَٰن|الرَّحِيم/)) return false;
    if (text.match(/^(ٱ|أ|إ)[لا-ي\s]+$/)) return false;

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

    if (text.match(/يَا|قَالَ|وَ[لا-ي]{2,}|إِنَّ|أَنَّ/)) return false;
    if (text.match(/Al-[A-Za-z]+\s*\(/)) return false;
    if (text.match(/\d+:\d+/)) return false;
    if (text.match(/[٠-٩]{1,3}:[٠-٩]{1,3}/)) return false;

    const kurdishChars = (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars > 0 && (kurdishChars / totalChars) < 0.3) return false;

    const hasKurdishLetters = /[ڤێۆپچژگ]/.test(text);
    if (!hasKurdishLetters && text.length > 10) return false;

    return true;
}

// Generate simple output
console.log(`\n📝 Generating simple file...\n`);

let output = '# Kurdish Texts - Simple Format\n';
output += '# Instructions: Edit any text that needs improvement\n';
output += '# - If text is correct, leave it as is\n';
output += '# - If text needs fixing, just edit it directly\n';
output += '# - Keep brand name as: تەفسیر کورد (no ا)\n';
output += '# - Texts are grouped by page name\n\n';

let totalTexts = 0;

// Add index.html first (if exists)
if (textsByFile['index.html'] && textsByFile['index.html'].size > 0) {
    output += '\n========================================\n';
    output += 'index.html (alerts/notifications only)\n';
    output += '========================================\n\n';

    const sorted = Array.from(textsByFile['index.html']).sort((a, b) => a.localeCompare(b));
    sorted.forEach(text => {
        output += `${text}\n`;
        totalTexts++;
    });
}

// Add other files
const fileOrder = ['Quran.html', 'bookmarks.html', 'profile.html', 'goals.html',
                   'reading-goal.html', 'settings.html', 'login.html',
                   'complete-signup.html', 'onboarding.html', 'admin.html'];

fileOrder.forEach(filename => {
    if (textsByFile[filename] && textsByFile[filename].size > 0) {
        output += `\n========================================\n`;
        output += `${filename}\n`;
        output += `========================================\n\n`;

        const sorted = Array.from(textsByFile[filename]).sort((a, b) => a.localeCompare(b));
        sorted.forEach(text => {
            output += `${text}\n`;
            totalTexts++;
        });
    }
});

fs.writeFileSync(outputFile, output, 'utf8');

console.log(`✅ Extraction complete!`);
console.log(`📊 Statistics:`);
console.log(`   - Total Kurdish texts: ${totalTexts}`);
console.log(`   - Pages processed: ${Object.keys(textsByFile).length}`);
console.log(`   - Output file: kurdish-texts-simple.txt`);
console.log(`\n📋 Next steps:`);
console.log(`   1. Send "kurdish-texts-simple.txt" to your friend`);
console.log(`   2. Friend edits texts that need improvement (directly in file)`);
console.log(`   3. Friend saves as "kurdish-texts-edited.txt"`);
console.log(`   4. Run: node scripts/apply-kurdish-simple.js`);
