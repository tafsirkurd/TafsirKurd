# 🖤 TafsirKurd Admin Dashboard - Black & White Edition

Professional enterprise-grade admin dashboard with monochromatic design system.

---

## 📦 What's Included

### **Pages Created:**

1. **`src/admin-dashboard.html`** - Main dashboard homepage
   - Key metrics (Users, Videos, Uptime, Alerts)
   - Traffic overview chart placeholder
   - Recent messages table
   - System health monitoring
   - Fully functional sidebar navigation

2. **`src/admin-messages.html`** - Contact messages management
   - Filterable message table (status, date, sort)
   - Bulk actions (select, mark read, delete)
   - Status badges (Read/Unread)
   - Pagination controls
   - Export CSV functionality

3. **`src/admin-bot-protection.html`** - Security & bot monitoring
   - Real-time bot detection stats
   - Recent bot activity log
   - Cloudflare WAF integration status
   - Supabase RLS security overview
   - Toggle switches for security features
   - Manual action alerts

4. **`src/admin-videos.html`** - Video management
   - Grid/list view toggle
   - Video cards with thumbnails
   - Stats (views, upload date, duration)
   - Action buttons (edit, analytics, delete)
   - Upload functionality placeholder
   - Storage metrics

5. **`src/css/admin-styles.css`** - Shared stylesheet
   - Complete black & white color system
   - Responsive sidebar layout
   - Reusable component styles
   - Mobile-first responsive design

---

## 🎨 Design System

### **Color Palette (Black & White)**

```css
Background Layers:
  --bg-app:       #000000  (main canvas)
  --bg-surface:   #111111  (cards, panels)
  --bg-hover:     #222222  (interactive hover)
  --bg-active:    #333333  (selected state)

Text:
  --text-primary:   #FFFFFF  (headings, labels)
  --text-secondary: #CCCCCC  (descriptions)
  --text-tertiary:  #888888  (disabled, subtle)

Borders:
  --border-light:   #222222  (dividers)
  --border-medium:  #444444  (inputs)
  --border-dark:    #666666  (emphasized)

Accent:
  --primary:        #FFFFFF  (clickable actions)
  --primary-hover:  #CCCCCC  (hover state)
```

### **Typography**

- **Font Family:** Inter (Google Fonts)
- **Sizes:** 11px → 28px (systematic scale)
- **Weights:** 400 (regular), 500 (medium), 600 (semibold)

### **Icons**

- **Library:** Lucide Icons (outline style)
- **Stroke:** 2px width
- **Color:** Inherits from text color
- **CDN:** `https://unpkg.com/lucide@latest`

---

## 🚀 Quick Start

### **1. Access the Dashboard**

```bash
# Navigate to your local development server
cd D:\WEBSITE

# If using npx serve:
npx serve src
# Then visit: http://localhost:3000/admin-dashboard.html

# Or if using Cloudflare Pages locally:
npx wrangler pages dev src
# Then visit: http://localhost:8788/admin-dashboard.html
```

### **2. Navigate Between Pages**

All pages are interlinked via sidebar navigation:
- `/admin-dashboard.html` - Main dashboard
- `/admin-messages.html` - Messages
- `/admin-videos.html` - Videos
- `/admin-bot-protection.html` - Security

### **3. Test Responsive Design**

- **Desktop:** Full sidebar (240px width) + content area
- **Tablet:** Collapsible sidebar (click hamburger menu)
- **Mobile:** Overlay sidebar with backdrop

---

## 🔌 Supabase Integration (Next Steps)

### **Required Setup:**

1. **Install Supabase Client (if not already installed):**

The admin pages currently use placeholder data. To integrate with your Supabase database:

```html
<!-- Already configured in your project -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.36.0"></script>
<script>
  const supabase = window.supabase.createClient(
    'https://gijupzejtbpifjzwadee.supabase.co',
    'YOUR_ANON_KEY'
  )
</script>
```

2. **Load Real Data - Dashboard Metrics:**

