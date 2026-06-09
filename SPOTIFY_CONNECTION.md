# Spotify Connection Feature

**Last Updated**: 2025-12-17
**Status**: ✅ Complete - Ready for Testing

---

## 📋 Overview

Email/password users can now connect their Spotify account to enhance their music preferences and enable better matching based on listening history. This feature allows users to:

- Connect Spotify without creating a separate Spotify-only account
- Access Spotify data (top artists, tracks, genres) for better matching
- Maintain email/password authentication while leveraging Spotify features

---

## 🎯 Features Implemented

### 1. **Backend Integration**
- ✅ `POST /api/v1/auth/connect-spotify` endpoint integration
- ✅ JWT-authenticated request to backend
- ✅ Validates user is email-based auth
- ✅ Checks Spotify not already connected
- ✅ Encrypts and stores Spotify tokens

### 2. **Spotify OAuth Flow**
- ✅ `/api/spotify/connect` - Initiates OAuth authorization
- ✅ `/api/spotify/connect/callback` - Handles callback and token exchange
- ✅ Automatic session validation
- ✅ Error handling for all failure scenarios

### 3. **User Interface**
- ✅ Connect button in settings page (email users only)
- ✅ Loading states during connection
- ✅ Success/error message display
- ✅ Connection status indicator
- ✅ Disabled state after successful connection

---

## 🔄 Connection Flow

```mermaid
sequenceDiagram
    User->>Settings Page: Click "Connect"
    Settings Page->>/api/spotify/connect: GET request
    /api/spotify/connect->>Session: Validate user
    /api/spotify/connect->>Spotify: Redirect to authorize
    User->>Spotify: Approve connection
    Spotify->>/callback: Return with code
    /callback->>Spotify API: Exchange code for tokens
    Spotify API->>/callback: Return access + refresh tokens
    /callback->>Spotify API: Fetch user profile
    Spotify API->>/callback: Return profile data
    /callback->>Backend: POST /auth/connect-spotify
    Backend->>Database: Store encrypted tokens
    Backend->>/callback: Return success
    /callback->>Settings Page: Redirect with success
    Settings Page->>User: Show success message
```

---

## 📁 File Structure

```
app/
├── api/
│   └── spotify/
│       └── connect/
│           ├── route.ts              # OAuth initiation
│           └── callback/
│               └── route.ts          # OAuth callback handler
├── serverActions/
│   └── auth.ts                       # connectSpotify() function
├── profile/
│   └── settings/
│       └── page.tsx                  # Updated with connection UI
└── types/
    └── auth.ts                       # ConnectSpotifyRequestDto type
```

---

## 🛠️ Technical Implementation

### OAuth Initiation (`/api/spotify/connect/route.ts`)

**Responsibilities**:
- Validates user is authenticated
- Checks user is email-based (not already Spotify)
- Builds Spotify authorization URL
- Redirects to Spotify OAuth

**Scopes Requested**:
- `user-read-email` - Access email address
- `user-read-private` - Access profile information
- `user-top-read` - Access top artists and tracks
- `user-read-recently-played` - Access listening history

**Security**:
- Session validation before redirect
- Provider check (email users only)
- Environment variable validation

---

### OAuth Callback (`/api/spotify/connect/callback/route.ts`)

**Responsibilities**:
1. **Validate Session** - Ensures user still authenticated
2. **Handle Errors** - Processes OAuth errors (denial, etc.)
3. **Exchange Code** - Trades authorization code for tokens
4. **Fetch Profile** - Gets Spotify user ID
5. **Connect Account** - Calls backend to store connection
6. **Redirect** - Returns to settings with result

**Token Exchange**:
```typescript
POST https://accounts.spotify.com/api/token
Body: {
  grant_type: 'authorization_code',
  code: '<auth_code>',
  redirect_uri: '<callback_url>'
}
Headers: {
  Authorization: 'Basic <base64(client_id:client_secret)>'
}
```

**Backend Connection**:
```typescript
POST /api/v1/auth/connect-spotify
Headers: {
  Authorization: 'Bearer <user_jwt>'
}
Body: {
  spotifyId: '<spotify_user_id>',
  spotifyAccessToken: '<spotify_access_token>',
  spotifyRefreshToken: '<spotify_refresh_token>',
  spotifyTokenExpiresAt: <unix_timestamp>
}
```

