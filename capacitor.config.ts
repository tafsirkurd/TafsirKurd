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
    ],
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile',
    scheme: 'capacitor',
  },
  android: {
    backgroundColor: '#ffffff',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: '#ffffff',
      fadeOutDuration: 300,
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#000000',
      channels: [
        {
          id: 'reminder',
          name: 'Daily Reminder',
          description: 'Daily Quran reading reminder',
          importance: 3,
        },
      ],
    },
  },
};

export default config;
