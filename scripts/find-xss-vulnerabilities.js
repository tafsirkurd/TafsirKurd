const fs = require('fs');
const path = require('path');

console.log('🔍 XSS Vulnerability Scanner for TafsirKurd\n');
console.log('='  .repeat(60));

// Files to scan
const filesToScan = [
    { path: 'src/admin.html', name: 'Admin Panel' },
    { path: 'src/Quran.html', name: 'Quran Reader' }
];

// Patterns that indicate potential XSS
const dangerousPatterns = [
    { pattern: /\.innerHTML\s*=/g, risk: 'HIGH', name: 'innerHTML assignment' },
    { pattern: /\.outerHTML\s*=/g, risk: 'HIGH', name: 'outerHTML assignment' },
    { pattern: /document\.write\(/g, risk: 'HIGH', name: 'document.write()' },
    { pattern: /eval\(/g, risk: 'CRITICAL', name: 'eval()' },
    { pattern: /setTimeout\([^)]*\$\{/g, risk: 'HIGH', name: 'setTimeout with template literal' },
    { pattern: /setInterval\([^)]*\$\{/g, risk: 'HIGH', name: 'setInterval with template literal' }
];

// Safe patterns (lowercase for case-insensitive matching)
const safePatterns = [
    'loading',
    'empty-state',
    '<div class=',
    'spinner',
    'no data',
    'error:',
    'loading...'
];

function assessRisk(line) {
    const lowerLine = line.toLowerCase();

    // Check if line contains user/database variables
    const hasUserData = /\$\{[^}]*(user|data|name|email|message|country|region|city|location|item|value)[^}]*\}/i.test(line);

    // Check if line is likely static content
    const isStaticContent = safePatterns.some(pattern => lowerLine.includes(pattern));

    if (hasUserData) {
        return 'CRITICAL';
    } else if (isStaticContent) {
        return 'LOW';
    } else if (line.includes('${')) {
        return 'MEDIUM';
    } else {
        return 'LOW';
    }
}

function getSuggestedFix(line, lineNumber) {
    // Extract variable name if possible
    const match = line.match(/\$\{([^}]+)\}/);
    const variable = match ? match[1].trim() : 'data';

    if (line.includes('.innerHTML') && line.includes('.map(')) {
        return `
Suggested fix for line ${lineNumber}:
1. Clear the element: element.innerHTML = '';
2. Use forEach + createElement:
   items.forEach(item => {
       const el = document.createElement('tr');  // or appropriate tag
       el.textContent = item.${variable};
       element.appendChild(el);
   });
3. Or use safeBuildHTML() helper from xss-protection.js
`;
    } else if (line.includes('.innerHTML') && line.includes('${')) {
        return `
Suggested fix for line ${lineNumber}:
Replace innerHTML with textContent:
   const el = document.createElement('div');  // or appropriate tag
   el.textContent = ${variable};
   parentElement.appendChild(el);
`;
    } else {
        return `
Suggested fix for line ${lineNumber}:
Review this line and use textContent instead of innerHTML if possible.
`;
    }
}

let totalVulnerabilities = 0;
const vulnerabilitiesByRisk = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: []
};

// Scan each file
filesToScan.forEach(fileInfo => {
    const filePath = path.join(process.cwd(), fileInfo.path);

    if (!fs.existsSync(filePath)) {
        console.log(`\n⚠️  File not found: ${fileInfo.path}`);
        return;
    }

    console.log(`\n📄 Scanning: ${fileInfo.name} (${fileInfo.path})`);
    console.log('-'.repeat(60));

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    dangerousPatterns.forEach(({ pattern, risk, name }) => {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);

        lines.forEach((line, index) => {
            if (regex.test(line)) {
                totalVulnerabilities++;

                const lineNumber = index + 1;
                const trimmedLine = line.trim();
                const actualRisk = risk === 'HIGH' ? assessRisk(trimmedLine) : risk;

                const vulnerability = {
                    file: fileInfo.path,
                    line: lineNumber,
                    code: trimmedLine.substring(0, 100),
                    pattern: name,
                    risk: actualRisk
                };

                vulnerabilitiesByRisk[actualRisk].push(vulnerability);

                console.log(`\n${actualRisk === 'CRITICAL' ? '🔴' : actualRisk === 'HIGH' ? '🟡' : '🟢'} Line ${lineNumber} [${actualRisk}]: ${name}`);
                console.log(`   Code: ${trimmedLine.substring(0, 80)}...`);
            }
        });
    });
});