---

### Server Action (`app/serverActions/auth.ts`)

**Function**: `connectSpotify(data: ConnectSpotifyRequestDto)`

**Features**:
- Server-side execution (`'use server'`)
- Automatic JWT authentication
- Type-safe request/response
- Error handling with ApiResult

**Implementation**:
```typescript
export async function connectSpotify(
  data: ConnectSpotifyRequestDto
): Promise<ApiResult<AuthResponseDto>> {
  return makeAuthenticatedRequest<AuthResponseDto>(
    '/api/v1/auth/connect-spotify',
    'POST',
    data
  );
}
```

---

### UI Integration (`app/profile/settings/page.tsx`)

**Features**:
- **URL Param Handling** - Reads success/error from callback
- **State Management** - Loading, success, error states
- **Conditional Rendering** - Only shows for email users
- **Button States** - Loading, connected, ready to connect
- **Message Display** - Success/error feedback with icons

**User Experience**:
1. User clicks "Connect" button
2. Button shows loading state
3. Redirects to Spotify OAuth
4. User approves on Spotify
5. Returns to settings with success message
6. Button disabled showing "Connected"

---

## 🎨 UI States

### Initial State (Not Connected)
```tsx
<Button variant="outline" onClick={handleConnectSpotify}>
  Connect
</Button>
```

### Loading State
```tsx
<Button disabled>
  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  Connecting...
</Button>
```

### Connected State
```tsx
<Button disabled>
  Connected
</Button>
```

### Error State
```tsx
<AlertCircle className="h-5 w-5 text-destructive" />
<p className="text-sm text-destructive">
  Failed to save Spotify connection.
</p>
```

---

## 🔒 Security Considerations

### Session Validation
- ✅ Validates session before OAuth initiation
- ✅ Re-validates session in callback
- ✅ Ensures user didn't sign out during OAuth

### Provider Checks
- ✅ Prevents Spotify users from connecting again
- ✅ Only allows email users to connect
- ✅ Backend validates provider type

### Token Security
- ✅ Tokens exchanged server-side only
- ✅ Never exposed to client
- ✅ Backend encrypts tokens before storage
- ✅ JWT authentication for backend call

### Error Handling
- ✅ User denial handled gracefully
- ✅ Token exchange failures caught
- ✅ Backend errors displayed safely
- ✅ No sensitive data in error messages

---

## 📝 Error Messages

| Error Code | User Message | Cause |
|-----------|--------------|-------|
| `spotify_connected` | ✅ Spotify account connected successfully! | Connection succeeded |
| `not_authenticated` | You must be logged in to connect Spotify. | Session expired |
| `already_spotify` | You are already using Spotify authentication. | User is Spotify provider |
| `spotify_denied` | Spotify connection was cancelled. | User denied on Spotify |
| `no_code` | No authorization code received from Spotify. | Missing OAuth code |
| `token_exchange_failed` | Failed to exchange tokens with Spotify. | Token API error |
| `profile_fetch_failed` | Failed to fetch your Spotify profile. | Profile API error |
| `backend_failed` | Failed to save Spotify connection. | Backend API error |
| `unknown` | An unknown error occurred. | Unexpected error |

---

## 🧪 Testing Guide

### Prerequisites
- ✅ Backend running on `http://localhost:8080`
- ✅ Spotify OAuth configured in `.env.local`
- ✅ Email user account created

### Test Cases

#### 1. Successful Connection
1. Login with email/password
2. Navigate to `/profile/settings`
3. Verify "Connected Accounts" section visible
4. Click "Connect" button
5. Verify redirect to Spotify
6. Approve connection on Spotify
7. Verify redirect back to settings
8. Verify success message displays
9. Verify button shows "Connected"

#### 2. User Denial
1. Login with email/password
2. Navigate to `/profile/settings`
3. Click "Connect" button
4. Deny on Spotify
5. Verify error message displays
6. Verify button still shows "Connect"

#### 3. Session Expiry
1. Login with email/password
2. Navigate to `/profile/settings`
3. Sign out in another tab
4. Click "Connect" button
5. Verify error message about authentication

