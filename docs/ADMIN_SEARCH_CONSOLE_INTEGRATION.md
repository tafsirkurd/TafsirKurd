# Admin Panel - Search Console Integration Code

This document contains the code to add to your admin panel for Google Search Console integration.

---

## 📋 What This Adds

- 🔍 New "SEO & Search Console" card in admin dashboard
- 📊 Search Console section with:
  - Summary stats (clicks, impressions, CTR, position)
  - Top search queries table
  - Top performing pages table
  - Auto-refresh functionality
  - Setup instructions if not configured

---

## 🔧 Installation Steps

### **Step 1: Add Dashboard Card**

Find this line in `src/admin.html` (around line 1439):
```html
<!-- Telegram Card -->
<div onclick="switchSection('telegram')" style="background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);...
```

**Add this NEW card right AFTER the Telegram card** (before the closing `</div>` of the grid):

```html
<!-- Search Console SEO Card -->
<div onclick="switchSection('searchConsole')" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 20px; cursor: pointer; transition: all 0.3s; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 15px 40px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 30px rgba(102, 126, 234, 0.3)'">
    <div style="font-size: 56px; margin-bottom: 15px;">🔍</div>
    <h3 style="margin: 0 0 10px 0; color: white; font-size: 24px; font-weight: 700;">SEO & Search Console</h3>
    <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6;">View search queries, rankings, impressions and SEO performance</p>
</div>
```

---

### **Step 2: Add Search Console Section HTML**

Find the Telegram section (around line 2500) that starts with:
```html
<!-- Telegram Section -->
<section id="telegramSection" class="section">
```

**Add this NEW section right AFTER the Telegram section** (after its closing `</section>`):

```html
<!-- Search Console SEO Section -->
<section id="searchConsoleSection" class="section">
    <!-- Setup Notice (shown if not configured) -->
    <div id="searchConsoleSetupNotice" style="display: none; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 16px; color: white; margin-bottom: 30px;">
        <h2 style="margin: 0 0 15px 0; font-size: 28px;">🔧 Setup Required</h2>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
            Google Search Console API is not configured yet. Follow the setup guide to enable search analytics in your admin panel.
        </p>
        <a href="/GOOGLE_SEARCH_CONSOLE_SETUP.md" target="_blank" style="display: inline-block; background: white; color: #f5576c; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s;">
            📖 View Setup Guide
        </a>
    </div>

    <!--  No Data Notice (shown if setup but no data yet) -->
    <div id="searchConsoleNoDataNotice" style="display: none; background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 30px; border-radius: 16px; margin-bottom: 30px;">
        <h2 style="margin: 0 0 15px 0; font-size: 28px;">⏳ Waiting for Data</h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.6;">
            Google Search Console is configured correctly, but no data is available yet. This is normal for newly verified sites.
            Data typically appears within 24-48 hours after verification, with full search query data after 3-7 days.
        </p>
    </div>

    <!-- Summary Stats -->
    <div id="searchConsoleSummary" style="display: none;">
        <div class="info-box" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin-bottom: 30px;">
            <div class="info-box-title">🔍 Google Search Console - Last 28 Days</div>
            <div class="info-box-desc">
                Search performance data from Google Search Console API
            </div>
        </div>

        <div class="analytics-grid" style="margin-bottom: 30px;">
            <div class="stat-card">
                <div class="stat-icon" style="color: #667eea;">📊</div>
                <div class="stat-value" id="gscTotalClicks">-</div>
                <div class="stat-label">Total Clicks</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="color: #764ba2;">👁️</div>
                <div class="stat-value" id="gscTotalImpressions">-</div>
                <div class="stat-label">Total Impressions</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="color: #f093fb;">📈</div>
                <div class="stat-value" id="gscAvgCTR">-</div>
                <div class="stat-label">Average CTR</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="color: #f5576c;">🎯</div>
                <div class="stat-value" id="gscAvgPosition">-</div>
                <div class="stat-label">Avg Position</div>
            </div>
        </div>

        <!-- Top Search Queries -->
        <div class="content-card" style="margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 20px; font-weight: 700;">🔎 Top Search Queries</h3>
                <button onclick="refreshSearchConsoleData()" style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    🔄 Refresh
                </button>
            </div>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Search Query</th>
                            <th>Clicks</th>
                            <th>Impressions</th>
                            <th>CTR</th>
                            <th>Position</th>
                        </tr>
                    </thead>
                    <tbody id="searchQueriesTable">
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <div class="loading-text">Loading search queries...</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Top Pages -->
        <div class="content-card">
            <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700;">📄 Top Performing Pages</h3>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Page URL</th>
                            <th>Clicks</th>
                            <th>Impressions</th>
                            <th>CTR</th>
                            <th>Position</th>
                        </tr>
                    </thead>
                    <tbody id="topPagesTable">
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px;">
                                <div class="loading-spinner"></div>
                                <div class="loading-text">Loading top pages...</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</section>
```

