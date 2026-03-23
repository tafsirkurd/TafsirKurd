const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nvwgepkhzobgwnzibpvq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Kurdish Zceer/Dhikr Collection (Best and varied)
const ZCEER_COLLECTION = [
    {
        category: 'Tasbih',
        kurdish: 'سوبحانەڵڵا',
        arabic: 'سُبْحَانَ اللّٰهِ',
        transliteration: 'Subhanallah',
        english: 'Glory be to Allah',
        benefit: 'Who says it 100 times, all his sins will be forgiven even if they are like the foam of the sea'
    },
    {
        category: 'Tahmid',
        kurdish: 'ئەلحەمدولیلا',
        arabic: 'الْحَمْدُ لِلّٰهِ',
        transliteration: 'Alhamdulillah',
        english: 'All praise is due to Allah',
        benefit: 'It fills the scales of good deeds'
    },
    {
        category: 'Takbir',
        kurdish: 'ئاڵڵا گەورەترە',
        arabic: 'اللّٰهُ أَكْبَرُ',
        transliteration: 'Allahu Akbar',
        english: 'Allah is the Greatest',
        benefit: 'It is more beloved to Allah than anything in this world'
    },
    {
        category: 'Tawhid',
        kurdish: 'لا ئیلاهە ئیلالا',
        arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ',
        transliteration: 'La ilaha illallah',
        english: 'There is no deity except Allah',
        benefit: 'The best dhikr and the key to Paradise'
    },
    {
        category: 'Salawat',
        kurdish: 'ئاڵڵاهوممە سەللی عەلا موحەممەد',
        arabic: 'اَللّٰهُمَّ صَلِّ عَلٰى مُحَمَّدٍ',
        transliteration: 'Allahumma salli ala Muhammad',
        english: 'O Allah, send blessings upon Muhammad',
        benefit: 'Whoever sends blessings upon me once, Allah will send blessings upon him ten times'
    },
    {
        category: 'Morning Dhikr',
        kurdish: 'رەزای بووم بەلڵا پەروەردگار و بە ئیسلامی ئاین و بە موحەممەد پێغەمبەر',
        arabic: 'رَضِيتُ بِاللّٰهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ نَبِيًّا',
        transliteration: 'Raditu billahi rabban wa bil-islami dinan wa bi-Muhammadin nabiyyan',
        english: 'I am pleased with Allah as Lord, Islam as religion, and Muhammad as Prophet',
        benefit: 'Whoever says it in the morning, Paradise becomes obligatory for him'
    },
    {
        category: 'Protection',
        kurdish: 'بسمالڵا، ئەوەی لەگەڵ ناڤیدا هیچ شتەک زیان نەگەهێنێ',
        arabic: 'بِسْمِ اللّٰهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        transliteration: 'Bismillahil-ladhi la yadurru ma\'asmihi shay\'un fil-ardi wa la fis-sama\'i wa huwas-Samee\'ul-\'Aleem',
        english: 'In the name of Allah, with whose name nothing can harm on earth or in heaven, and He is the All-Hearing, All-Knowing',
        benefit: 'Nothing will harm you (3 times in morning and evening)'
    },
    {
        category: 'Forgiveness',
        kurdish: 'ئەستەغفیرولڵا',
        arabic: 'أَسْتَغْفِرُ اللّٰهَ',
        transliteration: 'Astaghfirullah',
        english: 'I seek forgiveness from Allah',
        benefit: 'The master of seeking forgiveness - say it 100 times daily'
    },
    {
        category: 'Reliance',
        kurdish: 'حەسبونالڵا و نعمەل وەکیل',
        arabic: 'حَسْبُنَا اللّٰهُ وَنِعْمَ الْوَكِيلُ',
        transliteration: 'Hasbunallahu wa ni\'mal wakeel',
        english: 'Allah is sufficient for us, and He is the best Disposer of affairs',
        benefit: 'What Ibrahim عليه السلام said when thrown in fire, and what the Prophet ﷺ said before Uhud'
    },
    {
        category: 'Gratitude',
        kurdish: 'ئەلحەمدولیلای کە بە نیعمەتەکانی کارە چاکەکان تەواو دەبن',
        arabic: 'الْحَمْدُ لِلّٰهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ',
        transliteration: 'Alhamdulillahil-ladhi bi-ni\'matihi tatimmus-salihat',
        english: 'All praise is due to Allah by whose blessings good deeds are completed',
        benefit: 'Say it when something good happens'
    },
    {
        category: 'Best Dhikr',
        kurdish: 'لا ئیلاهە ئیلالڵا وەحدەهو لا شەریکە لەهو، لەهول موڵکو و لەهول حەمدو و هووە عەلا کوللی شەیئین قەدیر',
        arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration: 'La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa huwa \'ala kulli shay\'in qadeer',
        english: 'There is no deity except Allah alone, He has no partner. To Him belongs the dominion and praise, and He has power over all things',
        benefit: 'Whoever says it 10 times, it is as if they freed 4 slaves from the children of Ismail'
    },
    {
        category: 'Evening Protection',
        kurdish: 'ئەمسەینا و ئەمسەل موڵکو لیلا',
        arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلّٰهِ',
        transliteration: 'Amsayna wa amsal-mulku lillah',
        english: 'We have reached the evening and the dominion belongs to Allah',
        benefit: 'Say it in the evening for protection'
    },
    {
        category: 'Seeking Knowledge',
        kurdish: 'خودایە، زانیاریم زیاد بکە',
        arabic: 'رَبِّ زِدْنِي عِلْمًا',
        transliteration: 'Rabbi zidni \'ilma',
        english: 'My Lord, increase me in knowledge',
        benefit: 'The only thing Allah commanded His Prophet to ask for increase in'
    },
    {
        category: 'Ease',
        kurdish: 'خودایە، ئاسان بیکە و قورس مەکە',
        arabic: 'اللّٰهُمَّ يَسِّرْ وَلَا تُعَسِّرْ',
        transliteration: 'Allahumma yassir wa la tu\'assir',
        english: 'O Allah, make it easy and do not make it difficult',
        benefit: 'For seeking ease in any matter'
    },
    {
        category: 'Trust',
        kurdish: 'لەسەر ئاڵڵا تەوەککول دەکەم',
        arabic: 'عَلَى اللّٰهِ تَوَكَّلْتُ',
        transliteration: '\'Alallahi tawakkaltu',
        english: 'Upon Allah I have placed my trust',
        benefit: 'Say it when leaving the house - you will be protected and guided'
    },
    {
        category: 'Before Sleep',
        kurdish: 'بە ناڤیتەوە دەمرم و بە ناڤیتەوە زیندوو دەبمەوە',
        arabic: 'بِاسْمِكَ اللّٰهُمَّ أَمُوتُ وَأَحْيَا',
        transliteration: 'Bismika Allahumma amutu wa ahya',
        english: 'In Your name O Allah, I die and I live',
        benefit: 'Say before sleeping'
    },
    {
        category: 'Upon Waking',
        kurdish: 'ستایش بۆ ئاڵڵا کە ژیانی دایینەوە دوای ئەوەی میراندین',
        arabic: 'الْحَمْدُ لِلّٰهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
        transliteration: 'Alhamdulillahil-ladhi ahyana ba\'da ma amatana wa ilayhinnushur',
        english: 'All praise to Allah who gave us life after causing us to die, and to Him is the resurrection',
        benefit: 'Say upon waking up'
    },
    {
        category: 'After Prayer',
        kurdish: 'خودایە، یارمەتیم بدە لە یادکردنی خۆت و سوپاسگوزاریت و باش پەرستیشتت',
        arabic: 'اللّٰهُمَّ أَعِنِّي عَلَىٰ ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
        transliteration: 'Allahumma a\'inni \'ala dhikrika wa shukrika wa husni \'ibadatik',
        english: 'O Allah, help me to remember You, to thank You, and to worship You in the best manner',
        benefit: 'The Prophet taught this to Muadh after prayer'
    },
    {
        category: 'Hardship',
        kurdish: 'لا ئیلاهە ئیلالڵا ئەلعەزیمول حەلیم',
        arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ الْعَظِيمُ الْحَلِيمُ',
        transliteration: 'La ilaha illallahul-\'Azeemul-Haleem',
        english: 'There is no deity except Allah, the All-Mighty, the Forbearing',
        benefit: 'Say it during times of distress'
    },
    {
        category: 'Contentment',
        kurdish: 'ئاڵڵا بەسە بۆ من، جگە لەو خودایەک نیە',
        arabic: 'اللّٰهُ رَبِّي لَا أُشْرِكُ بِهِ شَيْئًا',
        transliteration: 'Allahu rabbi la ushriku bihi shay\'a',
        english: 'Allah is my Lord, I do not associate anything with Him',
        benefit: 'For contentment and removing shirk from the heart'
    }
];