```javascript
// Load user count
async function loadUserCount() {
  const { count, error } = await supabase
    .from('user_data')
    .select('*', { count: 'exact', head: true })

  if (!error) {
    document.querySelector('.metric-value').textContent = count.toLocaleString()
  }
}

// Load video count
async function loadVideoCount() {
  const { count, error } = await supabase
    .from('tv_videos')
    .select('*', { count: 'exact', head: true })

  if (!error) {
    // Update second metric card
  }
}

// Load recent messages
async function loadRecentMessages() {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error loading messages:', error)
    return
  }

  // Populate table
  const tbody = document.querySelector('tbody')
  tbody.innerHTML = data.map(msg => `
    <tr>
      <td>${msg.name}</td>
      <td>${msg.email}</td>
      <td>${msg.subject}</td>
      <td><span class="badge badge-${msg.status === 'read' ? 'success' : 'neutral'}">${msg.status}</span></td>
      <td>${new Date(msg.created_at).toLocaleString()}</td>
      <td>
        <div class="table-actions">
          <button class="table-btn" onclick="viewMessage('${msg.id}')">
            <i data-lucide="eye"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('')

  lucide.createIcons() // Re-initialize icons
}

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
  loadUserCount()
  loadVideoCount()
  loadRecentMessages()
})
```

3. **Authentication Check:**

```javascript
// Add to each admin page
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // Redirect to login
    window.location.href = '/login.html'
    return
  }

  // Verify admin role (implement based on your auth structure)
  const isAdmin = await verifyAdminRole(session.user.email)
  if (!isAdmin) {
    alert('Access denied: Admin privileges required')
    window.location.href = '/index.html'
    return
  }

  // Update UI with user info
  document.querySelector('.sidebar-profile-email').textContent = session.user.email
}

// Run on page load
checkAuth()
```

4. **Real-time Updates:**

```javascript
// Subscribe to new messages
supabase
  .channel('contact_messages')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'contact_messages' },
    payload => {
      console.log('New message:', payload.new)
      // Update badge count
      const badge = document.querySelector('.nav-item-badge')
      badge.textContent = parseInt(badge.textContent) + 1
      // Refresh messages table
      loadRecentMessages()
    }
  )
  .subscribe()
```

---

## 🔒 Security Implementation

### **Already Configured (via SQL migrations):**

✅ **RLS Policies:**
- Public write access removed from all content tables
- Contact form: INSERT-only with field validation
- Analytics: Limited INSERT with length checks
- TV content: Read-only from client
- Admin tables: Backend-only access

✅ **Function Security:**
- `update_updated_at_column` has immutable search_path
- Prevents privilege escalation attacks

### **Cloudflare Integration (manual setup required):**

**WAF Rules to Configure:**

```yaml
Rule 1: Rate Limit Contact Form
  Match: POST /rest/v1/contact_messages
  Action: Challenge after 5 requests/60s

Rule 2: Rate Limit Analytics
  Match: POST /rest/v1/geo_analytics
  Action: Challenge after 30 requests/60s

Rule 3: Block Writes to Read-Only Tables
  Match: POST|PUT|PATCH|DELETE /rest/v1/tv_*
  Action: Block (403)

Rule 4: Protect Admin Tables
  Match: /rest/v1/admin_* without Authorization header
  Action: Block (403)
```

**Turnstile Integration (Contact Form):**

```html
<div class="cf-turnstile"
     data-sitekey="YOUR_TURNSTILE_SITE_KEY"
     data-callback="onTurnstileSuccess">
</div>

<script>
function onTurnstileSuccess(token) {
  // Include token in form submission
  document.getElementById('cf-token').value = token
}
</script>
```

---

## 📊 Features by Page

### **Dashboard (`admin-dashboard.html`)**

**Components:**
- ✅ Metric cards with trend indicators
- ✅ Chart placeholder (ready for Chart.js/Recharts)
- ✅ Recent messages table
- ✅ System health status
- ✅ Export buttons

**Data Sources to Integrate:**
- `user_data` → Total users count
- `tv_videos` → Total videos count
- `bot_logs` → Security alerts
- `contact_messages` → Recent submissions

---

### **Messages (`admin-messages.html`)**

**Components:**
- ✅ Filters (Status, Date, Sort)
- ✅ Bulk actions (checkbox + action bar)
- ✅ Searchable table
- ✅ Action buttons (View, Reply, Delete)
- ✅ Pagination controls
- ✅ Export CSV button

**Integrations Needed:**

```javascript
// Mark message as read
async function markAsRead(messageId) {
  // IMPORTANT: This requires backend API with service_role key
  // DO NOT use service_role key in client code!
  await fetch('/api/admin/messages/mark-read', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messageId })
  })
}