---

### **Step 3: Add JavaScript Functions**

Find the `switchSection` function's case statement (around line 2616), and add this case:

```javascript
case 'searchConsole': await loadSearchConsoleData(); break;
```

Then, find the end of the JavaScript section (before the closing `</script>` tag, around line 5800), and add these functions:

```javascript
// ==================== SEARCH CONSOLE FUNCTIONS ====================

// Load Search Console Data
async function loadSearchConsoleData() {
    console.log('🔍 Loading Google Search Console data...');

    try {
        const response = await fetch('/.netlify/functions/google-search-console');
        const result = await response.json();

        console.log('Search Console response:', result);

        // Hide all notices first
        document.getElementById('searchConsoleSetupNotice').style.display = 'none';
        document.getElementById('searchConsoleNoDataNotice').style.display = 'none';
        document.getElementById('searchConsoleSummary').style.display = 'none';

        if (result.needsSetup) {
            // Show setup notice
            document.getElementById('searchConsoleSetupNotice').style.display = 'block';
            return;
        }

        if (result.noData) {
            // Show no data notice
            document.getElementById('searchConsoleNoDataNotice').style.display = 'block';
            return;
        }

        if (!result.success) {
            alert(`Search Console Error: ${result.message}`);
            return;
        }

        // Show summary section
        document.getElementById('searchConsoleSummary').style.display = 'block';

        const data = result.data;

        // Update summary stats
        document.getElementById('gscTotalClicks').textContent = data.summary.totalClicks.toLocaleString();
        document.getElementById('gscTotalImpressions').textContent = data.summary.totalImpressions.toLocaleString();
        document.getElementById('gscAvgCTR').textContent = data.summary.avgCTR + '%';
        document.getElementById('gscAvgPosition').textContent = data.summary.avgPosition;

        // Update search queries table
        const queriesTable = document.getElementById('searchQueriesTable');
        if (data.queries && data.queries.length > 0) {
            queriesTable.innerHTML = data.queries.map(query => `
                <tr>
                    <td><strong>${escapeHtml(query.query)}</strong></td>
                    <td>${query.clicks}</td>
                    <td>${query.impressions.toLocaleString()}</td>
                    <td>${query.ctr}%</td>
                    <td>${query.position}</td>
                </tr>
            `).join('');
        } else {
            queriesTable.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No search queries yet</td></tr>';
        }

        // Update top pages table
        const pagesTable = document.getElementById('topPagesTable');
        if (data.pages && data.pages.length > 0) {
            pagesTable.innerHTML = data.pages.map(page => `
                <tr>
                    <td><a href="${page.page}" target="_blank" style="color: #667eea; text-decoration: none;">${escapeHtml(page.page.replace('https://tafsirkurd.com', ''))}</a></td>
                    <td>${page.clicks}</td>
                    <td>${page.impressions.toLocaleString()}</td>
                    <td>${page.ctr}%</td>
                    <td>${page.position}</td>
                </tr>
            `).join('');
        } else {
            pagesTable.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No pages data yet</td></tr>';
        }

        console.log('✅ Search Console data loaded successfully');

    } catch (error) {
        console.error('❌ Error loading Search Console data:', error);
        alert('Failed to load Search Console data. Check console for details.');
    }
}

// Refresh Search Console Data
function refreshSearchConsoleData() {
    loadSearchConsoleData();
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

---

## ✅ Installation Complete!

After adding all the code above:

1. **Save `src/admin.html`**
2. **Commit and push changes**
3. **Install googleapis package**:
   ```bash
   npm install
   ```
4. **Deploy to Netlify**

---

## 🔧 Next Steps

1. **Follow GOOGLE_SEARCH_CONSOLE_SETUP.md** to:
   - Enable Google Search Console API
   - Create OAuth credentials
   - Get refresh token
   - Add environment variables to Netlify

2. **Wait for data** (3-7 days after site verification)

3. **View in admin**:
   - Go to admin panel
   - Click "SEO & Search Console" card
   - See your search performance data!

---

## 📊 What You'll See

### **Before Setup:**
- Setup instructions with link to guide

### **After Setup (no data yet):**
- "Waiting for Data" message
- Explanation that this is normal

### **After Data Appears:**
- Total clicks, impressions, CTR, position
- Top 50 search queries with metrics
- Top 20 pages with performance data
- Refresh button to update data

---

## 🎯 Quick Test

To test if the API endpoint works (after setup):
```
https://tafsirkurd.com/.netlify/functions/google-search-console
```

Should return JSON with search data or setup message.

---

**That's it! Your admin panel now has Google Search Console integration!** 🎉
