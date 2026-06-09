# Spotify OAuth Setup Guide

## 🎯 Quick Fix for "Invalid Redirect URI" Error

Spotify doesn't allow `localhost` in redirect URIs, but it **does allow `127.0.0.1`**.

---

## ✅ Step 1: Update Your `.env.local` File

Make sure your `.env.local` file uses `127.0.0.1` instead of `localhost`:

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://127.0.0.1:3000

# Spotify OAuth
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Backend API
BACKEND_API_URL=http://127.0.0.1:8080
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
```

**Important:** Replace `your_spotify_client_id_here` and `your_spotify_client_secret_here` with your actual Spotify credentials.

---

## ✅ Step 2: Add Redirect URIs to Spotify Developer Dashboard

### Go to Spotify Developer Dashboard
1. Visit: https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click on your app

### Add These TWO Redirect URIs

In your app settings, add **both** of these redirect URIs:

```
http://127.0.0.1:3000/api/auth/callback/spotify
http://127.0.0.1:3000/api/spotify/connect/callback
```

### Step-by-Step:
1. Click **"Settings"** button (top right)
2. Scroll down to **"Redirect URIs"** section
3. Enter: `http://127.0.0.1:3000/api/auth/callback/spotify`
4. Click **"Add"**
5. Enter: `http://127.0.0.1:3000/api/spotify/connect/callback`
6. Click **"Add"**
7. Click **"Save"** at the bottom

### Your Redirect URIs Section Should Look Like This:

```
┌──────────────────────────────────────────────────────┐
│ Redirect URIs                                        │
├──────────────────────────────────────────────────────┤
│ • http://127.0.0.1:3000/api/auth/callback/spotify   │
│ • http://127.0.0.1:3000/api/spotify/connect/callback│
│                                                      │
│ [Add]                                          [Save]│
└──────────────────────────────────────────────────────┘
```

---

## ✅ Step 3: Access Your App with 127.0.0.1

**Important:** You must access your app using `http://127.0.0.1:3000` instead of `http://localhost:3000`

### Start Your App
```bash
npm run dev
```

### Open Browser At
```
http://127.0.0.1:3000
```

**NOT** `http://localhost:3000` ❌

---

## 🧪 Test the Setup

### Test 1: Login with Spotify
1. Go to `http://127.0.0.1:3000`
2. Click "Sign In"
3. Click "Login with Spotify"
4. ✅ Should work (you said this already works)

### Test 2: Connect Spotify (for Preferences)
1. Log in with email/password (or Spotify)
2. Go to `http://127.0.0.1:3000/preferences/edit`
3. Click "Sync from Spotify"
4. ✅ Should now redirect to Spotify successfully!

---

## 🔍 Why Two Redirect URIs?

Your app has **two different Spotify OAuth flows**:

### Flow 1: Login with Spotify
- **Redirect URI:** `http://127.0.0.1:3000/api/auth/callback/spotify`
- **Used for:** NextAuth authentication (signing in with Spotify)
- **Handles:** Creating user account and logging in

### Flow 2: Connect Spotify for Music Preferences
- **Redirect URI:** `http://127.0.0.1:3000/api/spotify/connect/callback`
- **Used for:** Linking Spotify to email accounts to sync music preferences (Phase 2)
- **Handles:** Syncing genre preferences from listening history

**Both are needed!**

---

## 🚨 Common Mistakes

### ❌ Wrong: Using localhost
```
http://localhost:3000/api/auth/callback/spotify  ❌
```

### ✅ Correct: Using 127.0.0.1
```
http://127.0.0.1:3000/api/auth/callback/spotify  ✅
```

### ❌ Wrong: Accessing app with localhost
```
Browser: http://localhost:3000  ❌
```

### ✅ Correct: Accessing app with 127.0.0.1
```
Browser: http://127.0.0.1:3000  ✅
```

### ❌ Wrong: Forgetting to add both redirect URIs
```
Only added: /api/auth/callback/spotify  ❌
Missing: /api/spotify/connect/callback
```

### ✅ Correct: Adding both redirect URIs
```
✓ http://127.0.0.1:3000/api/auth/callback/spotify
✓ http://127.0.0.1:3000/api/spotify/connect/callback
```

---

## 🔧 Troubleshooting

### Still seeing "Invalid Redirect URI"?

1. **Double-check Spotify Dashboard**
   - Make sure both URIs are saved
   - Look for typos (extra spaces, wrong port, etc.)

2. **Clear Browser Cache**
   - Sometimes old OAuth redirects are cached
   - Try incognito/private mode

3. **Restart Development Server**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

4. **Check .env.local**
   - Make sure you're using `127.0.0.1` not `localhost`
   - Make sure Spotify credentials are correct

5. **Verify You're Using the Right URL**
   - Browser should show: `http://127.0.0.1:3000`
   - Not: `http://localhost:3000`

### Still not working?

Check the browser console (F12) for error messages and the Network tab to see what redirect URI is being sent to Spotify.

---

## 📝 Production Setup (Later)

When you deploy to production, you'll need to add production redirect URIs:

```
https://yourdomain.com/api/auth/callback/spotify
https://yourdomain.com/api/spotify/connect/callback
```

And update your production environment variables:

```bash
NEXTAUTH_URL=https://yourdomain.com
BACKEND_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## ✅ Checklist

- [ ] Updated `.env.local` to use `127.0.0.1`
- [ ] Added first redirect URI: `http://127.0.0.1:3000/api/auth/callback/spotify`
- [ ] Added second redirect URI: `http://127.0.0.1:3000/api/spotify/connect/callback`
- [ ] Clicked "Save" in Spotify Dashboard
- [ ] Accessing app at `http://127.0.0.1:3000` (not localhost)
- [ ] Tested "Login with Spotify" ✓
- [ ] Tested "Sync from Spotify" (preferences)

---

**That's it!** Both Spotify flows should now work correctly. 🎉
