#!/usr/bin/env node
// Smoke tests — run with: npm test
// Checks critical invariants without needing a live server

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
let failed = 0;

function pass(msg) { console.log('  ✓', msg); }
function fail(msg) { console.error('  ✗', msg); failed++; }

function test(name, fn) {
    process.stdout.write(`\n[${name}]\n`);
    try { fn(); } catch (e) { fail('threw: ' + e.message); }
}

// ── 1. No debug endpoints ─────────────────────────────────────────────────
test('No debug endpoints in production', () => {
    const dangerous = ['check-env.js', 'test-db.js'];
    for (const f of dangerous) {
        const p = join(root, 'functions', f);
        if (existsSync(p)) fail(f + ' still exists — remove it');
        else pass(f + ' not present');
    }
});

// ── 2. No wildcard CORS on authenticated admin endpoints ─────────────────
// Public/app-facing endpoints legitimately use * CORS.
// Admin endpoints that require a session token must be restricted.
test('Authenticated admin endpoints do not use wildcard CORS', () => {
    const dir = join(root, 'functions');
    for (const file of readdirSync(dir).filter(f => f.endsWith('.js'))) {
        const src = readFileSync(join(dir, file), 'utf8');
        const hasWildcard = src.includes("'Access-Control-Allow-Origin': '*'");
        const hasSessionAuth = src.includes('admin_sessions') && (src.includes("'Unauthorized'") || src.includes('"Unauthorized"'));
        if (hasWildcard && hasSessionAuth) {
            fail(file + ': wildcard CORS + session auth — restrict CORS to tafsirkurd.com');
        } else if (hasWildcard) {
            pass(file + ': wildcard CORS (public endpoint, ok)');
        } else {
            pass(file + ': restricted CORS');
        }
    }
});

// ── 3. All admin-*.js functions have an auth check ───────────────────────
test('Admin functions require auth', () => {
    const dir = join(root, 'functions');
    for (const file of readdirSync(dir).filter(f => f.startsWith('admin-') && f.endsWith('.js') && !f.includes('OLD-BACKUP'))) {
        const src = readFileSync(join(dir, file), 'utf8');
        if (!src.includes('token') && !src.includes('Authorization') && !src.includes('Unauthorized')) {
            fail(file + ' has no auth check');
        } else {
            pass(file + ' has auth');
        }
    }
});

// ── 4. No .bak files ─────────────────────────────────────────────────────
test('No .bak files in repo', () => {
    function scan(dir) {
        try {
            for (const f of readdirSync(dir, { withFileTypes: true })) {
                if (f.name === 'node_modules' || f.name === '.git') continue;
                if (f.isDirectory()) scan(join(dir, f.name));
                else if (f.name.endsWith('.bak')) fail('Found: ' + join(dir, f.name));
            }
        } catch {}
    }
    scan(root);
    if (failed === 0) pass('No .bak files found');
});

// ── 5. package.json has no redundant bcrypt packages ─────────────────────
test('No duplicate bcrypt packages', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['bcrypt'])   fail('bcrypt (native) in package.json — remove it, use bcrypt-ts');
    else                  pass('bcrypt not present');
    if (deps['bcryptjs']) fail('bcryptjs in package.json — remove it, use bcrypt-ts');
    else                  pass('bcryptjs not present');
    if (deps['bcrypt-ts']) pass('bcrypt-ts present (correct)');
    else                   fail('bcrypt-ts missing from package.json');
});

// ── 6. Admin pages all listed in the permissions migration ───────────────
test('All admin pages are listed in permissions migration', () => {
    const migrationPath = join(root, 'database', 'migrations', 'ensure_admin_permissions_all_pages.sql');
    if (!existsSync(migrationPath)) {
        fail('Migration file missing: database/migrations/ensure_admin_permissions_all_pages.sql');
        return;
    }
    const migration = readFileSync(migrationPath, 'utf8');
    const dir = join(root, 'src');
    const adminPages = readdirSync(dir)
        .filter(f => f.startsWith('admin-') && f.endsWith('.html') && f !== 'admin-login.html')
        .map(f => f.replace('admin-', '').replace('.html', ''));

    for (const slug of adminPages) {
        if (!migration.includes(`'${slug}'`)) {
            fail(`'${slug}' missing from permissions migration — add it to ensure_admin_permissions_all_pages.sql`);
        } else {
            pass(`'${slug}' in migration`);
        }
    }
});

// ── Result ────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
if (failed > 0) {
    console.error(`\n${failed} test(s) FAILED\n`);
    process.exit(1);
} else {
    console.log('\nAll tests passed\n');
}
