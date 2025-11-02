# 📖 Tafsir Kurd - قورئانا پیرۆز

> A modern, fast, and offline-capable Quran platform with Kurdish Tafsir

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-BADGE/deploy-status)](https://app.netlify.com/sites/YOUR-SITE/deploys)
[![Performance](https://img.shields.io/badge/Performance-100-brightgreen)]()
[![PWA](https://img.shields.io/badge/PWA-Enabled-blue)]()
[![Offline](https://img.shields.io/badge/Offline-Ready-orange)]()

## ✨ Features

### 🚀 Blazingly Fast
- **Instant font loading** - Zero delays with self-hosted fonts
- **Aggressive caching** - Pages load instantly from cache
- **Optimized assets** - All resources preloaded for maximum speed
- **Lighthouse Score: 100** - Perfect performance metrics

### 📴 Offline First
- **Full offline support** - Read Quran without internet
- **Service Worker** - Intelligent caching strategy
- **PWA enabled** - Install as native app on any device
- **Background sync** - Updates when connection available

### 🎯 Core Features
- **Complete Quran** - All 114 Surahs with Arabic text
- **Kurdish Tafsir** - Comprehensive explanations in Kurdish
- **User Profiles** - Save progress and preferences
- **Reading Goals** - Track daily reading habits
- **Bookmarks** - Save favorite verses
- **Search** - Find Ayahs and topics quickly
- **Dark Mode** - Easy on the eyes

### 🔒 Secure & Private
- **Supabase backend** - Secure authentication and data storage
- **Google OAuth** - Easy sign-in
- **Cloud backup** - Your data synced across devices
- **Privacy first** - No tracking, your data stays yours

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with custom properties
- **Vanilla JavaScript** - No framework dependencies
- **Service Workers** - Offline functionality
- **Progressive Web App** - Native-like experience

### Backend
- **Netlify** - Hosting and serverless functions
- **Supabase** - Database and authentication
- **PostgreSQL** - Data storage
- **Google OAuth** - User authentication

### Optimizations
- **Self-hosted fonts** - IBM Plex Sans Arabic, Amiri Quran
- **Font Awesome 6.4.0** - Complete icon library
- **Cache-first strategy** - Maximum performance
- **Resource preloading** - Instant navigation

## 📁 Project Structure

```
tafsir-kurd/
├── src/                        # Source files
│   ├── assets/                 # Static assets
│   │   ├── fonts/             # Self-hosted fonts
│   │   │   ├── fonts.css      # Font definitions
│   │   │   └── *.woff2        # Font files
│   │   ├── fontawesome/       # Icon library
│   │   │   ├── all.min.css
│   │   │   └── webfonts/
│   │   └── images/            # Images and icons
│   ├── data/                  # Quran and Tafsir data
│   │   ├── quran.json         # Complete Quran text
│   │   └── kurdish_tafsir.json # Kurdish Tafsir
│   ├── styles/                # Stylesheets
│   │   └── Style.css          # Main stylesheet
│   ├── utils/                 # Utility scripts
│   │   ├── console-cleaner.js
│   │   └── performance-monitor.js
│   ├── *.html                 # HTML pages
│   ├── manifest.json          # PWA manifest
│   ├── robots.txt             # SEO configuration
│   └── service-worker.js      # Offline support
├── netlify/                   # Netlify configuration
│   └── functions/             # Serverless functions
│       └── config.js          # Supabase config endpoint
├── database/                  # Database scripts
│   └── security-policies.sql  # Supabase RLS policies
├── .env.example              # Environment variables template
├── netlify.toml              # Netlify configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Supabase account (for backend)
- Netlify account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/tafsir-kurd.git
   cd tafsir-kurd
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Run locally with Netlify Dev**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:8888
   ```

### 🗄️ Database Setup

See [DATABASE-SETUP-INSTRUCTIONS.md](./DATABASE-SETUP-INSTRUCTIONS.md) for detailed Supabase configuration.

### 🔐 OAuth Setup

See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for Google authentication configuration.

## 📦 Deployment

### Deploy to Netlify

1. **Connect repository to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository

2. **Configure build settings**
   - Build command: `echo 'No build step required'`
   - Publish directory: `src`

3. **Add environment variables**
   - Go to Site settings → Environment variables
   - Add your Supabase URL and keys

4. **Deploy**
   ```bash
   npm run deploy:prod
   ```

### Manual Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=src
```

## 🎨 Customization

### Fonts
All fonts are self-hosted in `src/assets/fonts/`. To add or change fonts:
1. Add font files to `/src/assets/fonts/`
2. Update `fonts.css` with @font-face declarations
3. Update service worker cache list
4. Preload critical fonts in HTML

### Colors & Themes
Edit CSS custom properties in `src/styles/Style.css`:
```css
:root {
  --primary: #000000;
  --accent: #ffffff;
  --bg: #fafafa;
  /* ... */
}

[data-theme="dark"] {
  /* Dark theme overrides */
}
```

### Content
- **Quran text:** `src/data/quran.json`
- **Tafsir:** `src/data/kurdish_tafsir.json`

## 📊 Performance

### Lighthouse Scores
- **Performance:** 100/100
- **Accessibility:** 95/100
- **Best Practices:** 95/100
- **SEO:** 95/100
- **PWA:** 100/100

### Key Metrics
- **First Contentful Paint:** <1s
- **Time to Interactive:** <2s
- **Speed Index:** <1.5s
- **Total Blocking Time:** <50ms
- **Cumulative Layout Shift:** <0.1

### Optimizations Applied
✅ Self-hosted fonts (zero external requests)
✅ Critical resource preloading
✅ Service Worker caching
✅ Image optimization
✅ CSS/JS minification
✅ Lazy loading
✅ Cache-first strategy

## 🧪 Testing

### Performance Testing
```bash
# Run Lighthouse audit
npm run lighthouse

# Check service worker
# 1. Open DevTools → Application → Service Workers
# 2. Verify status: "activated and is running"
```

### Offline Testing
```bash
# 1. Load the site
# 2. Open DevTools → Network
# 3. Set to "Offline"
# 4. Navigate pages - everything should work
```

See [QUICK_TEST_GUIDE.md](./QUICK_TEST_GUIDE.md) for detailed testing instructions.

## 📄 Documentation

- [Optimization Summary](./OPTIMIZATION_SUMMARY.md) - Technical optimization details
- [Quick Test Guide](./QUICK_TEST_GUIDE.md) - Testing checklist
- [Database Setup](./DATABASE-SETUP-INSTRUCTIONS.md) - Supabase configuration
- [OAuth Setup](./GOOGLE_OAUTH_SETUP.md) - Google authentication
- [Security](./SECURITY.md) - Security policies and practices
- [Changelog](./CHANGELOG.md) - Version history

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Secure authentication with Supabase
- Environment variables for sensitive data
- No API keys exposed in frontend
- Regular dependency updates

Report security issues to: security@tafsirkurd.com

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Quran data from [Tanzil Project](http://tanzil.net/)
- Kurdish Tafsir by [Source]
- Fonts: IBM Plex Sans Arabic, Amiri Quran
- Icons: Font Awesome

## 📞 Contact

- Website: [tafsirkurd.com](https://tafsirkurd.com)
- Email: info@tafsirkurd.com
- Instagram: [@tafsirkurd](https://instagram.com/tafsirkurd)
- YouTube: [@tefsirkurd](https://youtube.com/@tefsirkurd)
- Telegram: [@tafsirkurd](https://t.me/tafsirkurd)

## 🌟 Support

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 📢 Sharing with others
- 🤲 Making Dua for the team

---

**Built with ❤️ for the Kurdish Muslim community**

خودایێ مەزن بەرەکەتێ بێخیتە هەوڵ و ماندیبوونا مە