// Summary report
console.log('\n');
console.log('='.repeat(60));
console.log('📊 SCAN SUMMARY');
console.log('='.repeat(60));

console.log(`\nTotal potential vulnerabilities found: ${totalVulnerabilities}\n`);

console.log(`🔴 CRITICAL: ${vulnerabilitiesByRisk.CRITICAL.length} (user/database data in innerHTML)`);
console.log(`🟡 HIGH:     ${vulnerabilitiesByRisk.HIGH.length} (innerHTML with variables)`);
console.log(`🟠 MEDIUM:   ${vulnerabilitiesByRisk.MEDIUM.length} (innerHTML with template literals)`);
console.log(`🟢 LOW:      ${vulnerabilitiesByRisk.LOW.length} (innerHTML with static content)`);

// Detailed breakdown
console.log('\n📋 DETAILED BREAKDOWN\n');

['CRITICAL', 'HIGH', 'MEDIUM'].forEach(risk => {
    if (vulnerabilitiesByRisk[risk].length > 0) {
        console.log(`\n${risk} PRIORITY (${vulnerabilitiesByRisk[risk].length} issues):`);
        console.log('-'.repeat(60));

        vulnerabilitiesByRisk[risk].slice(0, 10).forEach((vuln, index) => {
            console.log(`\n${index + 1}. ${vuln.file}:${vuln.line}`);
            console.log(`   Pattern: ${vuln.pattern}`);
            console.log(`   Code: ${vuln.code.substring(0, 70)}...`);
        });

        if (vulnerabilitiesByRisk[risk].length > 10) {
            console.log(`\n   ... and ${vulnerabilitiesByRisk[risk].length - 10} more`);
        }
    }
});

// Recommendations
console.log('\n');
console.log('='.repeat(60));
console.log('💡 RECOMMENDATIONS');
console.log('='.repeat(60));

if (vulnerabilitiesByRisk.CRITICAL.length > 0) {
    console.log('\n🔴 CRITICAL ACTION REQUIRED:');
    console.log('   1. Fix all CRITICAL issues immediately (user/database data)');
    console.log('   2. These are actively exploitable XSS vulnerabilities');
    console.log('   3. See FIX_XSS_VULNERABILITIES.md for detailed fixes');
}

if (vulnerabilitiesByRisk.HIGH.length > 0) {
    console.log('\n🟡 HIGH PRIORITY:');
    console.log('   1. Review and fix HIGH priority items');
    console.log('   2. Use textContent or safeBuildHTML() helpers');
    console.log('   3. Never use innerHTML with user-controlled data');
}

if (vulnerabilitiesByRisk.MEDIUM.length > 0) {
    console.log('\n🟠 MEDIUM PRIORITY:');
    console.log('   1. Review template literals in innerHTML');
    console.log('   2. Ensure all dynamic content is escaped');
    console.log('   3. Consider refactoring to use createElement()');
}

console.log('\n📚 RESOURCES:');
console.log('   • Fix Guide: FIX_XSS_VULNERABILITIES.md');
console.log('   • XSS Utility: src/utils/xss-protection.js');
console.log('   • Security Status: SECURITY_FIXES_COMPLETED.md');

console.log('\n✅ NEXT STEPS:');
console.log('   1. Read FIX_XSS_VULNERABILITIES.md');
console.log('   2. Include xss-protection.js in HTML files');
console.log('   3. Fix CRITICAL issues first');
console.log('   4. Test with XSS payloads');
console.log('   5. Update security documentation');

console.log('\n' + '='.repeat(60));

// Export detailed report to JSON
const report = {
    timestamp: new Date().toISOString(),
    totalVulnerabilities,
    byRisk: {
        critical: vulnerabilitiesByRisk.CRITICAL.length,
        high: vulnerabilitiesByRisk.HIGH.length,
        medium: vulnerabilitiesByRisk.MEDIUM.length,
        low: vulnerabilitiesByRisk.LOW.length
    },
    details: vulnerabilitiesByRisk
};

fs.writeFileSync(
    path.join(process.cwd(), 'xss-scan-report.json'),
    JSON.stringify(report, null, 2)
);

console.log('\n📄 Detailed report saved to: xss-scan-report.json\n');

// Exit code based on severity
if (vulnerabilitiesByRisk.CRITICAL.length > 0) {
    process.exit(2); // Critical vulnerabilities found
} else if (vulnerabilitiesByRisk.HIGH.length > 0) {
    process.exit(1); // High vulnerabilities found
} else {
    process.exit(0); // Only low/medium vulnerabilities
}
