// Morning Zceer - Scheduled for 8 AM Iraq time (5 AM UTC)
// Sends morning adhkar and duas

const https = require('https');

// Morning Adhkar & Duas Collection
const MORNING_ZCEER = [
    // Morning Tasbih
    'سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ',
    'سُبْحَانَ اللّٰهِ الْعَظِيمِ',
    'الْحَمْدُ لِلّٰهِ',
    'لَا إِلٰهَ إِلَّا اللّٰهُ',
    'اللّٰهُ أَكْبَرُ',

    // Morning Adhkar
    'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلّٰهِ',
    'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلّٰهِ رَبِّ الْعَالَمِينَ',
    'أَصْبَحْنَا عَلَىٰ فِطْرَةِ الْإِسْلَامِ',
    'أَصْبَحْنَا عَلَىٰ كَلِمَةِ الْإِخْلَاصِ',
    'أَصْبَحْنَا عَلَىٰ دِينِ نَبِيِّنَا مُحَمَّدٍ',
    'أَصْبَحْنَا عَلَىٰ مِلَّةِ إِبْرَاهِيمَ حَنِيفًا',

    'اَللّٰهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
    'اَللّٰهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
    'اَللّٰهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللّٰهُ لَا إِلٰهَ إِلَّا أَنْتَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ',
    'اَللّٰهُمَّ إِنِّي أَصْبَحْتُ مِنْكَ فِي نِعْمَةٍ وَعَافِيَةٍ وَسِتْرٍ',

    // Morning Protection
    'بِسْمِ اللّٰهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    'أَعُوذُ بِكَلِمَاتِ اللّٰهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    'اَللّٰهُمَّ عَافِنِي فِي بَدَنِي اَللّٰهُمَّ عَافِنِي فِي سَمْعِي اَللّٰهُمَّ عَافِنِي فِي بَصَرِي لَا إِلٰهَ إِلَّا أَنْتَ',
    'اَللّٰهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ لَا إِلٰهَ إِلَّا أَنْتَ',
    'حَسْبِيَ اللّٰهُ لَا إِلٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',

    // Morning Tawakkul
    'تَوَكَّلْتُ عَلَى اللّٰهِ',
    'عَلَى اللّٰهِ تَوَكَّلْتُ',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ الْعَلِيِّ الْعَظِيمِ',

    // Morning Gratitude
    'الْحَمْدُ لِلّٰهِ الَّذِي أَحْيَانِي بَعْدَ مَا أَمَاتَنِي وَإِلَيْهِ النُّشُورُ',
    'الْحَمْدُ لِلّٰهِ الَّذِي رَدَّ عَلَيَّ رُوحِي وَعَافَانِي فِي جَسَدِي',
    'الْحَمْدُ لِلّٰهِ الَّذِي عَافَانِي فِي جَسَدِي وَرَدَّ عَلَيَّ رُوحِي',
    'الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ',

    // Morning Salawat
    'اَللّٰهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ',
    'اَللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ',

    // Morning Rizq
    'اَللّٰهُمَّ ارْزُقْنِي رِزْقًا حَلَالًا طَيِّبًا',
    'اَللّٰهُمَّ افْتَحْ لِي أَبْوَابَ رِزْقِكَ',
    'اَللّٰهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',

    // Morning Dua
    'اَللّٰهُمَّ اجْعَلْ صَبَاحِي هَٰذَا صَبَاحَ خَيْرٍ وَبَرَكَةٍ',
    'اَللّٰهُمَّ بَارِكْ لَنَا فِي يَوْمِنَا هَٰذَا',
    'اَللّٰهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَٰذَا الْيَوْمِ',
    'اَللّٰهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ شَرِّ هَٰذَا الْيَوْمِ',

    // Ayat al-Kursi (morning)
    'اللّٰهُ لَا إِلٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',

    // Morning Names of Allah
    'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
    'يَا رَحْمَٰنُ يَا رَحِيمُ',
    'يَا رَزَّاقُ',
    'يَا فَتَّاحُ',
    'يَا كَرِيمُ'
];

function sendDiscordWebhook(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(webhookUrl);
        const data = JSON.stringify(payload);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode === 204 || res.statusCode === 200) {
                    resolve({ success: true, statusCode: res.statusCode });
                } else {
                    reject(new Error(`Discord API error: ${res.statusCode} - ${responseData}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

exports.handler = async (event, context) => {
    console.log('🌅 Running morning zceer job...');

    const DISCORD_WEBHOOK_ZCEER = process.env.DISCORD_WEBHOOK_ZCEER;

    if (!DISCORD_WEBHOOK_ZCEER) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Discord webhook not configured' })
        };
    }

    try {
        const randomIndex = Math.floor(Math.random() * MORNING_ZCEER.length);
        const zceer = MORNING_ZCEER[randomIndex];

        const payload = {
            username: 'Zceer - Morning',
            avatar_url: 'https://tafsirkurd.com/logo512.png',
            content: `🌅 ${zceer}`
        };

        console.log(`📿 Sending morning zceer #${randomIndex + 1} of ${MORNING_ZCEER.length}...`);

        await sendDiscordWebhook(DISCORD_WEBHOOK_ZCEER, payload);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                time: 'morning',
                zceer: zceer,
                total: MORNING_ZCEER.length
            })
        };
    } catch (error) {
        console.error('❌ Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
