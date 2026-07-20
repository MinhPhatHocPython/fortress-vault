# Google Drive Setup for Fortress Vault

## 1. Google Cloud Console

1. Go to https://console.cloud.google.com
2. Create a new project (or select existing)
3. Enable **Google Drive API**
4. Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
5. Application type: **Desktop app**
6. Name: `Fortress Vault`
7. Add redirect URI: `urn:ietf:wg:oauth:2.0:oob`
8. Save → Copy **Client ID** and **Client Secret**

## 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```
GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
```

## 3. Install Dependencies

```bash
npm install googleapis keytar
```

**Note:** `keytar` requires native compilation. On Windows, you may need:
```bash
npm install --global windows-build-tools
```

## 4. Architecture

```
User clicks "Sign in with Google"
  → OAuth window opens
  → User authorizes app (scope: drive.appdata)
  → App receives authorization code
  → Code exchanged for access_token + refresh_token
  → Refresh token stored in OS keychain (keytar)
  → Access token kept in memory, auto-refreshed

Data Flow:
  App reads/writes → Local cache (userData) → Sync to Google Drive (appDataFolder)
  On network restore → Auto sync pending changes
```

## 5. Data Storage

| Path | Content |
|------|---------|
| `users/me.json` | User profile (name, email, picture) |
| `wallets/list.json` | All wallets (public keys only) |
| `wallets/{id}.json` | Private key (AES-256 encrypted) |
| `transactions/list.json` | Transaction history |
| `favorites/list.json` | Favorite addresses |
| `settings.json` | App settings (theme, language) |

## 6. Security

- Refresh token: stored in OS keychain via `keytar`
- Access token: memory only, auto-refreshed
- Private keys: AES-256-GCM encrypted before uploading
- Google Drive appData folder: only this app can access
- Scope limited to `drive.appdata` (cannot see user's files)
