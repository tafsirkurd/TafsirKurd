// Evening Zceer - Scheduled for 8 PM Iraq time (5 PM UTC / 17:00 UTC)
// Sends evening adhkar and duas

const https = require('https');

// Evening Adhkar & Duas Collection
const EVENING_ZCEER = [
    // Evening Tasbih
    'سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ',
    'سُبْحَانَ اللّٰهِ الْعَظِيمِ',
    'الْحَمْدُ لِلّٰهِ',
    'لَا إِلٰهَ إِلَّا اللّٰهُ',
    'اللّٰهُ أَكْبَرُ',

    // Evening Adhkar
    'أَمْسَيْنَا وَأَمْسَىٰ الْمُلْكُ لِلّٰهِ',
    'أَمْسَيْنَا وَأَمْسَىٰ الْمُلْكُ لِلّٰهِ رَبِّ الْعَالَمِينَ',
    'أَمْسَيْنَا عَلَىٰ فِطْرَةِ الْإِسْلَامِ',
    'أَمْسَيْنَا عَلَىٰ كَلِمَةِ الْإِخْلَاصِ',
    'أَمْسَيْنَا عَلَىٰ دِينِ نَبِيِّنَا مُحَمَّدٍ',
    'أَمْسَيْنَا عَلَىٰ مِلَّةِ إِبْرَاهِيمَ حَنِيفًا',

    'اَللّٰهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
    'اَللّٰهُمَّ مَا أَمْسَىٰ بِي مِنْ نِعْمَةٍ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
    'اَللّٰهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللّٰهُ لَا إِلٰهَ إِلَّا أَنْتَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ',
    'اَللّٰهُمَّ إِنِّي أَمْسَيْتُ مِنْكَ فِي نِعْمَةٍ وَعَافِيَةٍ وَسِتْرٍ',

    // Evening Protection
    'بِسْمِ اللّٰهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    'أَعُوذُ بِكَلِمَاتِ اللّٰهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    'اَللّٰهُمَّ عَافِنِي فِي بَدَنِي اَللّٰهُمَّ عَافِنِي فِي سَمْعِي اَللّٰهُمَّ عَافِنِي فِي بَصَرِي لَا إِلٰهَ إِلَّا أَنْتَ',
    'اَللّٰهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ لَا إِلٰهَ إِلَّا أَنْتَ',
    'حَسْبِيَ اللّٰهُ لَا إِلٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',

    // Evening Gratitude
    'الْحَمْدُ لِلّٰهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَكَفَانَا وَآوَانَا',
    'الْحَمْدُ لِلّٰهِ الَّذِي كَسَانَا وَآوَانَا',
    'الْحَمْدُ لِلّٰهِ عَلَىٰ نِعَمِهِ الَّتِي لَا تُحْصَىٰ',
    'الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ',

    // Evening Salawat
    'اَللّٰهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ',
    'اَللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ',

    // Evening Istighfar
    'أَسْتَغْفِرُ اللّٰهَ',
    'أَسْتَغْفِرُ اللّٰهَ الْعَظِيمَ',
    'أَسْتَغْفِرُ اللّٰهَ وَأَتُوبُ إِلَيْهِ',
    'اَللّٰهُمَّ اغْفِرْ لِي ذَنْبِي',

    // Night Protection
    'اَللّٰهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
    'اَللّٰهُمَّ أَجِرْنِي مِنَ النَّارِ',
    'اَللّٰهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ جَهَنَّمَ',
    'اَللّٰهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ',

    // Evening Tawakkul
    'تَوَكَّلْتُ عَلَى اللّٰهِ',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ',
    'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ الْعَلِيِّ الْعَظِيمِ',

    // Evening Dua
    'اَللّٰهُمَّ اجْعَلْ مَسَائِي هَٰذَا مَسَاءَ خَيْرٍ وَبَرَكَةٍ',
    'اَللّٰهُمَّ بَارِكْ لَنَا فِي لَيْلَتِنَا هَٰذِهِ',
    'اَللّٰهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَٰذِهِ اللَّيْلَةِ',
    'اَللّٰهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ شَرِّ هَٰذِهِ اللَّيْلَةِ',

    // Before Sleep
    'بِاسْمِكَ اللّٰهُمَّ أَمُوتُ وَأَحْيَا',
    'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي وَبِكَ أَرْفَعُهُ',
    'اَللّٰهُمَّ بِاسْمِكَ أَحْيَا وَأَمُوتُ',

    // Ayat al-Kursi (evening)
    'اللّٰهُ لَا إِلٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',

    // Evening Names of Allah
    'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
    'يَا رَحْمَٰنُ يَا رَحِيمُ',
    'يَا غَفُورُ يَا رَحِيمُ',
    'يَا سَتِّيرُ',
    'يَا حَفِيظُ'
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
    console.log('🌙 Running evening zceer job...');

    const DISCORD_WEBHOOK_ZCEER = process.env.DISCORD_WEBHOOK_ZCEER;

    if (!DISCORD_WEBHOOK_ZCEER) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Discord webhook not configured' })
        };
    }

    try {
        const randomIndex = Math.floor(Math.random() * EVENING_ZCEER.length);
        const zceer = EVENING_ZCEER[randomIndex];

        const payload = {
            username: 'Zceer - Evening',
            avatar_url: 'https://tafsirkurd.com/logo512.png',
            content: `🌙 ${zceer}`
        };

        console.log(`📿 Sending evening zceer #${randomIndex + 1} of ${EVENING_ZCEER.length}...`);

        await sendDiscordWebhook(DISCORD_WEBHOOK_ZCEER, payload);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                time: 'evening',
                zceer: zceer,
                total: EVENING_ZCEER.length
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
