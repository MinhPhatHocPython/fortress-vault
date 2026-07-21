import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Original DB methods
  db: {
    getSettings: () => ipcRenderer.invoke('db:getSettings'),
    saveSettings: (settings: { key: string; value: string }) => ipcRenderer.invoke('db:saveSettings', settings),
    getAllAccounts: () => ipcRenderer.invoke('db:getAllAccounts'),
    addAccount: (account: any) => ipcRenderer.invoke('db:addAccount', account),
    updateAccount: (id: number, account: any) => ipcRenderer.invoke('db:updateAccount', id, account),
    deleteAccount: (id: number) => ipcRenderer.invoke('db:deleteAccount', id),
    updateFavorite: (id: number, favorite: number) => ipcRenderer.invoke('db:updateFavorite', id, favorite),
    getVaultPath: () => ipcRenderer.invoke('db:getVaultPath'),
    isSetupComplete: () => ipcRenderer.invoke('db:isSetupComplete'),
    changeMasterPassword: (oldPassword: string, newPassword: string, newHint: string) => ipcRenderer.invoke('db:changeMasterPassword', oldPassword, newPassword, newHint),
    saveRememberToken: (encryptedToken: string, expiry: string) => ipcRenderer.invoke('db:saveRememberToken', encryptedToken, expiry),
    getRememberToken: () => ipcRenderer.invoke('db:getRememberToken'),
    deleteRememberToken: () => ipcRenderer.invoke('db:deleteRememberToken'),
  },
  crypto: {
    encrypt: (plaintext: string, keyBase64: string) => ipcRenderer.invoke('crypto:encrypt', plaintext, keyBase64),
    decrypt: (ciphertextBase64: string, keyBase64: string) => ipcRenderer.invoke('crypto:decrypt', ciphertextBase64, keyBase64),
    generatePassword: (options: any) => ipcRenderer.invoke('crypto:generatePassword', options),
    hashPassword: (password: string, saltBase64: string) => ipcRenderer.invoke('crypto:hashPassword', password, saltBase64),
    generateSalt: () => ipcRenderer.invoke('crypto:generateSalt'),
    generateKey: (password: string, saltBase64: string) => ipcRenderer.invoke('crypto:generateKey', password, saltBase64),
    encryptWithDeviceKey: (plaintext: string) => ipcRenderer.invoke('crypto:encryptWithDeviceKey', plaintext),
    decryptWithDeviceKey: (encryptedData: string) => ipcRenderer.invoke('crypto:decryptWithDeviceKey', encryptedData),
    setMasterKeyFromBase64: (keyBase64: string) => ipcRenderer.invoke('crypto:setMasterKeyFromBase64', keyBase64),
  },
  system: {
    copyToClipboard: (text: string) => ipcRenderer.invoke('system:copyToClipboard', text),
    clearClipboard: () => ipcRenderer.invoke('system:clearClipboard'),
    chooseDirectory: () => ipcRenderer.invoke('system:chooseDirectory'),
    getPlatform: () => ipcRenderer.invoke('system:getPlatform'),
  },
  app: {
    backupDatabase: () => ipcRenderer.invoke('app:backupDatabase'),
    lock: () => ipcRenderer.invoke('app:lock'),
    quit: () => ipcRenderer.invoke('app:quit'),
    checkForUpdate: () => ipcRenderer.send('app:check-for-update'),
    downloadUpdate: () => ipcRenderer.send('app:download-update'),
    installUpdate: () => ipcRenderer.send('app:install-update'),
    onUpdateAvailable: (callback: (info: { version: string; releaseDate: string }) => void) => {
      ipcRenderer.on('update-available', (_event, info) => callback(info))
    },
    onUpdateNotAvailable: (callback: () => void) => {
      ipcRenderer.on('update-not-available', () => callback())
    },
    onUpdateDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number }) => void) => {
      ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress))
    },
    onUpdateDownloaded: (callback: () => void) => {
      ipcRenderer.on('update-downloaded', () => callback())
    },
    onUpdateError: (callback: (message: string) => void) => {
      ipcRenderer.on('update-error', (_event, message) => callback(message))
    },
  },
})
