#!/usr/bin/env node
// Lint checks — run with: npm run lint

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
let warnings = 0;

function warn(msg) { console.warn('  ⚠', msg); warnings++; }
function info(msg) { console.log('  ✓', msg); }

function checkFunctions() {
    console.log('\n[Functions lint]');
    const dir = join(root, 'functions');
    for (const file of readdirSync(dir).filter(f => f.endsWith('.js') && !f.includes('OLD-BACKUP'))) {
        const src = readFileSync(join(dir, file), 'utf8');
        const path = `functions/${file}`;

        // Wildcard CORS
        if (src.includes("'Access-Control-Allow-Origin': '*'"))
            warn(`${path}: wildcard CORS — should be 'https://tafsirkurd.com'`);

        // Silent catch returning ok
        if (src.includes('"ok":true') && src.match(/catch.*\{[^}]*"ok":true/s))
            warn(`${path}: catch block silently returns ok — log the error`);

        // TODO markers
        const todos = (src.match(/\/\/\s*TODO:/g) || []).length;
        if (todos > 0)
            warn(`${path}: ${todos} TODO comment(s) — stub endpoint should return 501 not 200`);

        // console.log in production (acceptable, just flag excess)
        const logs = (src.match(/console\.log\(/g) || []).length;
        if (logs > 5)
            warn(`${path}: ${logs} console.log calls — consider reducing`);
    }
    if (warnings === 0) info('All functions clean');
}

checkFunctions();

console.log('\n' + '─'.repeat(50));
if (warnings > 0) {
    console.warn(`\n${warnings} lint warning(s)\n`);
} else {
    console.log('\nLint clean\n');
}