// Delete message (admin only - backend API required)
async function deleteMessage(messageId) {
  await fetch('/api/admin/messages/delete', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ messageId })
  })
}

// Export CSV
function exportCSV() {
  // Fetch all messages and convert to CSV
  const csv = messages.map(m =>
    `"${m.name}","${m.email}","${m.subject}","${m.message}","${m.created_at}"`
  ).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `messages-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}
```

---

### **Bot Protection (`admin-bot-protection.html`)**

**Components:**
- ✅ Live status indicator with pulse animation
- ✅ 4 security metric cards
- ✅ Recent bot detections table
- ✅ Cloudflare WAF integration status
- ✅ Supabase RLS policy overview
- ✅ Toggle switches for security features
- ✅ Alert notifications

**Data Sources:**
- `bot_logs` → Detection history
- `geo_analytics` → Traffic patterns
- Cloudflare Analytics API (future)
- Supabase security advisors

**Integration Example:**

```javascript
// Load bot detection stats
async function loadBotStats() {
  const { data, error } = await supabase
    .from('bot_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())

  if (!error) {
    const blocked = data.filter(log => log.action === 'blocked').length
    document.querySelectorAll('.metric-value')[1].textContent = blocked
  }
}
```

---

### **Videos (`admin-videos.html`)**

**Components:**
- ✅ Grid/List view toggle
- ✅ Video cards with metadata
- ✅ Stats bar (total videos, views, storage)
- ✅ Action buttons per video
- ✅ Search functionality

**Integration Example:**

```javascript
// Load videos from database
async function loadVideos() {
  const { data, error } = await supabase
    .from('tv_episodes')
    .select(`
      *,
      tv_series(title),
      tv_videos(url, duration, thumbnail)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!error) {
    renderVideoGrid(data)
  }
}

