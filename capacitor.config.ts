import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tafsirkurd.app',
  appName: 'Tafsir Kurd',
  webDir: 'src',
  server: {
    allowNavigation: [
      'tafsirkurd.com',
      'gijupzejtbpifjzwadee.supabase.co',
      'everyayah.com',
      'api.quran.com',
      'api.aladhan.com',
    ],
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0d0d0d',
    scheme: 'capacitor',
  },
  android: {
    backgroundColor: '#0d0d0d',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: '#0d0d0d',
      fadeOutDuration: 200,
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
        // Sound filename must match res/raw/athan_<id>.ogg exactly.
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
          id: 'athan_ahmed',
          name: 'Athan — أحمد العمادي',
          description: 'Prayer time athan alerts',
          importance: 5,
          vibration: true,
          sound: 'athan_ahmed',
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
          id: 'athan_majed',
          name: 'Athan — ماجد الحمضاني',
          description: 'Prayer time athan alerts',
          importance: 5,
          vibration: true,
          sound: 'athan_majed',
        },
        {
          id: 'athan_mokhtar',
          name: 'Athan — مختار حاج سليمان',
          description: 'Prayer time athan alerts',
          importance: 5,
          vibration: true,
          sound: 'athan_mokhtar',
        },
      ],
    },
  },
};

export default config;
