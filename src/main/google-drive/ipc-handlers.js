const { ipcMain } = require('electron');
const oauth = require('./oauth');
const dataManager = require('./data-manager');
const syncEngine = require('./sync-engine');
const logger = require('../../utils/logger');

function registerDriveIpcHandlers() {
  // OAuth
  ipcMain.handle('google-drive:login', async () => {
    try {
      const result = await oauth.loginWithGoogle();
      syncEngine.initCache();
      dataManager.setMasterKey(result.userInfo.id);
      await dataManager.saveUserProfile(result.userInfo);
      await syncEngine.syncAll();
      return { success: true, data: result };
    } catch (err) {
      logger.error('[IPC] Login failed:', err.message);
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('google-drive:restore', async () => {
    try {
      const result = await oauth.restoreSession();
      if (!result) return { success: false, loggedIn: false };
      syncEngine.initCache();
      dataManager.setMasterKey(result.userInfo.id);
      syncEngine.syncAll().catch(() => {});
      return { success: true, data: result };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('google-drive:logout', async () => {
    await oauth.logout();
    return { success: true };
  });

  ipcMain.handle('google-drive:is-logged-in', () => {
    return { loggedIn: oauth.isLoggedIn() };
  });

  ipcMain.handle('google-drive:get-user-info', () => {
    return oauth.getUserInfo();
  });

  // Data manager handlers
  ipcMain.handle('drive-data:get-wallets', async () => {
    try { return { success: true, data: await dataManager.getWallets() }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:add-wallet', async (_event, wallet) => {
    try { return { success: true, data: await dataManager.addWallet(wallet) }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:update-wallet', async (_event, id, updates) => {
    try { return { success: true, data: await dataManager.updateWallet(id, updates) }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:delete-wallet', async (_event, id) => {
    try { await dataManager.deleteWallet(id); return { success: true }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:get-transactions', async () => {
    try { return { success: true, data: await dataManager.getTransactions() }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:add-transaction', async (_event, tx) => {
    try { return { success: true, data: await dataManager.addTransaction(tx) }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:get-favorites', async () => {
    try { return { success: true, data: await dataManager.getFavorites() }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:add-favorite', async (_event, fav) => {
    try { return { success: true, data: await dataManager.addFavorite(fav) }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:remove-favorite', async (_event, id) => {
    try { await dataManager.removeFavorite(id); return { success: true }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:get-settings', async () => {
    try { return { success: true, data: await dataManager.getSettings() }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:save-settings', async (_event, settings) => {
    try { await dataManager.saveSettings(settings); return { success: true }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:get-profile', async () => {
    try { return { success: true, data: await dataManager.getUserProfile() }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:sync-all', async () => {
    try { await dataManager.fullSync(); return { success: true }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('drive-data:get-sync-status', () => {
    return syncEngine.getSyncStatus();
  });

  ipcMain.handle('drive-data:set-network-status', async (_event, online) => {
    syncEngine.setNetworkStatus(online);
  });
}

module.exports = { registerDriveIpcHandlers };