function sendDiscordWebhook(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(webhookUrl);
        const data = JSON.stringify(payload);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 204 || res.statusCode === 200) {
                    resolve({ success: true });
                } else {
                    reject(new Error(`Discord API error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function getDailyStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get stats
    const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

    const { count: todayUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

    const { count: yesterdayUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());

    const { data: readData } = await supabase
        .from('user_profiles')
        .select('ayahs_read');

    const totalAyahs = readData?.reduce((sum, user) => sum + (user.ayahs_read || 0), 0) || 0;

    const { count: completedUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('ayahs_read', 6236);

    return {
        totalUsers,
        todayUsers,
        yesterdayUsers,
        totalAyahs,
        completedUsers,
        trend: todayUsers > yesterdayUsers ? '📈 Growing' : todayUsers < yesterdayUsers ? '📉 Slower' : '➡️ Steady'
    };
}

function getRandomZceer(count = 3) {
    const shuffled = [...ZCEER_COLLECTION].sort(() => 0.5 - Math.random());

    // Ensure different categories
    const selected = [];
    const usedCategories = new Set();

    for (const zceer of shuffled) {
        if (!usedCategories.has(zceer.category)) {
            selected.push(zceer);
            usedCategories.add(zceer.category);
            if (selected.length === count) break;
        }
    }

    return selected;
}

async function sendDailyReport() {
    console.log('📊 Generating daily report...\n');

    try {
        const stats = await getDailyStats();
        const zceerList = getRandomZceer(3);

        // Daily Stats Embed
        const statsEmbed = {
            title: '📊 Daily Tafsir Kurd Report',
            description: `**${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**`,
            color: 0x5865F2,
            fields: [
                {
                    name: '👥 Total Users',
                    value: String(stats.totalUsers || 0),
                    inline: true
                },
                {
                    name: '🆕 New Today',
                    value: String(stats.todayUsers || 0),
                    inline: true
                },
                {
                    name: '📈 Trend',
                    value: stats.trend,
                    inline: true
                },
                {
                    name: '📖 Total Ayahs Read',
                    value: String(stats.totalAyahs),
                    inline: true
                },
                {
                    name: '🏆 Completed Quran',
                    value: String(stats.completedUsers || 0),
                    inline: true
                },
                {
                    name: '📅 Yesterday',
                    value: `${stats.yesterdayUsers || 0} new users`,
                    inline: true
                }
            ],
            footer: {
                text: 'Tafsir Kurd Daily Report',
                icon_url: 'https://tafsirkurd.com/logo192.png'
            },
            timestamp: new Date().toISOString()
        };

        // Zceer Embeds
        const zceerEmbeds = zceerList.map((zceer, index) => ({
            title: `${['🌙', '✨', '💫'][index]} ${zceer.category} - Zceer ${index + 1}`,
            description: `**${zceer.arabic}**\n\n**${zceer.kurdish}**`,
            color: [0x00FF00, 0xFFD700, 0x1ABC9C][index],
            fields: [
                {
                    name: '📝 Transliteration',
                    value: zceer.transliteration,
                    inline: false
                },
                {
                    name: '🇬🇧 English',
                    value: zceer.english,
                    inline: false
                },
                {
                    name: '🎁 Benefit',
                    value: zceer.benefit,
                    inline: false
                }
            ],
            footer: {
                text: 'Daily Zceer from Tafsir Kurd',
                icon_url: 'https://tafsirkurd.com/logo192.png'
            }
        }));

        // Send to Discord
        await sendDiscordWebhook(DISCORD_WEBHOOK_URL, {
            username: 'Tafsir Kurd Daily Report',
            avatar_url: 'https://tafsirkurd.com/logo512.png',
            embeds: [statsEmbed, ...zceerEmbeds]
        });

        console.log('✅ Daily report sent successfully!');
        console.log(`📊 Stats: ${stats.totalUsers} total users, ${stats.todayUsers} new today`);
        console.log(`🌙 Sent 3 Zceer: ${zceerList.map(z => z.category).join(', ')}\n');

    } catch (error) {
        console.error('❌ Error sending daily report:', error.message);
    }
}

// Run the daily report
sendDailyReport();