#### 4. Spotify User (Should Not See)
1. Login with Spotify
2. Navigate to `/profile/settings`
3. Verify "Connected Accounts" section NOT visible

#### 5. Already Connected
1. Login with email user who connected Spotify
2. Navigate to `/profile/settings`
3. Verify button shows "Connected"
4. Verify button is disabled

---

## 🔧 Configuration

### Environment Variables

```env
# Required for Spotify connection
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NEXTAUTH_URL=http://localhost:3000

# Backend API
BACKEND_API_URL=http://localhost:8080
```

### Spotify App Settings

**Redirect URIs** (must be configured in Spotify Dashboard):
```
http://localhost:3000/api/spotify/connect/callback
https://yourdomain.com/api/spotify/connect/callback
```

---

## 🚀 Usage Examples

### Triggering Connection (Client)

```typescript
const handleConnectSpotify = () => {
  setIsConnectingSpotify(true);
  window.location.href = '/api/spotify/connect';
};
```

### Checking Connection Status

```typescript
const isSpotifyConnected =
  session?.authProvider === 'SPOTIFY' ||
  spotifyMessage?.type === 'success';
```

### Handling Callback Results

```typescript
useEffect(() => {
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  if (success === 'spotify_connected') {
    setSpotifyMessage({
      type: 'success',
      text: 'Spotify account connected successfully!'
    });
  } else if (error) {
    setSpotifyMessage({
      type: 'error',
      text: ERROR_MESSAGES[error] || 'An error occurred'
    });
  }
}, [searchParams]);
```

---

## 🔮 Future Enhancements

### Backend Integration
- ✨ Fetch and display Spotify profile data in settings
- ✨ Show connected Spotify username/email
- ✨ Disconnect Spotify option
- ✨ Token refresh status indicator

### UI Improvements
- ✨ Preview Spotify data before connecting
- ✨ Show benefits of connecting
- ✨ Connection history/timestamp
- ✨ Spotify data sync status

### Features
- ✨ Auto-sync music preferences after connection
- ✨ Import playlists for better matching
- ✨ Concert recommendations based on Spotify
- ✨ Shared playlist creation with matches

---

## 📊 Backend API Specification

### Endpoint Details

**URL**: `POST /api/v1/auth/connect-spotify`

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "spotifyId": "string (required)",
  "spotifyAccessToken": "string (required)",
  "spotifyRefreshToken": "string (required)",
  "spotifyTokenExpiresAt": "number (required, unix timestamp)"
}
```

**Response** (200 OK):
```json
{
  "token": "string",
  "userId": "string",
  "email": "string",
  "name": "string",
  "registrationStage": "string",
  "emailVerified": "boolean",
  "authProvider": "EMAIL"
}
```

**Error Responses**:
- `400 Bad Request` - User not email provider
- `400 Bad Request` - Spotify already connected
- `401 Unauthorized` - Invalid/missing JWT
- `409 Conflict` - Spotify ID already linked to another account
- `500 Internal Server Error` - Server error

---

## 🐛 Troubleshooting

### "Token exchange failed"
- **Cause**: Invalid Spotify credentials or callback URL mismatch
- **Solution**: Check Spotify app settings, verify redirect URI matches

### "Backend connection failed"
- **Cause**: Backend API not running or network issue
- **Solution**: Ensure backend is running on correct port, check CORS

### "No authorization code"
- **Cause**: OAuth flow interrupted or Spotify error
- **Solution**: Try again, check Spotify app status

### Connection shows but music data not available
- **Cause**: Backend hasn't synced Spotify data yet
- **Solution**: Check backend logs, may need to trigger sync

---

## ✅ Summary

The Spotify connection feature is **fully implemented** with:

✅ Complete OAuth flow (initiate + callback)
✅ Backend API integration
✅ Type-safe server actions
✅ Full error handling
✅ User-friendly UI with feedback
✅ Security validations
✅ Loading states and disabled states
✅ Session management
✅ Comprehensive error messages

**Status**: 🟢 Ready for Testing with Backend

---

**Next Steps**: Test with running backend and configure Spotify app redirect URIs in Spotify Developer Dashboard.
