#!/usr/bin/env node
// tg-bridge.js — Live Telegram terminal bridge for TafsirKurd
// Run: node tg-bridge.js
// Press Ctrl+C to stop

const https = require('https');

const SECRET = 'TK-relay-2026';
const HOST   = 'tafsirkurd.com';

let lastOffset = 0; // tracks position — passed on reconnect so no messages are lost

function connect() {
    const path = `/tg-relay?action=stream&secret=${SECRET}${lastOffset ? `&offset=${lastOffset}` : ''}`;

    process.stdout.write('\r\x1B[2K🔌 Connecting...');

    const req = https.request({
        hostname: HOST,
        path,
        method: 'GET',
        headers: { 'Accept': 'text/event-stream', 'Cache-Control': 'no-cache' },
    }, (res) => {
        if (res.statusCode !== 200) {
            process.stdout.write(`\r\x1B[2K❌ HTTP ${res.statusCode} — retrying in 3s\n`);
            setTimeout(connect, 3000);
            return;
        }

        process.stdout.write('\r\x1B[2K✅ Live — Telegram messages will appear here instantly\n\n');

        let buf = '';
        res.on('data', (chunk) => {
            buf += chunk.toString();
            const lines = buf.split('\n');
            buf = lines.pop(); // keep any incomplete line

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const msg = JSON.parse(line.slice(6));
                    if (msg.updateId) lastOffset = msg.updateId + 1;
                    const time = new Date(msg.ts * 1000).toLocaleTimeString('en-GB');
                    console.log(`[${time}] 📱 ${msg.user}: ${msg.text}`);
                } catch { /* ignore malformed lines */ }
            }
        });

        res.on('end', () => {
            // Worker timed out — reconnect immediately, resume from lastOffset
            setTimeout(connect, 500);
        });

        res.on('error', () => setTimeout(connect, 2000));
    });

    req.on('error', (e) => {
        process.stdout.write(`\r\x1B[2K❌ ${e.message} — retrying in 3s\n`);
        setTimeout(connect, 3000);
    });

    req.end();
}

console.log('═══════════════════════════════════════');
console.log('  TafsirKurd  •  Telegram Live Bridge');
console.log('  Ctrl+C to stop');
console.log('═══════════════════════════════════════\n');

connect();
