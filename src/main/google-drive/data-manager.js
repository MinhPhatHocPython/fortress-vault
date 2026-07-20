const { uploadFile, downloadFile, readLocal, saveLocal, deleteLocal, syncAll } = require('./sync-engine');
const { encrypt, decrypt } = require('./encryption');
const logger = require('../../utils/logger');

// Internal master key for encrypting sensitive data
let dataMasterKey = null;

function setMasterKey(key) { dataMasterKey = key; }
function getMasterKey() { return dataMasterKey; }

// ---- User Profile ----
async function getUserProfile() {
  return downloadFile('users/me.json') || readLocal('users/me.json');
}

async function saveUserProfile(profile) {
  profile.updatedAt = new Date().toISOString();
  await uploadFile('users/me.json', profile);
}

// ---- Wallets ----
async function getWallets() {
  const data = await downloadFile('wallets/list.json') || readLocal('wallets/list.json');
  return data?.wallets || [];
}

async function saveWallets(wallets) {
  await uploadFile('wallets/list.json', { wallets, updatedAt: new Date().toISOString() });
}

async function getWallet(walletId) {
  const wallets = await getWallets();
  return wallets.find(w => w.id === walletId) || null;
}

async function addWallet(wallet) {
  const wallets = await getWallets();
  wallet.id = wallet.id || require('crypto').randomUUID();
  wallet.createdAt = wallet.createdAt || new Date().toISOString();
  wallet.updatedAt = new Date().toISOString();
  wallets.push(wallet);
  await saveWallets(wallets);
  return wallet;
}

async function updateWallet(walletId, updates) {
  const wallets = await getWallets();
  const idx = wallets.findIndex(w => w.id === walletId);
  if (idx === -1) throw new Error('Wallet not found');
  wallets[idx] = { ...wallets[idx], ...updates, updatedAt: new Date().toISOString() };
  await saveWallets(wallets);
  return wallets[idx];
}

async function deleteWallet(walletId) {
  const wallets = await getWallets();
  const filtered = wallets.filter(w => w.id !== walletId);
  await saveWallets(filtered);
}

// ---- Private Keys (encrypted) ----
async function getPrivateKey(walletId) {
  try {
    const encrypted = await downloadFile(`wallets/${walletId}.json`) || readLocal(`wallets/${walletId}.json`);
    if (!encrypted || !dataMasterKey) return null;
    return decrypt(encrypted.ciphertext, dataMasterKey);
  } catch { return null; }
}

async function savePrivateKey(walletId, privateKey) {
  if (!dataMasterKey) throw new Error('Master key not set for encryption');
  const ciphertext = encrypt(privateKey, dataMasterKey);
  await uploadFile(`wallets/${walletId}.json`, { ciphertext, updatedAt: new Date().toISOString() });
}

// ---- Transactions ----
async function getTransactions() {
  const data = await downloadFile('transactions/list.json') || readLocal('transactions/list.json');
  return data?.transactions || [];
}

async function saveTransactions(transactions) {
  await uploadFile('transactions/list.json', { transactions, updatedAt: new Date().toISOString() });
}

async function addTransaction(tx) {
  const transactions = await getTransactions();
  tx.id = tx.id || require('crypto').randomUUID();
  tx.createdAt = tx.createdAt || new Date().toISOString();
  tx.updatedAt = new Date().toISOString();
  transactions.unshift(tx);
  // Keep max 500 transactions
  if (transactions.length > 500) transactions.length = 500;
  await saveTransactions(transactions);
  return tx;
}

// ---- Favorites ----
async function getFavorites() {
  const data = await downloadFile('favorites/list.json') || readLocal('favorites/list.json');
  return data?.favorites || [];
}

async function saveFavorites(favorites) {
  await uploadFile('favorites/list.json', { favorites, updatedAt: new Date().toISOString() });
}

async function addFavorite(fav) {
  const favorites = await getFavorites();
  fav.id = fav.id || require('crypto').randomUUID();
  fav.createdAt = new Date().toISOString();
  favorites.push(fav);
  await saveFavorites(favorites);
  return fav;
}

async function removeFavorite(favId) {
  const favorites = await getFavorites();
  await saveFavorites(favorites.filter(f => f.id !== favId));
}

// ---- Settings ----
async function getSettings() {
  return downloadFile('settings.json') || readLocal('settings.json') || {};
}

async function saveSettings(settings) {
  settings.updatedAt = new Date().toISOString();
  await uploadFile('settings.json', settings);
}

// ---- Full sync ----
async function fullSync() {
  await syncAll();
}

module.exports = {
  setMasterKey, getMasterKey,
  getUserProfile, saveUserProfile,
  getWallets, saveWallets, getWallet, addWallet, updateWallet, deleteWallet,
  getPrivateKey, savePrivateKey,
  getTransactions, saveTransactions, addTransaction,
  getFavorites, saveFavorites, addFavorite, removeFavorite,
  getSettings, saveSettings,
  fullSync,
};
