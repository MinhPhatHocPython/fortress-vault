const { google } = require('googleapis');
const { getOAuth2Client, getAccessToken } = require('./oauth');
const logger = require('../../utils/logger');

const ROOT_FOLDER = 'fortress-vault';

function getDriveClient() {
  const oauth2Client = getOAuth2Client();
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function ensureAppFolder() {
  const drive = getDriveClient();
  const res = await drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${ROOT_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });
  if (res.data.files.length > 0) return res.data.files[0].id;
  const folder = await drive.files.create({
    requestBody: { name: ROOT_FOLDER, mimeType: 'application/vnd.google-apps.folder', parents: ['appDataFolder'] },
    fields: 'id',
  });
  return folder.data.id;
}

async function readFile(filePath) {
  try {
    const accessToken = await getAccessToken();
    const drive = getDriveClient();
    const folderId = await ensureAppFolder();

    const searchRes = await drive.files.list({
      spaces: 'appDataFolder',
      q: `name='${filePath.replace(/\//g, "' and parents in appDataFolder or name='")}' and trashed=false`,
      fields: 'files(id, name)',
    });

    let fileId = null;
    const parts = filePath.split('/');
    let parentId = folderId;
    for (let i = 0; i < parts.length; i++) {
      const res = await drive.files.list({
        spaces: 'appDataFolder',
        q: `name='${parts[i]}' and '${parentId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType)',
      });
      if (res.data.files.length === 0) return null;
      const entry = res.data.files[0];
      if (i === parts.length - 1 && entry.mimeType !== 'application/vnd.google-apps.folder') {
        fileId = entry.id;
        break;
      }
      parentId = entry.id;
    }

    if (!fileId) return null;
    const fileRes = await drive.files.get({ fileId, alt: 'media' });
    const raw = typeof fileRes.data === 'string' ? fileRes.data : JSON.stringify(fileRes.data);
    return JSON.parse(raw);
  } catch (err) {
    logger.error('[Drive] Read file failed:', filePath, err.message);
    if (err.message.includes('Not Found')) return null;
    throw err;
  }
}

async function writeFile(filePath, data) {
  try {
    const drive = getDriveClient();
    const folderId = await ensureAppFolder();
    const parts = filePath.split('/');
    const fileName = parts.pop();

    // Ensure parent folder hierarchy exists
    let parentId = folderId;
    for (const folderName of parts) {
      const searchRes = await drive.files.list({
        spaces: 'appDataFolder',
        q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
      });
      if (searchRes.data.files.length > 0) {
        parentId = searchRes.data.files[0].id;
      } else {
        const folder = await drive.files.create({
          requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
          fields: 'id',
        });
        parentId = folder.data.id;
      }
    }

    // Check if file exists
    const searchRes = await drive.files.list({
      spaces: 'appDataFolder',
      q: `name='${fileName}' and '${parentId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    if (searchRes.data.files.length > 0) {
      await drive.files.update({
        fileId: searchRes.data.files[0].id,
        media: { mimeType: 'application/json', body: content },
      });
    } else {
      await drive.files.create({
        requestBody: { name: fileName, parents: [parentId] },
        media: { mimeType: 'application/json', body: content },
      });
    }
    logger.info('[Drive] Written:', filePath);
  } catch (err) {
    logger.error('[Drive] Write file failed:', filePath, err.message);
    throw err;
  }
}

async function deleteFile(filePath) {
  try {
    const drive = getDriveClient();
    const data = await readFile(filePath);
    if (!data) return;
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];

    const folderId = await ensureAppFolder();
    let parentId = folderId;
    for (let i = 0; i < parts.length - 1; i++) {
      const res = await drive.files.list({
        spaces: 'appDataFolder',
        q: `name='${parts[i]}' and '${parentId}' in parents and trashed=false`,
        fields: 'files(id)',
      });
      if (res.data.files.length === 0) return;
      parentId = res.data.files[0].id;
    }

    const res = await drive.files.list({
      spaces: 'appDataFolder',
      q: `name='${fileName}' and '${parentId}' in parents and trashed=false`,
      fields: 'files(id)',
    });
    if (res.data.files.length > 0) {
      await drive.files.delete({ fileId: res.data.files[0].id });
      logger.info('[Drive] Deleted:', filePath);
    }
  } catch (err) {
    logger.error('[Drive] Delete file failed:', filePath, err.message);
    throw err;
  }
}

async function listFiles(folder) {
  try {
    const drive = getDriveClient();
    const folderId = await ensureAppFolder();
    let parentId = folderId;
    if (folder) {
      const parts = folder.split('/');
      for (const name of parts) {
        const res = await drive.files.list({
          spaces: 'appDataFolder',
          q: `name='${name}' and '${parentId}' in parents and trashed=false`,
          fields: 'files(id)',
        });
        if (res.data.files.length === 0) return [];
        parentId = res.data.files[0].id;
      }
    }
    const res = await drive.files.list({
      spaces: 'appDataFolder',
      q: `'${parentId}' in parents and trashed=false`,
      fields: 'files(name)',
    });
    return res.data.files.map(f => f.name);
  } catch (err) {
    logger.error('[Drive] List files failed:', folder, err.message);
    throw err;
  }
}

module.exports = { readFile, writeFile, deleteFile, listFiles, ensureAppFolder };
