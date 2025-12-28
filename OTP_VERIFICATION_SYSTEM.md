# OTP Email Verification System

## Overview

This system implements **One-Time Password (OTP) email verification** for user signup. **No user account is created until the email is verified with the OTP code.**

## How It Works

### User Flow

1. **User enters signup details** (Name, Email, Password)
2. **OTP sent to email** (6-digit code, valid for 10 minutes)
3. **User enters OTP code** (6 separate input boxes)
4. **Account created** (only after successful OTP verification)
5. **User can sign in** (email is pre-verified)

### Security Features

- ✅ **No account until verified** - User doesn't exist in database until OTP is confirmed
- ✅ **Time-limited codes** - OTP expires after 10 minutes
- ✅ **Attempt limiting** - Maximum 5 attempts per OTP
- ✅ **Automatic cleanup** - Expired OTPs are auto-deleted
- ✅ **Rate limiting** - 60-second cooldown between resend requests
- ✅ **Secure storage** - OTPs stored in Supabase with RLS policies

## Setup Instructions

### 1. Create Supabase Table

Run this SQL in your Supabase SQL Editor:

```sql
-- See supabase-migrations/create-otp-codes-table.sql
```

Or execute:
```bash
psql -h db.PROJECT_ID.supabase.co -U postgres -d postgres -f supabase-migrations/create-otp-codes-table.sql
```

### 2. Configure Email Service

The system uses **Brevo** (formerly SendinBlue) for sending OTP emails.

Ensure `BREVO_API_KEY` is set in Netlify environment variables.

### 3. Deploy Functions

The following Netlify functions handle OTP:

- `netlify/functions/send-otp.js` - Sends OTP code via email
- `netlify/functions/verify-otp.js` - Verifies OTP and creates account

These are automatically deployed with `netlify deploy`.

## Files Modified

### Frontend

- `src/login.html`
  - Added OTP verification form UI
  - 6-digit OTP input boxes with auto-focus
  - Resend OTP button with 60-second timer
  - Complete OTP verification flow

### Backend

- `netlify/functions/send-otp.js`
  - Generates 6-digit OTP
  - Stores in Supabase `otp_codes` table
  - Sends email via Brevo

- `netlify/functions/verify-otp.js`
  - Validates OTP code
  - Checks expiration and attempts
  - Creates Supabase user with `admin.createUser()`
  - Marks email as verified immediately

### Database

- `supabase-migrations/create-otp-codes-table.sql`
  - Creates `otp_codes` table
  - RLS policies for service role access
  - Cleanup function for expired OTPs

## OTP Email Template

The email includes:
- 6-digit OTP code (large, centered)
- Expiration notice (10 minutes)
- Security warning (don't share code)
- Kurdish (Badini) language
- Responsive HTML design

## Testing

### Local Testing

1. Start local server:
   ```bash
   netlify dev
   ```

2. Go to `http://localhost:8888/login.html`

3. Try signup flow:
   - Enter name, email, password
   - Click "Create Account"
   - Check email for OTP
   - Enter 6-digit code
   - Verify account created

### Production Testing

1. Go to `https://tafsirkurd.com/login.html`
2. Complete signup with real email
3. Check inbox for OTP code
4. Verify account creation

## API Endpoints

### POST /.netlify/functions/send-otp

Sends OTP code to email.

**Request:**
```json
{
  "email": "user@example.com",
  "name": "User Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

### POST /.netlify/functions/verify-otp

Verifies OTP and creates account.

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "password": "userpassword",
  "name": "User Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

## Error Handling

| Error | Message | Action |
|-------|---------|--------|
| OTP not found | کۆدی پشتڕاستکردنەوە نەدۆزرایەوە | Request new code |
| OTP expired | کۆدی پشتڕاستکردنەوە بەسەرچووە | Request new code |
| Invalid OTP | کۆدی هەڵە | Try again (5 attempts) |
| Too many attempts | زۆر هەوڵت داوە | Request new code |
| Email exists | ئەم ئیمەیلە پێشتر تۆمارکراوە | Sign in instead |

## Security Considerations

1. **OTP Storage**: OTPs are stored hashed in production (consider implementing)
2. **Rate Limiting**: Built-in 60-second cooldown on resend
3. **Attempt Limiting**: Maximum 5 verification attempts
4. **Expiration**: 10-minute validity window
5. **Service Role**: Functions use `SUPABASE_SERVICE_ROLE_KEY` for admin operations
6. **CORS**: Proper CORS headers on all endpoints

## Maintenance

### Clean Up Expired OTPs

Manually:
```sql
DELETE FROM otp_codes WHERE expires_at < NOW();
```

Automatically:
```sql
SELECT cleanup_expired_otps();
```

Or schedule with pg_cron (if enabled).

### Monitor OTP Usage

```sql
SELECT
  COUNT(*) as total_otps,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_otps,
  COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_otps
FROM otp_codes;
```

## Troubleshooting

### OTP Email Not Received

1. Check Brevo API key is valid
2. Check spam folder
3. Verify sender domain configuration
4. Check Netlify function logs

### OTP Verification Failing

1. Check Supabase `otp_codes` table exists
2. Verify RLS policies allow service role access
3. Check function logs for errors
4. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set

### Account Not Created

1. Check user doesn't already exist
2. Verify Supabase `admin.createUser()` permissions
3. Check password meets requirements (min 6 characters)
4. Review function logs for errors

## Future Enhancements

- [ ] Hash OTP codes in database
- [ ] Add SMS OTP option
- [ ] Implement rate limiting per IP
- [ ] Add CAPTCHA for bot prevention
- [ ] Email delivery status tracking
- [ ] OTP analytics dashboard

## Support

For issues or questions:
- Check Netlify function logs
- Check Supabase logs
- Review browser console errors
- Test with different email providers
