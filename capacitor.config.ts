import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tafsirkurd.app',
  appName: 'Tafsir Kurd',
  webDir: 'src',
  server: {
    allowNavigation: [
      'tafsirkurd.com',
      'gijupzejtbpifjzwadee.supabase.co',
      'db.tafsirkurd.com',
      'everyayah.com',
      'api.quran.com',
      'api.aladhan.com',
      'www.youtube-nocookie.com',
      'www.youtube.com',
      'quran-search.tefsirkurd.workers.dev',
    ],
  },
  ios: {
    contentInset: 'never',
    scheme: 'capacitor',
    backgroundColor: '#000000',
  },
  android: {
    backgroundColor: '#000000',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      androidSplashResourceName: 'launch_screen',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: '#00000000',
      fadeOutDuration: 0,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#1f5f4a',
      channels: [
        // Daily Quran reminder — low importance, no custom sound
        {
          id: 'reminder',
          name: 'Daily Reminder',
          description: 'Daily Quran reading reminder',
          importance: 3,
        },
        // Athan channels — one per voice, high importance, custom sound.
        // Sound filename must match res/raw/athan_<id>.mp3 exactly.
        // These are also created at runtime by ensureAllChannels() to handle
        // version upgrades, but declaring them here ensures they exist from
        // first launch without the user needing to open the prayer tab first.
        {
          id: 'athan_mishary',
          name: 'Athan — مشاری راشد العفاسی',
          description: 'Prayer time athan alerts',
          importance: 5,
          vibration: true,
          sound: 'athan_mishary',
        },
        {
          id: 'athan_nasser',
          name: 'Athan — ناصر القطامي',
          description: 'Prayer time athan alerts',
          importance: 5,
          vibration: true,
          sound: 'athan_nasser',
        },
        {
          id: 'athan_omar',
          name: 'Athan — عمر هشام العربي',
          description: 'Prayer time athan alerts',
          importance: 5,
          vibration: true,
          sound: 'athan_omar',
        },
        {
          id: 'athan_peshawa',
          name: 'Athan — پیشەوا',
          description: 'Prayer time athan alerts',
          importance: 5,
          vibration: true,
          sound: 'athan_peshawa',
        },
        {
          id: 'athan_raad',
          name: 'Athan — راعد محمد الكردي',
          description: 'Prayer time athan alerts',
          importance: 5,
          vibration: true,
          sound: 'athan_raad',
        },
      ],
    },
  },
};

export default config;
