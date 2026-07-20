import { ipcMain, clipboard, dialog, app } from 'electron'
import { getDb, backupDatabase, persistDb, getVaultPath, setVaultPath } from './database'
import * as crypto from './crypto'
import { IAccount } from '../shared/types'
import type { BindParams } from 'sql.js'

function allRows(sql: string, params?: BindParams): Record<string, unknown>[] {
  const db = getDb()
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function firstRow(sql: string, params?: BindParams): Record<string, unknown> | null {
  const rows = allRows(sql, params)
  return rows.length > 0 ? rows[0] : null
}

function runSql(sql: string, params?: BindParams): void {
  const db = getDb()
  db.run(sql, params)
  persistDb()
}

export function registerIpcHandlers(): void {
  // Database handlers
  ipcMain.handle('db:getSettings', async () => {
    const rows = allRows('SELECT key, value FROM settings WHERE key IN ($key1, $key2, $key3)', {
      $key1: 'salt',
      $key2: 'hash',
      $key3: 'masterKeyHint',
    })
    if (rows.length === 0) return null
    const result: Record<string, string> = {}
    rows.forEach(r => { result[r.key as string] = r.value as string })
    return result
  })

  ipcMain.handle('db:saveSettings', async (_event, { key, value }: { key: string; value: string }) => {
    runSql('INSERT OR REPLACE INTO settings (key, value) VALUES ($key, $value)', { $key: key, $value: value })
  })

  ipcMain.handle('db:isSetupComplete', async () => {
    const row = firstRow('SELECT COUNT(*) as count FROM settings WHERE key = $key', { $key: 'hash' })
    return row ? Number(row.count) > 0 : false
  })

  ipcMain.handle('db:getAllAccounts', async () => {
    const rows = allRows('SELECT * FROM accounts ORDER BY updatedAt DESC')
    return rows.map(row => {
      const decrypted: Record<string, unknown> = { ...row }
      try { decrypted.username = crypto.decrypt(row.username as string) } catch { }
      try { decrypted.password = crypto.decrypt(row.password as string) } catch { }
      try { if (row.url) decrypted.url = crypto.decrypt(row.url as string) } catch { }
      try { if (row.note) decrypted.note = crypto.decrypt(row.note as string) } catch { }
      return decrypted as unknown as IAccount
    })
  })

  ipcMain.handle('db:addAccount', async (_event, account: IAccount) => {
    const existing = firstRow('SELECT id FROM accounts WHERE title = $title', {
      $title: account.title,
    })
    if (existing) {
      throw new Error('An account with this title already exists!')
    }
    const now = new Date().toISOString()
    runSql(
      'INSERT INTO accounts (title, username, password, url, note, favorite, createdAt, updatedAt) VALUES ($title, $username, $password, $url, $note, $favorite, $createdAt, $updatedAt)',
      {
        $title: account.title,
        $username: crypto.encrypt(account.username),
        $password: crypto.encrypt(account.password),
        $url: account.url ? crypto.encrypt(account.url) : null,
        $note: account.note ? crypto.encrypt(account.note) : null,
        $favorite: account.favorite || 0,
        $createdAt: now,
        $updatedAt: now,
      }
    )
    backupDatabase()
    const row = firstRow('SELECT last_insert_rowid() as id')
    return row ? Number(row.id) : 0
  })

  ipcMain.handle('db:updateAccount', async (_event, id: number, account: IAccount) => {
    const existing = firstRow('SELECT id FROM accounts WHERE title = $title AND id != $id', {
      $title: account.title,
      $id: id,
    })
    if (existing) {
      throw new Error('An account with this title already exists!')
    }
    const now = new Date().toISOString()
    runSql(
      'UPDATE accounts SET title = $title, username = $username, password = $password, url = $url, note = $note, favorite = $favorite, updatedAt = $updatedAt WHERE id = $id',
      {
        $title: account.title,
        $username: crypto.encrypt(account.username),
        $password: crypto.encrypt(account.password),
        $url: account.url ? crypto.encrypt(account.url) : null,
        $note: account.note ? crypto.encrypt(account.note) : null,
        $favorite: account.favorite || 0,
        $updatedAt: now,
        $id: id,
      }
    )
    backupDatabase()
  })

  ipcMain.handle('db:deleteAccount', async (_event, id: number) => {
    runSql('DELETE FROM accounts WHERE id = $id', { $id: id })
    backupDatabase()
  })

  ipcMain.handle('db:updateFavorite', async (_event, id: number, favorite: number) => {
    if (!id) throw new Error('Invalid account id')
    runSql('UPDATE accounts SET favorite = $favorite, updatedAt = $updatedAt WHERE id = $id', {
      $favorite: favorite,
      $updatedAt: new Date().toISOString(),
      $id: id,
    })
    const row = firstRow('SELECT favorite FROM accounts WHERE id = $id', { $id: id })
    if (!row) throw new Error('Account not found')
    return { success: true, favorite: Number(row.favorite) }
  })

  ipcMain.handle('db:getVaultPath', async () => {
    return getVaultPath()
  })

  ipcMain.handle('db:setVaultPath', async (_event, vaultPath: string) => {
    setVaultPath(vaultPath)
  })

  ipcMain.handle('db:changeMasterPassword', async (_event, oldPassword: string, newPassword: string, newHint: string) => {
    const settings = allRows('SELECT key, value FROM settings WHERE key IN ($k1, $k2)', {
      $k1: 'salt',
      $k2: 'hash',
    })
    if (settings.length < 2) throw new Error('Authentication data not found')

    const getVal = (key: string) => { const r = settings.find(s => s.key === key); return r ? r.value as string : '' }
    const oldSalt = getVal('salt')
    const oldHash = getVal('hash')
    if (!oldSalt || !oldHash) throw new Error('Authentication data not found')

    const accounts = allRows('SELECT id, username, password, url, note FROM accounts')
    const result = crypto.changeMasterPassword(oldPassword, newPassword, oldSalt, oldHash, accounts as any[])

    // Save new salt and hash
    runSql('INSERT OR REPLACE INTO settings (key, value) VALUES ($k, $v)', { $k: 'salt', $v: result.newSalt })
    runSql('INSERT OR REPLACE INTO settings (key, value) VALUES ($k, $v)', { $k: 'hash', $v: result.newHash })
    runSql('INSERT OR REPLACE INTO settings (key, value) VALUES ($k, $v)', { $k: 'masterKeyHint', $v: newHint || '' })

    // Save re-encrypted accounts
    for (const acc of result.reEncrypted) {
      runSql('UPDATE accounts SET username = $u, password = $p, url = $url, note = $n WHERE id = $id', {
        $u: acc.username,
        $p: acc.password,
        $url: acc.url,
        $n: acc.note,
        $id: acc.id,
      })
    }

    backupDatabase()
    return { success: true }
  })

  ipcMain.handle('db:saveRememberToken', async (_event, encryptedToken: string, expiry: string) => {
    runSql('INSERT OR REPLACE INTO settings (key, value) VALUES ($k1, $v1)', { $k1: 'remember_token', $v1: encryptedToken })
    runSql('INSERT OR REPLACE INTO settings (key, value) VALUES ($k2, $v2)', { $k2: 'remember_token_expiry', $v2: expiry })
  })

  ipcMain.handle('db:getRememberToken', async () => {
    const rows = allRows('SELECT key, value FROM settings WHERE key IN ($k1, $k2)', {
      $k1: 'remember_token',
      $k2: 'remember_token_expiry',
    })
    if (rows.length === 0) return null
    const result: Record<string, string> = {}
    rows.forEach(r => { result[r.key as string] = r.value as string })
    return result
  })

  ipcMain.handle('db:deleteRememberToken', async () => {
    runSql('DELETE FROM settings WHERE key IN ($k1, $k2)', { $k1: 'remember_token', $k2: 'remember_token_expiry' })
  })

  // Crypto handlers
  ipcMain.handle('crypto:encrypt', async (_event, plaintext: string, keyBase64: string) => {
    return crypto.encrypt(plaintext, keyBase64)
  })

  ipcMain.handle('crypto:decrypt', async (_event, ciphertextBase64: string, keyBase64: string) => {
    return crypto.decrypt(ciphertextBase64, keyBase64)
  })

  ipcMain.handle('crypto:generatePassword', async (_event, options) => {
    return crypto.generatePassword(options)
  })

  ipcMain.handle('crypto:hashPassword', async (_event, password: string, saltBase64: string) => {
    return crypto.hashPassword(password, saltBase64)
  })

  ipcMain.handle('crypto:generateSalt', async () => {
    return crypto.generateSalt()
  })

  ipcMain.handle('crypto:encryptWithDeviceKey', async (_event, plaintext: string) => {
    return crypto.encryptWithDeviceKey(plaintext)
  })

  ipcMain.handle('crypto:decryptWithDeviceKey', async (_event, encryptedData: string) => {
    return crypto.decryptWithDeviceKey(encryptedData)
  })

  ipcMain.handle('crypto:setMasterKeyFromBase64', async (_event, keyBase64: string) => {
    crypto.setMasterKey(Buffer.from(keyBase64, 'base64'))
  })

  ipcMain.handle('crypto:generateKey', async (_event, password: string, saltBase64: string) => {
    const key = crypto.generateKey(password, saltBase64)
    crypto.setMasterKey(key)
    return key.toString('base64')
  })

  // System handlers
  ipcMain.handle('system:copyToClipboard', async (_event, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('system:clearClipboard', async () => {
    clipboard.writeText('')
  })

  ipcMain.handle('system:chooseDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('system:getPlatform', async () => {
    return process.platform
  })

  // App handlers
  ipcMain.handle('app:backupDatabase', async () => {
    backupDatabase()
  })

  ipcMain.handle('app:lock', async () => {
    crypto.clearMasterKey()
  })

  ipcMain.handle('app:quit', async () => {
    app.quit()
  })
}
