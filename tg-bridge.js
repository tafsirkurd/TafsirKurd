#!/usr/bin/env node
// tg-bridge.js — Live Telegram terminal bridge for TafsirKurd
// Usage: node tg-bridge.js
// Press Ctrl+C to stop

const https = require('https');

const SECRET = 'TK-relay-2026';
const HOST   = 'tafsirkurd.com';
const BASE   = `/tg-relay?action=stream&secret=${SECRET}`;

let lastTs = 0;

function connect() {
    const path = BASE + (lastTs ? `&since=${lastTs}` : '');

    process.stdout.write('\r\x1B[2K🔌 Connecting to bridge...');

    const req = https.request({ hostname: HOST, path, method: 'GET',
        headers: { 'Accept': 'text/event-stream', 'Cache-Control': 'no-cache' }
    }, (res) => {
        if (res.statusCode !== 200) {
            process.stdout.write(`\r\x1B[2K❌ HTTP ${res.statusCode} — retrying in 3s\n`);
            setTimeout(connect, 3000);
            return;
        }

        process.stdout.write('\r\x1B[2K✅ Bridge live — waiting for messages from Saman...\n\n');

        let buf = '';
        res.on('data', (chunk) => {
            buf += chunk.toString();
            const lines = buf.split('\n');
            buf = lines.pop(); // keep incomplete line

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const msg = JSON.parse(line.slice(6));
                    lastTs = Math.max(lastTs, msg.ts);
                    const time = new Date(msg.ts * 1000).toLocaleTimeString('en-GB');
                    console.log(`[${time}] 📱 ${msg.user}: ${msg.text}`);
                } catch { /* ignore malformed */ }
            }
        });

        res.on('end', () => {
            process.stdout.write('🔄 Reconnecting...\n');
            setTimeout(connect, 1000);
        });

        res.on('error', (e) => {
            process.stdout.write(`❌ Stream error: ${e.message} — reconnecting\n`);
            setTimeout(connect, 2000);
        });
    });

    req.on('error', (e) => {
        process.stdout.write(`\r\x1B[2K❌ ${e.message} — retrying in 3s\n`);
        setTimeout(connect, 3000);
    });

    req.end();
}

console.log('═══════════════════════════════════════');
console.log('  TafsirKurd  •  Telegram Bridge');
console.log('  Press Ctrl+C to stop');
console.log('═══════════════════════════════════════\n');

connect();
