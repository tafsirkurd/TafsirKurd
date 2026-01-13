// Simple script to generate bcrypt password hash for admin account
// Usage: node scripts/generate-bcrypt-hash.js YOUR_PASSWORD

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
    console.error('\n❌ Error: Please provide a password\n');
    console.log('Usage: node scripts/generate-bcrypt-hash.js YOUR_PASSWORD\n');
    console.log('Example: node scripts/generate-bcrypt-hash.js MySecurePassword123\n');
    process.exit(1);
}

if (password.length < 8) {
    console.error('\n⚠️  Warning: Password should be at least 8 characters long\n');
}

console.log('\n🔐 Generating bcrypt hash...\n');

const hash = bcrypt.hashSync(password, 10);

console.log('✅ Bcrypt hash generated successfully!\n');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('\n📋 Copy the SQL command below and run it in your Supabase SQL Editor:\n');
console.log('═'.repeat(80));
console.log(`
INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
VALUES (
    'tefsirkurd@gmail.com',  -- Change this to your email
    '${hash}',
    'Super Admin',            -- Change this to your name
    'super_admin',
    true
)
ON CONFLICT (email)
DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();
`);
console.log('═'.repeat(80));
console.log('\n✨ This SQL will create or update your admin account with the new password.\n');
