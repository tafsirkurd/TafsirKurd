const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const DISCORD_WEBHOOK_STATS = process.env.DISCORD_WEBHOOK_STATS; // For stats
const DISCORD_WEBHOOK_ZCEER = process.env.DISCORD_WEBHOOK_ZCEER; // For zceer/dhikr
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nvwgepkhzobgwnzibpvq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Best Dhikr Collection (Arabic only - best and most varied)
const ZCEER_COLLECTION = [
    {
        category: 'Tasbih',
        arabic: 'سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ سُبْحَانَ اللّٰهِ الْعَظِيمِ',
        transliteration: 'Subhanallahi wa bihamdihi, Subhanallahil-Azeem',
        english: 'Glory be to Allah and praise Him, Glory be to Allah the Almighty',
        benefit: 'Two words light on the tongue, heavy on the Scale, beloved to the Most Merciful'
    },
    {
        category: 'Tawhid',
        arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration: 'La ilaha illallahu wahdahu la shareeka lah, lahul-mulku wa lahul-hamdu wa huwa \'ala kulli shay\'in qadeer',
        english: 'None has the right to be worshipped but Allah alone, He has no partner. To Him belongs the dominion and praise, and He has power over all things',
        benefit: 'Whoever says it 10 times, as if they freed 4 slaves from the children of Ismail'
    },
    {
        category: 'Salawat',
        arabic: 'اَللّٰهُمَّ صَلِّ عَلٰى مُحَمَّدٍ وَعَلٰى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلٰى إِبْرَاهِيمَ وَعَلٰى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
        transliteration: 'Allahumma salli \'ala Muhammadin wa \'ala ali Muhammad, kama sallayta \'ala Ibraheema wa \'ala ali Ibraheem, innaka Hameedun Majeed',
        english: 'O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim. Verily, You are Praiseworthy and Glorious',
        benefit: 'Whoever sends blessings upon me once, Allah will send blessings upon him ten times'
    },
    {
        category: 'Morning Dhikr',
        arabic: 'رَضِيتُ بِاللّٰهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ نَبِيًّا',
        transliteration: 'Raditu billahi rabban wa bil-islami dinan wa bi-Muhammadin nabiyyan',
        english: 'I am pleased with Allah as Lord, Islam as religion, and Muhammad as Prophet',
        benefit: 'Whoever says it in the morning, Paradise becomes obligatory for him'
    },
    {
        category: 'Protection',
        arabic: 'بِسْمِ اللّٰهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        transliteration: 'Bismillahil-ladhi la yadurru ma\'asmihi shay\'un fil-ardi wa la fis-sama\'i wa huwas-Samee\'ul-\'Aleem',
        english: 'In the name of Allah, with whose name nothing can harm on earth or in heaven, and He is the All-Hearing, All-Knowing',
        benefit: 'Nothing will harm you - say 3 times in morning and evening'
    },
    {
        category: 'Forgiveness',
        arabic: 'أَسْتَغْفِرُ اللّٰهَ الْعَظِيمَ الَّذِي لَا إِلٰهَ إِلَّا هُوَ الْحَيَّ الْقَيُّومَ وَأَتُوبُ إِلَيْهِ',
        transliteration: 'Astaghfirullahil-\'Azeemil-ladhi la ilaha illa Huwal-Hayyul-Qayyoomu wa atubu ilayh',
        english: 'I seek forgiveness from Allah the Almighty, there is no deity except Him, the Ever-Living, the Sustainer, and I repent to Him',
        benefit: 'Even if you fled from battle, your sins will be forgiven'
    },
    {
        category: 'Reliance',
        arabic: 'حَسْبُنَا اللّٰهُ وَنِعْمَ الْوَكِيلُ',
        transliteration: 'Hasbunallahu wa ni\'mal wakeel',
        english: 'Allah is sufficient for us, and He is the best Disposer of affairs',
        benefit: 'What Ibrahim عليه السلام said when thrown in fire'
    },
    {
        category: 'Gratitude',
        arabic: 'الْحَمْدُ لِلّٰهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ',
        transliteration: 'Alhamdulillahil-ladhi bi-ni\'matihi tatimmus-salihat',
        english: 'All praise is due to Allah by whose blessings good deeds are completed',
        benefit: 'Say when something good happens'
    },
    {
        category: 'Evening',
        arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلّٰهِ وَالْحَمْدُ لِلّٰهِ',
        transliteration: 'Amsayna wa amsal-mulku lillahi wal-hamdu lillah',
        english: 'We have reached the evening and the dominion belongs to Allah, and all praise is for Allah',
        benefit: 'Say in the evening for protection'
    },
    {
        category: 'Knowledge',
        arabic: 'رَبِّ زِدْنِي عِلْمًا',
        transliteration: 'Rabbi zidni \'ilma',
        english: 'My Lord, increase me in knowledge',
        benefit: 'The only thing Allah commanded His Prophet to ask for increase in'
    },
    {
        category: 'Ease',
        arabic: 'اللّٰهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
        transliteration: 'Allahumma la sahla illa ma ja\'altahu sahla, wa anta taj\'alul-hazna idha shi\'ta sahla',
        english: 'O Allah, there is no ease except what You make easy, and You make difficulty easy if You wish',
        benefit: 'For seeking ease in difficulty'
    },
    {
        category: 'Trust',
        arabic: 'تَوَكَّلْتُ عَلَى اللّٰهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ',
        transliteration: 'Tawakkaltu \'alallahi wa la hawla wa la quwwata illa billah',
        english: 'I have placed my trust in Allah, and there is no might and no power except with Allah',
        benefit: 'Say when leaving the house - you will be protected and guided'
    },
    {
        category: 'After Prayer',
        arabic: 'اللّٰهُمَّ أَعِنِّي عَلَىٰ ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
        transliteration: 'Allahumma a\'inni \'ala dhikrika wa shukrika wa husni \'ibadatik',
        english: 'O Allah, help me to remember You, to thank You, and to worship You in the best manner',
        benefit: 'The Prophet taught this to Muadh after prayer'
    },
    {
        category: 'Hardship',
        arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلٰهَ إِلَّا اللّٰهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلٰهَ إِلَّا اللّٰهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',
        transliteration: 'La ilaha illallahul-\'Azeemul-Haleem, la ilaha illallahu Rabbul-\'Arshil-\'Azeem, la ilaha illallahu Rabbus-samawati wa Rabbul-ardi wa Rabbul-\'Arshil-Kareem',
        english: 'There is no deity except Allah, the All-Mighty, the Forbearing. There is no deity except Allah, Lord of the Mighty Throne. There is no deity except Allah, Lord of the heavens and Lord of the earth and Lord of the Noble Throne',
        benefit: 'Say during times of distress - the Prophet said it during hardship'
    },
    {
        category: 'Before Sleep',
        arabic: 'اللّٰهُمَّ بِاسْمِكَ أَمُوتُ وَأَحْيَا',
        transliteration: 'Allahumma bismika amutu wa ahya',
        english: 'O Allah, in Your name I die and I live',
        benefit: 'Say before sleeping'
    },
    {
        category: 'Upon Waking',
        arabic: 'الْحَمْدُ لِلّٰهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
        transliteration: 'Alhamdulillahil-ladhi ahyana ba\'da ma amatana wa ilayhinnushur',
        english: 'All praise to Allah who gave us life after causing us to die, and to Him is the resurrection',
        benefit: 'Say upon waking up'
    },
    {
        category: 'Entering Home',
        arabic: 'اللّٰهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ، بِسْمِ اللّٰهِ وَلَجْنَا وَبِسْمِ اللّٰهِ خَرَجْنَا وَعَلَى اللّٰهِ رَبِّنَا تَوَكَّلْنَا',
        transliteration: 'Allahumma inni as\'aluka khayral-mawliji wa khayral-makhraji, bismillahi walajna wa bismillahi kharajna wa \'alallahi rabbina tawakkalna',
        english: 'O Allah, I ask You for the best entering and the best exiting. In the name of Allah we enter, and in the name of Allah we exit, and upon Allah our Lord we rely',
        benefit: 'Say when entering home'
    },
    {
        category: 'Comprehensive',
        arabic: 'اللّٰهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
        transliteration: 'Allahumma inni as\'alukal-\'afwa wal-\'afiyata fid-dunya wal-akhirah',
        english: 'O Allah, I ask You for forgiveness and well-being in this world and the Hereafter',
        benefit: 'The Prophet\'s most frequent dua - comprehensive and powerful'
    },
    {
        category: 'Patience',
        arabic: 'إِنَّا لِلّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللّٰهُمَّ أْجُرْنِي فِي مُصِيبَتِي وَاخْلُفْ لِي خَيْرًا مِنْهَا',
        transliteration: 'Inna lillahi wa inna ilayhi raji\'oon, Allahumma\'jurni fi museebati wakhluf li khayran minha',
        english: 'Verily we belong to Allah and to Him we shall return. O Allah, reward me in my affliction and replace it with something better',
        benefit: 'Say when afflicted with calamity - Allah will give you better'
    },
    {
        category: 'Comprehensive Dhikr',
        arabic: 'سُبْحَانَ اللّٰهِ وَالْحَمْدُ لِلّٰهِ وَلَا إِلٰهَ إِلَّا اللّٰهُ وَاللّٰهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ',
        transliteration: 'Subhanallah, wal-hamdulillah, wa la ilaha illallah, wallahu akbar, wa la hawla wa la quwwata illa billah',
        english: 'Glory be to Allah, all praise to Allah, none has the right to be worshipped but Allah, Allah is the Greatest, and there is no might and no power except with Allah',
        benefit: 'Comprehensive dhikr covering all types of remembrance'
    },
    {
        category: 'Best Words',
        arabic: 'سُبْحَانَ اللّٰهِ عَدَدَ خَلْقِهِ، سُبْحَانَ اللّٰهِ رِضَا نَفْسِهِ، سُبْحَانَ اللّٰهِ زِنَةَ عَرْشِهِ، سُبْحَانَ اللّٰهِ مِدَادَ كَلِمَاتِهِ',
        transliteration: 'Subhanallahi \'adada khalqihi, Subhanallahi rida nafsihi, Subhanallahi zinata \'arshihi, Subhanallahi midada kalimatihi',
        english: 'Glory be to Allah equal to the number of His creation, Glory be to Allah equal to His pleasure, Glory be to Allah equal to the weight of His Throne, Glory be to Allah equal to the ink of His words',
        benefit: 'These words multiply your reward immensely'
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

        // Zceer Embeds (Arabic only)
        const zceerEmbeds = zceerList.map((zceer, index) => ({
            title: `${['🌙', '✨', '💫'][index]} Daily Dhikr ${index + 1} - ${zceer.category}`,
            description: `\n**${zceer.arabic}**\n\n`,
            color: [0x00FF00, 0xFFD700, 0x1ABC9C][index],
            fields: [
                {
                    name: '📝 Transliteration',
                    value: zceer.transliteration,
                    inline: false
                },
                {
                    name: '🇬🇧 Translation',
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
                text: 'Daily Dhikr from Tafsir Kurd',
                icon_url: 'https://tafsirkurd.com/logo192.png'
            }
        }));

        // Send Stats to Stats Channel
        if (DISCORD_WEBHOOK_STATS) {
            await sendDiscordWebhook(DISCORD_WEBHOOK_STATS, {
                username: 'Tafsir Kurd Stats',
                avatar_url: 'https://tafsirkurd.com/logo512.png',
                embeds: [statsEmbed]
            });
            console.log('✅ Stats sent to stats channel!');
        }

        // Send Zceer to Zceer Channel
        if (DISCORD_WEBHOOK_ZCEER) {
            await sendDiscordWebhook(DISCORD_WEBHOOK_ZCEER, {
                username: 'Daily Zceer',
                avatar_url: 'https://tafsirkurd.com/logo512.png',
                embeds: zceerEmbeds
            });
            console.log('✅ Zceer sent to zceer channel!');
        }

        console.log(`📊 Stats: ${stats.totalUsers} total users, ${stats.todayUsers} new today`);
        console.log(`🌙 Sent 3 Dhikr: ${zceerList.map(z => z.category).join(', ')}\n`);

    } catch (error) {
        console.error('❌ Error sending daily report:', error.message);
    }
}

sendDailyReport();
