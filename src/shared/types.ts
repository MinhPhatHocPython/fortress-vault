export interface IAccount {
  id?: number
  title: string
  username: string
  password: string
  url: string
  note: string
  favorite: number
  createdAt: string
  updatedAt: string
}

export interface IEncryptedField {
  iv: string
  authTag: string
  ciphertext: string
}

export interface ISettings {
  salt: string
  hash: string
  masterKeyHint: string
  vaultPath: string
}

export interface IPasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
}

export type ViewMode = 'card' | 'table'

export interface IDbAccount {
  id: number
  title: string
  username: string
  password: string
  url: string | null
  note: string | null
  favorite: number
  createdAt: string
  updatedAt: string
}

export interface ElectronAPI {
  db: {
    getSettings: () => Promise<{ salt: string; hash: string; masterKeyHint: string } | null>
    saveSettings: (settings: { key: string; value: string }) => Promise<void>
    getAllAccounts: () => Promise<IAccount[]>
    addAccount: (account: IAccount) => Promise<number>
    updateAccount: (id: number, account: IAccount) => Promise<void>
    deleteAccount: (id: number) => Promise<void>
    updateFavorite: (id: number, favorite: number) => Promise<void>
    getVaultPath: () => Promise<string>
    isSetupComplete: () => Promise<boolean>
    changeMasterPassword: (oldPassword: string, newPassword: string, newHint: string) => Promise<{ success: boolean }>
    saveRememberToken: (encryptedToken: string, expiry: string) => Promise<void>
    getRememberToken: () => Promise<{ remember_token: string; remember_token_expiry: string } | null>
    deleteRememberToken: () => Promise<void>
  }
  crypto: {
    encrypt: (plaintext: string, masterKeyBase64: string) => Promise<string>
    decrypt: (ciphertextBase64: string, masterKeyBase64: string) => Promise<string>
    generatePassword: (options: IPasswordOptions) => Promise<string>
    hashPassword: (password: string, saltBase64: string) => Promise<string>
    generateSalt: () => Promise<string>
    generateKey: (password: string, saltBase64: string) => Promise<string>
    encryptWithDeviceKey: (plaintext: string) => Promise<string>
    decryptWithDeviceKey: (encryptedData: string) => Promise<string>
    setMasterKeyFromBase64: (keyBase64: string) => Promise<void>
  }
  system: {
    copyToClipboard: (text: string) => Promise<void>
    clearClipboard: () => Promise<void>
    chooseDirectory: () => Promise<string | null>
    getPlatform: () => Promise<string>
  }
  app: {
    backupDatabase: () => Promise<void>
    lock: () => Promise<void>
    quit: () => Promise<void>
    checkForUpdate: () => void
    downloadUpdate: () => void
    installUpdate: () => void
    onUpdateAvailable: (callback: (info: { version: string; releaseDate: string }) => void) => void
    onUpdateNotAvailable: (callback: () => void) => void
    onUpdateDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number }) => void) => void
    onUpdateDownloaded: (callback: () => void) => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
