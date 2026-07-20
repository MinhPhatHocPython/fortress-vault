const { google } = require('googleapis');
const { BrowserWindow } = require('electron');
const path = require('path');
const keytar = require('keytar');
const { v4: uuidv4 } = require('uuid');

const SERVICE_NAME = 'fortress-vault';
const ACCOUNT_KEY = 'google-account';
const TOKEN_KEY = 'google-refresh-token';

const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];

let currentTokens = null;
let currentUserInfo = null;

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
  }
  return new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
}

async function loginWithGoogle() {
  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  const code = await new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 500, height: 700,
      title: 'Fortress Vault - Google Login',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    win.loadURL(authUrl);
    win.on('closed', () => reject(new Error('Login window closed')));
    const filter = { urls: ['https://accounts.google.com/o/oauth2/approval*'] };
    win.webContents.on('will-redirect', (event, url) => {
      const match = url.match(/code=([^&]+)/);
      if (match) { resolve(decodeURIComponent(match[1])); win.close(); }
    });
    win.webContents.session.webRequest.onBeforeRequest(filter, (details) => {
      const match = details.url.match(/code=([^&]+)/);
      if (match) { resolve(decodeURIComponent(match[1])); win.close(); }
    });
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  currentTokens = tokens;

  // Get user info
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();
  currentUserInfo = userInfo;

  // Store refresh token securely
  if (tokens.refresh_token) {
    await keytar.setPassword(SERVICE_NAME, TOKEN_KEY, tokens.refresh_token);
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_KEY, JSON.stringify(userInfo));
  }

  return { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, userInfo };
}

async function restoreSession() {
  try {
    const refreshToken = await keytar.getPassword(SERVICE_NAME, TOKEN_KEY);
    const accountData = await keytar.getPassword(SERVICE_NAME, ACCOUNT_KEY);
    if (!refreshToken || !accountData) return null;
    currentUserInfo = JSON.parse(accountData);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    currentTokens = credentials;
    return { accessToken: credentials.access_token, userInfo: currentUserInfo };
  } catch (err) {
    console.error('[OAuth] Restore session failed:', err.message);
    await logout();
    return null;
  }
}

async function getAccessToken() {
  if (currentTokens?.access_token && !isTokenExpired()) {
    return currentTokens.access_token;
  }
  const refreshToken = await keytar.getPassword(SERVICE_NAME, TOKEN_KEY);
  if (!refreshToken) throw new Error('No refresh token available');
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  currentTokens = credentials;
  return credentials.access_token;
}

function isTokenExpired() {
  if (!currentTokens?.expiry_date) return true;
  return Date.now() >= currentTokens.expiry_date - 60000;
}

async function logout() {
  await keytar.deletePassword(SERVICE_NAME, TOKEN_KEY);
  await keytar.deletePassword(SERVICE_NAME, ACCOUNT_KEY);
  currentTokens = null;
  currentUserInfo = null;
}

function getUserInfo() { return currentUserInfo; }
function isLoggedIn() { return !!currentTokens?.access_token; }

module.exports = { loginWithGoogle, restoreSession, getAccessToken, logout, getUserInfo, isLoggedIn, getOAuth2Client };
