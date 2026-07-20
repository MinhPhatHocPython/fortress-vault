const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { readFile: driveRead, writeFile: driveWrite, deleteFile: driveDelete, listFiles: driveList } = require('./drive-api');
const logger = require('../../utils/logger');

const CACHE_DIR = path.join(app.getPath('userData'), 'drive-cache');
const SYNC_META_FILE = path.join(CACHE_DIR, '.sync-meta.json');

let syncInProgress = false;
let pendingWrites = 0;
let networkAvailable = true;

function initCache() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(SYNC_META_FILE)) {
    fs.writeFileSync(SYNC_META_FILE, JSON.stringify({ lastSync: null, version: 1 }));
  }
}

function getLocalPath(relativePath) {
  return path.join(CACHE_DIR, relativePath.replace(/\//g, path.sep));
}

function readLocal(relativePath) {
  try {
    const localPath = getLocalPath(relativePath);
    if (!fs.existsSync(localPath)) return null;
    return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
  } catch (err) {
    logger.error('[Sync] Read local failed:', relativePath, err.message);
    return null;
  }
}

function saveLocal(relativePath, data) {
  try {
    const localPath = getLocalPath(relativePath);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf-8');
    logger.info('[Sync] Saved local:', relativePath);
  } catch (err) {
    logger.error('[Sync] Save local failed:', relativePath, err.message);
  }
}

function deleteLocal(relativePath) {
  try {
    const localPath = getLocalPath(relativePath);
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  } catch (err) {
    logger.error('[Sync] Delete local failed:', relativePath, err.message);
  }
}

/** Sync a single file: upload local changes, download remote changes */
async function syncFile(relativePath) {
  const localData = readLocal(relativePath);
  let remoteData = null;
  try { remoteData = await driveRead(relativePath); } catch { /* file may not exist remotely */ }

  // No remote data: upload local
  if (!remoteData && localData) {
    await driveWrite(relativePath, localData);
    logger.info('[Sync] Uploaded new:', relativePath);
    return;
  }

  // No local data: download remote
  if (!localData && remoteData) {
    saveLocal(relativePath, remoteData);
    logger.info('[Sync] Downloaded new:', relativePath);
    return;
  }

  // Both exist: compare timestamps (using updatedAt field)
  if (localData && remoteData) {
    const localTs = localData.updatedAt || localData.updated_at || 0;
    const remoteTs = remoteData.updatedAt || remoteData.updated_at || 0;
    if (remoteTs > localTs) {
      saveLocal(relativePath, remoteData);
      logger.info('[Sync] Remote newer, downloaded:', relativePath);
    } else if (localTs > remoteTs) {
      await driveWrite(relativePath, localData);
      logger.info('[Sync] Local newer, uploaded:', relativePath);
    }
  }
}

/** Sync all known files */
async function syncAll() {
  if (syncInProgress) { logger.warn('[Sync] Already in progress'); return; }
  syncInProgress = true;
  try {
    const files = [
      'users/me.json', 'wallets/list.json', 'transactions/list.json',
      'favorites/list.json', 'settings.json',
    ];
    for (const file of files) {
      try { await syncFile(file); } catch (err) {
        logger.error('[Sync] Sync failed for:', file, err.message);
      }
    }
    const meta = JSON.parse(fs.readFileSync(SYNC_META_FILE, 'utf-8'));
    meta.lastSync = new Date().toISOString();
    fs.writeFileSync(SYNC_META_FILE, JSON.stringify(meta, null, 2));
    logger.info('[Sync] All files synced');
  } catch (err) {
    logger.error('[Sync] Sync all failed:', err.message);
  } finally {
    syncInProgress = false;
  }
}

async function uploadFile(relativePath, data) {
  saveLocal(relativePath, data);
  if (networkAvailable) {
    try {
      await driveWrite(relativePath, data);
      logger.info('[Sync] Uploaded:', relativePath);
    } catch (err) {
      logger.warn('[Sync] Upload failed (will retry):', relativePath, err.message);
      pendingWrites++;
    }
  } else {
    pendingWrites++;
    logger.info('[Sync] Queued (offline):', relativePath);
  }
}

async function downloadFile(relativePath) {
  try {
    const data = await driveRead(relativePath);
    if (data) {
      saveLocal(relativePath, data);
      return data;
    }
    return null;
  } catch (err) {
    logger.error('[Sync] Download failed:', relativePath, err.message);
    return readLocal(relativePath);
  }
}

function setNetworkStatus(available) {
  networkAvailable = available;
  if (available && pendingWrites > 0) {
    logger.info(`[Sync] Network restored, flushing ${pendingWrites} pending writes`);
    syncAll();
    pendingWrites = 0;
  }
}

function getSyncStatus() {
  const meta = JSON.parse(fs.readFileSync(SYNC_META_FILE, 'utf-8'));
  return { lastSync: meta.lastSync, pendingWrites, networkAvailable, syncInProgress };
}

module.exports = { initCache, readLocal, saveLocal, deleteLocal, syncFile, syncAll, uploadFile, downloadFile, setNetworkStatus, getSyncStatus };
