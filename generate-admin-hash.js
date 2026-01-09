// Generate SHA-256 hash for admin password
// Run: node generate-admin-hash.js YOUR_PASSWORD

const crypto = require('crypto');

const password = process.argv[2];

if (!password) {
    console.error('❌ Please provide a password:');
    console.error('   node generate-admin-hash.js YOUR_PASSWORD');
    process.exit(1);
}

const hash = crypto.createHash('sha256').update(password).digest('hex');

console.log('\n✅ Password Hash Generated!\n');
console.log('Add this to Cloudflare Pages Environment Variables:');
console.log('─'.repeat(60));
console.log(`Variable: ADMIN_PASSWORD_HASH`);
console.log(`Value: ${hash}`);
console.log('─'.repeat(60));
console.log('\nSteps:');
console.log('1. Go to: https://dash.cloudflare.com/');
console.log('2. Select TafsirKurd → Settings → Environment variables');
console.log('3. Add the variable above');
console.log('4. Redeploy your site\n');
