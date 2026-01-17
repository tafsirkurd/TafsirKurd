# Admin 20-Minute Session Timeout

## Security Feature Overview

All admin users are automatically logged out after **20 minutes** of being logged in for enhanced security. This prevents unauthorized access if an admin leaves their computer unattended.

---

## How It Works

### 1. **Session Start**
- When an admin logs in successfully, a session timer starts automatically
- Session start time is recorded in `sessionStorage`
- Timer is set for exactly 20 minutes (1,200,000 milliseconds)

### 2. **Session Active**
- Admin can use any admin panel features normally
- Session timer continues running in the background
- Status is tracked even if admin navigates between admin pages

### 3. **Session Timeout (After 20 Minutes)**
- **Automatic logout** occurs exactly 20 minutes after login
- All session data is cleared (`sessionStorage.clear()`)
- Admin is redirected to login page
- Alert message appears: "Session Timeout - For your security, you have been automatically logged out after 20 minutes"

### 4. **Re-authentication Required**
- Admin must enter email and password again to access admin panel
- No exceptions - even Super Admin must re-authenticate
- Device fingerprinting still applies

---

## Technical Implementation

### Files Modified

1. **`src/utils/admin-heartbeat.js`**
   - Added `SESSION_TIMEOUT` constant (20 minutes)
   - New functions:
     - `startSessionTimeout()` - Initiates the 20-minute timer
     - `stopSessionTimeout()` - Clears the timer on logout
     - `handleSessionTimeout()` - Executes logout when time expires
     - `getRemainingTime()` - Returns milliseconds remaining
   - Enhanced `getStatus()` to include session timing info

2. **`src/utils/admin-auth.js`**
   - Updated `login()` function to set session start time
   - Session start stored as `sessionStorage.setItem('adminSessionStart', ...)`

3. **`src/admin-login.html`**
   - Sets session start time on successful login
   - Ensures timer starts fresh on each login

---

## Session Persistence Across Page Reloads

The system intelligently handles page refreshes:

- **Session start time is preserved** in `sessionStorage`
- When admin refreshes page, timer is **restored** with remaining time
- Example: If admin refreshes after 10 minutes, they still have 10 minutes left (not a new 20 minutes)
- If session already expired during refresh, immediate logout occurs

---

## Testing the Feature

### Test 1: Normal 20-Minute Logout
```
1. Log in to admin panel
2. Wait 20 minutes (or adjust SESSION_TIMEOUT to 1 minute for testing)
3. Observe automatic logout and redirect to login page
4. Verify session data is cleared (check sessionStorage in DevTools)
```

### Test 2: Page Refresh During Session
```
1. Log in to admin panel
2. Check console for: "Session timeout started: will logout in 20 minutes"
3. Refresh the page after 5 minutes
4. Check console for: "Session timeout restored: 15 minutes remaining"
5. Verify remaining time is correct (not reset to 20)
```

### Test 3: Manual Logout Before Timeout
```
1. Log in to admin panel
2. Click logout button before 20 minutes
3. Verify session timeout is stopped (check console)
4. Verify clean logout occurs
```

---

## Checking Session Status (Console)

Admins can check session status in browser console:

```javascript
// Get current session status
const status = window.adminHeartbeat.getStatus();
console.log(status);

// Output example:
{
  running: true,
  sessionStartTime: "2024-01-17T10:30:00.000Z",
  sessionTimeoutAt: "2024-01-17T10:50:00.000Z",
  remainingTime: 720000,  // milliseconds
  remainingMinutes: 12,
  remainingSeconds: 0,
  remainingTimeFormatted: "12:00"
}
```

---

## Security Benefits

✅ **Automatic logout** - No manual action needed
✅ **Unattended protection** - Prevents unauthorized access if admin walks away
✅ **Session clearing** - All auth tokens removed on timeout
✅ **Re-authentication required** - Forces fresh login with credentials
✅ **Consistent enforcement** - Applies to all roles (Super Admin, Editor, Analyst)
✅ **No workarounds** - Timer cannot be bypassed or extended

---

## Configuration

To modify the timeout duration, edit `src/utils/admin-heartbeat.js`:

```javascript
const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 minutes in milliseconds

// For different durations:
// 10 minutes: 10 * 60 * 1000
// 30 minutes: 30 * 60 * 1000
// 1 hour: 60 * 60 * 1000
```

**⚠️ Security Note:** Shorter durations are more secure but may interrupt admin workflow. 20 minutes is a good balance.

---

## User Experience

### Timeout Message

When timeout occurs, admin sees:

```
⏰ Session Timeout

For your security, you have been automatically logged out after 20 minutes.

Please log in again to continue.
```

Then automatically redirected to: `/admin-login.html`

---

## Comparison with Other Security Features

| Feature | Purpose | Duration | Can Bypass? |
|---------|---------|----------|-------------|
| **Session Timeout** | Auto-logout | 20 minutes | ❌ No |
| Device Locking | Restrict to specific device | Permanent until reset | ❌ No |
| Heartbeat Monitor | Detect session validity | 60 seconds | ❌ No |
| Login Attempts | Prevent brute force | 5 attempts | ❌ No |

---

## Future Enhancements (Optional)

### 1. **Session Timer Display**
Add a countdown timer in the admin UI showing remaining time:
```
Session expires in: 15:32
```

### 2. **Warning Before Timeout**
Show warning message 2-5 minutes before timeout:
```
⚠️ Your session will expire in 3 minutes. Save any unsaved work.
```

### 3. **Activity-Based Reset** (Use with caution)
Reset timer on user activity (clicks, typing):
- Pro: Better UX for active admins
- Con: Reduces security benefit if admin walks away with browser open

### 4. **Configurable Per Role**
Different timeout durations for different roles:
- Super Admin: 30 minutes
- Editor: 20 minutes
- Analyst: 15 minutes (read-only, lower risk)

---

## Troubleshooting

### Issue: "Logged out immediately after login"
**Cause:** Old session start time in sessionStorage
**Solution:** Clear browser cache and sessionStorage, then login again

### Issue: "Timer not starting"
**Cause:** `admin-heartbeat.js` not loaded
**Solution:** Check that script is included in admin page HTML

### Issue: "Session not timing out"
**Cause:** `start()` function not called
**Solution:** Verify heartbeat starts after login (check console logs)

---

## Summary

The 20-minute session timeout provides **automatic security enforcement** without requiring admin action. It ensures that unattended admin sessions are automatically terminated, reducing the risk of unauthorized access.

✅ Implemented and active
✅ Works across all admin pages
✅ Survives page refreshes
✅ Requires re-authentication

**Status:** Production Ready 🔒
**Last Updated:** 2026-01-17
