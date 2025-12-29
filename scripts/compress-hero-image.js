/**
 * 🖼️ Compress Hero Image - Reduce TafsirKurd.png from 231KB to <50KB
 * Critical for mobile LCP performance (13.7s → <2.5s)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.error('❌ Sharp not installed. Run: npm install sharp --save-dev');
    console.log('\n📦 Alternative: Use online tools:');
    console.log('   - https://tinypng.com (recommended)');
    console.log('   - https://squoosh.app (Google)');
    console.log('   - https://compressor.io\n');
    process.exit(1);
}

const imagePath = path.join(__dirname, '../src/assets/images/TafsirKurd.png');
const outputPath = path.join(__dirname, '../src/assets/images/TafsirKurd-optimized.png');

async function compressImage() {
    try {
        console.log('🔍 Original file size:', (fs.statSync(imagePath).size / 1024).toFixed(2), 'KB');

        await sharp(imagePath)
            .resize(300, 300, { // Keep 300x300 size
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png({
                quality: 80,
                compressionLevel: 9,
                effort: 10
            })
            .toFile(outputPath);

        const newSize = fs.statSync(outputPath).size / 1024;
        console.log('✅ Compressed file size:', newSize.toFixed(2), 'KB');
        console.log('💾 Savings:', ((231 - newSize) / 231 * 100).toFixed(1), '%');
        console.log('\n📁 Compressed image saved to:', outputPath);
        console.log('\n🚀 Next steps:');
        console.log('   1. Review the compressed image');
        console.log('   2. Rename TafsirKurd.png to TafsirKurd-backup.png');
        console.log('   3. Rename TafsirKurd-optimized.png to TafsirKurd.png');
        console.log('   4. Deploy and retest mobile performance\n');
    } catch (error) {
        console.error('❌ Error compressing image:', error.message);
    }
}

compressImage();
