// Advanced Bot Detection and Blocking System
// Detects and blocks malicious bots, crawlers, and automated traffic

(function() {
    'use strict';

    const BotDetector = {
        // Known bot user agents
        botPatterns: [
            /bot/i, /crawl/i, /spider/i, /slurp/i, /archiv/i,
            /curl/i, /wget/i, /python/i, /java/i, /http/i,
            /scraper/i, /mediapartners/i, /facebookexternalhit/i,
            /twitterbot/i, /whatsapp/i, /telegrambot/i,
            /postman/i, /insomnia/i, /axios/i, /fetch/i,
            /headless/i, /phantom/i, /selenium/i, /webdriver/i,
            /scrapy/i, /beautiful soup/i, /mechanize/i,
            /applebot/i, /bingbot/i, /googlebot/i, /baiduspider/i,
            /yandex/i, /duckduckbot/i, /slackbot/i, /discordbot/i,
            /linkedinbot/i, /pinterestbot/i, /redditbot/i,
            /ahrefsbot/i, /semrushbot/i, /mj12bot/i, /dotbot/i,
            /petalbot/i, /serpstatbot/i, /blexbot/i, /dataprovider/i
        ],

        // Allowed search engine bots (won't be blocked, but tracked)
        allowedBots: [
            /googlebot/i,
            /bingbot/i,
            /duckduckbot/i,
            /baiduspider/i,
            /yandexbot/i
        ],

        // Check if user agent is a bot
        isBot(userAgent) {
            if (!userAgent) return true; // No user agent = suspicious

            // Check against bot patterns
            for (let pattern of this.botPatterns) {
                if (pattern.test(userAgent)) {
                    return true;
                }
            }
            return false;
        },

        // Check if it's an allowed search engine bot
        isAllowedBot(userAgent) {
            for (let pattern of this.allowedBots) {
                if (pattern.test(userAgent)) {
                    return true;
                }
            }
            return false;
        },

        // Advanced bot detection techniques
        detectAdvancedBot() {
            const checks = {
                noWebdriver: typeof navigator.webdriver === 'undefined',
                hasPlugins: navigator.plugins && navigator.plugins.length > 0,
                hasLanguages: navigator.languages && navigator.languages.length > 0,
                hasDeviceMemory: 'deviceMemory' in navigator,
                hasHardwareConcurrency: 'hardwareConcurrency' in navigator,
                hasCanvas: (() => {
                    try {
                        const canvas = document.createElement('canvas');
                        return !!(canvas.getContext && canvas.getContext('2d'));
                    } catch (e) {
                        return false;
                    }
                })(),
                hasWebGL: (() => {
                    try {
                        const canvas = document.createElement('canvas');
                        return !!(window.WebGLRenderingContext &&
                                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                    } catch (e) {
                        return false;
                    }
                })(),
                hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                screenDepth: window.screen && window.screen.colorDepth > 0,
                timezoneOffset: new Date().getTimezoneOffset() !== 0 || true,
                hasLocalStorage: (() => {
                    try {
                        return typeof localStorage !== 'undefined';
                    } catch (e) {
                        return false;
                    }
                })()
            };

            // Calculate bot score (higher = more likely bot)
            let botScore = 0;
            if (navigator.webdriver === true) botScore += 50; // Selenium/WebDriver
            if (!checks.hasPlugins) botScore += 10;
            if (!checks.hasLanguages) botScore += 15;
            if (!checks.hasCanvas) botScore += 20;
            if (!checks.hasWebGL) botScore += 20;
            if (!checks.hasLocalStorage) botScore += 10;

            return {
                isBot: botScore >= 30,
                score: botScore,
                checks: checks
            };
        },

        // Get bot information
        getBotInfo(userAgent) {
            const info = {
                userAgent: userAgent || navigator.userAgent,
                isBot: false,
                botType: 'human',
                isAllowed: true,
                timestamp: new Date().toISOString(),
                ip: null, // Will be filled by server
                page: window.location.pathname,
                referrer: document.referrer || 'direct'
            };

            // Check user agent
            if (this.isBot(userAgent || navigator.userAgent)) {
                info.isBot = true;

                // Check if it's an allowed bot
                if (this.isAllowedBot(userAgent || navigator.userAgent)) {
                    info.botType = 'search-engine';
                    info.isAllowed = true;
                } else {
                    info.botType = 'malicious';
                    info.isAllowed = false;
                }
            } else {
                // Advanced detection
                const advanced = this.detectAdvancedBot();
                if (advanced.isBot) {
                    info.isBot = true;
                    info.botType = 'headless-browser';
                    info.isAllowed = false;
                    info.botScore = advanced.score;
                    info.checks = advanced.checks;
                }
            }

            return info;
        },

        // Log bot to server
        async logBot(botInfo) {
            try {
                const response = await fetch('/.netlify/functions/log-bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(botInfo)
                });

                if (!response.ok) {
                    console.warn('Failed to log bot');
                }

                return await response.json();
            } catch (error) {
                console.warn('Error logging bot:', error);
                return null;
            }
        },

        // Block bot with message
        blockBot(reason) {
            // Clear page
            document.body.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    margin: 0;
                    padding: 20px;
                    direction: rtl;
                ">
                    <div style="
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        max-width: 500px;
                        text-align: center;
                    ">
                        <div style="font-size: 64px; margin-bottom: 20px;">🚫</div>
                        <h1 style="color: #333; margin-bottom: 10px; font-size: 24px;">
                            دەستڕاگەیشتن قەدەغە کراوە
                        </h1>
                        <p style="color: #666; line-height: 1.8; font-size: 16px;">
                            ئەم سایتە تەنها بۆ بەکارهێنەرانی مرۆڤ دروست کراوە.
                            <br>
                            بۆتەکان و کراولەرە خۆکارەکان ڕێگەپێنەدراون.
                        </p>
                        <div style="
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 10px;
                            margin-top: 20px;
                            font-size: 14px;
                            color: #666;
                        ">
                            <strong>هۆکار:</strong> ${reason}
                        </div>
                        <p style="color: #999; font-size: 13px; margin-top: 20px;">
                            ئەگەر تۆ بەکارهێنەرێکی مرۆڤی، پەیوەندیمان پێوە بکە.
                        </p>
                    </div>
                </div>
            `;

            // Prevent further execution
            throw new Error('Bot blocked: ' + reason);
        },

        // Initialize bot detection
        async init() {
            console.log('🤖 Bot detector initialized');

            const userAgent = navigator.userAgent;
            const botInfo = this.getBotInfo(userAgent);

            console.log('Bot detection result:', botInfo);

            // Log all bots (allowed and malicious)
            if (botInfo.isBot) {
                await this.logBot(botInfo);

                // Block malicious bots
                if (!botInfo.isAllowed) {
                    console.warn('🚫 Malicious bot detected, blocking...');
                    this.blockBot(botInfo.botType);
                } else {
                    console.log('✅ Search engine bot detected (allowed)');
                }
            } else {
                console.log('✅ Human user detected');
            }

            return botInfo;
        }
    };

    // Auto-initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            BotDetector.init();
        });
    } else {
        BotDetector.init();
    }

    // Export to window
    window.BotDetector = BotDetector;
})();