function renderVideoGrid(videos) {
  const grid = document.querySelector('.video-grid')
  grid.innerHTML = videos.map(video => `
    <div class="video-card">
      <div class="video-thumbnail">
        ${video.tv_videos?.thumbnail
          ? `<img src="${video.tv_videos.thumbnail}" alt="${video.title}">`
          : '<div class="video-placeholder"><i data-lucide="video"></i></div>'
        }
        <div class="video-duration">${formatDuration(video.tv_videos?.duration)}</div>
      </div>
      <div class="video-card-body">
        <div class="video-card-title">${video.title}</div>
        <div class="video-card-meta">
          <div class="video-card-stat">
            <i data-lucide="eye"></i>
            <span>${video.views_count || 0}</span>
          </div>
        </div>
        <div class="video-card-footer">
          <span class="badge badge-success">Published</span>
          <div class="video-card-actions">
            <button class="video-card-btn" onclick="editVideo('${video.id}')">
              <i data-lucide="edit-2"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('')

  lucide.createIcons()
}
```

---

## 🎯 Component Library

### **Buttons**

```html
<!-- Primary action -->
<button class="btn btn-primary">
  <i data-lucide="plus"></i>
  Add New
</button>

<!-- Secondary action -->
<button class="btn btn-secondary">
  <i data-lucide="download"></i>
  Export
</button>
```

### **Badges**

```html
<span class="badge badge-success">Active</span>
<span class="badge badge-danger">Blocked</span>
<span class="badge badge-neutral">Unread</span>
```

### **Metric Cards**

```html
<div class="metric-card">
  <div class="metric-value">1,247</div>
  <div class="metric-label">Total Users</div>
  <div class="metric-change positive">
    <i data-lucide="trending-up"></i>
    <span>12% from last month</span>
  </div>
</div>
```

### **Tables**

```html
<div class="card">
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Column 1</th>
          <th>Column 2</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Data 1</td>
          <td>Data 2</td>
          <td>
            <div class="table-actions">
              <button class="table-btn">
                <i data-lucide="eye"></i>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### **Toggle Switches**

```html
<label class="toggle">
  <input type="checkbox" checked>
  <span class="toggle-slider"></span>
</label>
```

---

## 📱 Responsive Behavior

### **Breakpoints:**

```css
Desktop:  1280px+  (sidebar visible, 240px width)
Tablet:   768-1279px (sidebar collapsible)
Mobile:   <768px (overlay sidebar)
```

### **Sidebar States:**

- **Desktop:** Always visible
- **Collapsed:** 64px width (icons only)
- **Mobile:** Overlay with backdrop
- **Toggle:** Click hamburger menu or sidebar toggle button

---

## 🔧 Customization

### **Add Color Accent (Optional)**

If you want to add a subtle color instead of pure white:

```css
:root {
  --primary: #3B82F6;  /* Blue accent */
  --primary-hover: #2563EB;
}

.badge-success {
  background: #10B981; /* Green */
  color: #FFFFFF;
}
```

### **Integrate Charts**

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
const ctx = document.getElementById('trafficChart').getContext('2d')
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Visitors',
      data: [120, 150, 180, 200, 170, 190, 210],
      borderColor: '#FFFFFF',
      backgroundColor: 'rgba(255, 255, 255, 0.1)'
    }]
  },
  options: {
    scales: {
      y: { ticks: { color: '#CCCCCC' } },
      x: { ticks: { color: '#CCCCCC' } }
    }
  }
})
</script>
```

---

## 🚀 Production Deployment Checklist

### **Before Going Live:**

- [ ] Replace placeholder data with Supabase queries
- [ ] Add authentication check on all admin pages
- [ ] Implement admin role verification (email-based or JWT claims)
- [ ] Create backend API for admin write operations
- [ ] Configure Cloudflare WAF rules (test in Log mode first)
- [ ] Enable Turnstile on contact form
- [ ] Add error handling and loading states
- [ ] Test all responsive breakpoints
- [ ] Add accessibility features (ARIA labels, keyboard navigation)
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Enable leaked password protection in Supabase Dashboard

---

## 📦 File Structure

```
D:\WEBSITE/
├── src/
│   ├── admin-dashboard.html          # Main dashboard
│   ├── admin-messages.html           # Messages management
│   ├── admin-bot-protection.html     # Security monitoring
│   ├── admin-videos.html             # Video management
│   └── css/
│       └── admin-styles.css          # Shared stylesheet
├── ADMIN-DASHBOARD-README.md         # This file
└── (existing project files)
```

---

## 🔐 Security Note

**IMPORTANT:** These HTML files are frontend templates. Never expose:
- ❌ Service role key (use backend API only)
- ❌ Admin credentials in client code
- ❌ Sensitive configuration

**Recommended Admin Access Pattern:**

```
User → Login → Verify admin email → Load dashboard with anon key
Admin Actions → Backend API (service_role) → Execute privileged operations
```

**Create Backend API Endpoints:**

```javascript
// Example: Cloudflare Worker function
export async function onRequestPost(context) {
  const { request, env } = context
  const session = await verifySession(request)

  if (!session || !isAdmin(session.email)) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Use service_role key server-side only
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY // Server-side only!
  )

  const { messageId } = await request.json()
  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', messageId)

  return new Response(JSON.stringify({ success: !error }))
}
```

---

## 🎨 Design Credits

**Inspiration:**
- Linear (issue tracking)
- Vercel Dashboard (deployment platform)
- Railway (infrastructure)
- Stripe Dashboard (payments)

**Why Black & White:**
- Professional, timeless aesthetic
- Reduces cognitive load
- Fast rendering (no gradients)
- High contrast (accessible)
- Easy to maintain

---

## 📞 Next Steps

1. **Integrate with Supabase** - Replace placeholder data with real queries
2. **Add Authentication** - Protect admin routes with session checks
3. **Create Backend API** - Implement admin write operations securely
4. **Deploy Cloudflare Rules** - Enable WAF protection
5. **Test Thoroughly** - Verify all features work with real data

---

**Your admin dashboard is ready to use!** 🎉

Access it at: `http://localhost:3000/admin-dashboard.html` (or your development server URL)

For questions or issues, refer to the security implementation documentation above.
