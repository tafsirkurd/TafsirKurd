/**
 * Filter to ONLY Kurdish text - remove Arabic Quran verses and Surah names
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../kurdish-for-ai-studio.txt');

console.log('🔍 Filtering to Kurdish text only...\n');

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n');

let cleaned = '# Kurdish Sorani to Badini Translation\n';
cleaned += '# Translate ONLY Kurdish text to Badini\n';
cleaned += '# Keep brand name: تەفسیر کورد (no ا)\n\n';

let validLines = 0;

// Arabic Quran/Surah names to skip
const arabicWords = [
    'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف',
    'الأنفال', 'التوبة', 'يونس', 'هود', 'يوسف', 'الرعد', 'ابراهيم', 'الحجر',
    'النحل', 'الاسراء', 'الكهف', 'مريم', 'طه', 'الأنبياء', 'الحج', 'المؤمنون',
    'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم',
    'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر', 'يس', 'الصافات', 'ص',
    'الزمر', 'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية',
    'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاريات', 'الطور',
    'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر',
    'الممتحنة', 'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق',
    'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج', 'نوح', 'الجن',
    'المزمل', 'المدثر', 'القيامة', 'الانسان', 'المرسلات', 'النبأ',
    'النازعات', 'عبس', 'التكوير', 'الانفطار', 'المطففين', 'الانشقاق',
    'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد', 'الشمس',
    'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة',
    'الزلزلة', 'العاديات', 'القارعة', 'التكاثر', 'العصر', 'الهمزة',
    'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر', 'المسد',
    'الاخلاص', 'الفلق', 'الناس'
];

function isArabicOrQuran(text) {
    // Bismillah and Allah
    if (text.includes('بِسْمِ') || text.includes('ٱللَّهِ') || text.includes('ٱلرَّحْمَٰنِ') || text.includes('ٱلرَّحِيمِ')) {
        return true;
    }

    // Check surah names
    for (const word of arabicWords) {
        if (text.includes(word)) return true;
    }

    // Just numbers
    if (/^[٠-٩۰-۹0-9\s\-\/]+$/.test(text)) return true;

    // English references
    if (/^Al-/.test(text) || text.includes('KFGQPC') || text.includes('Hafs')) return true;

    return false;
}

function isKurdishText(text) {
    // Must have Kurdish-specific characters (not just Arabic)
    const kurdishChars = /[ڕێەۆوکچپگڤژ]/;
    return kurdishChars.test(text);
}

lines.forEach(line => {
    // Keep section headers
    if (line.startsWith('===')) {
        cleaned += '\n' + line + '\n';
        return;
    }

    // Skip comments and empty
    if (line.startsWith('#') || !line.trim()) return;

    const parts = line.split('|');
    if (parts.length < 2) return;

    const original = parts[0].trim();

    // Basic filters
    if (!original || original.length < 3) return;

    // Skip Arabic/Quran
    if (isArabicOrQuran(original)) return;

    // Must be Kurdish
    if (!isKurdishText(original)) return;

    // Skip code
    if (original.includes('KurdishNumbers') ||
        original.includes('${') ||
        original.includes('</') ||
        original.includes('class=') ||
        original.includes('toKurdish')) {
        return;
    }

    cleaned += original + ' | \n';
    validLines++;
});

fs.writeFileSync(inputFile, cleaned, 'utf8');

console.log('✅ Filtered successfully!');
console.log(`📊 Pure Kurdish texts: ${validLines}`);
console.log('\n📋 Ready for Google AI Studio!');
