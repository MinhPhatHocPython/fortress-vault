import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { DB_FILENAME, BACKUP_DIR, MAX_BACKUPS } from '../shared/constants'

let db: SqlJsDatabase | null = null
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null

function getDefaultVaultPath(): string {
  return path.join(app.getPath('appData'), 'FortressVault')
}

export function getVaultPath(): string {
  const settingsPath = path.join(getDefaultVaultPath(), 'config.json')
  if (fs.existsSync(settingsPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      if (config.vaultPath && fs.existsSync(config.vaultPath)) {
        return config.vaultPath
      }
    } catch { }
  }
  return getDefaultVaultPath()
}

export function setVaultPath(vaultPath: string): void {
  const settingsPath = path.join(getDefaultVaultPath(), 'config.json')
  const dir = path.dirname(settingsPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(settingsPath, JSON.stringify({ vaultPath }, null, 2))
}

function getDbPath(vaultPath: string): string {
  return path.join(vaultPath, DB_FILENAME)
}

function saveDb(): void {
  if (!db) return
  const vp = getVaultPath()
  if (!fs.existsSync(vp)) {
    fs.mkdirSync(vp, { recursive: true })
  }
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(getDbPath(vp), buffer)
}

export async function initDatabase(vaultPath?: string): Promise<void> {
  if (!SQL) {
    SQL = await initSqlJs()
  }

  const vp = vaultPath || getVaultPath()
  if (!fs.existsSync(vp)) {
    fs.mkdirSync(vp, { recursive: true })
  }

  const dbPath = getDbPath(vp)
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      url TEXT,
      note TEXT,
      favorite INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT (datetime('now')),
      updatedAt DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account_tags (
      account_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (account_id, tag_id),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `)

  saveDb()
}

export function closeDatabase(): void {
  if (db) {
    saveDb()
    db.close()
    db = null
  }
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function persistDb(): void {
  saveDb()
}

export function backupDatabase(): void {
  if (!db) return

  saveDb()

  const vp = getVaultPath()
  const backupDir = path.join(vp, BACKUP_DIR)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)
  const srcPath = getDbPath(vp)
  const backupPath = path.join(backupDir, `backup_${timestamp}.db`)

  fs.copyFileSync(srcPath, backupPath)

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
    .map(f => ({ name: f, path: path.join(backupDir, f), time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time)

  if (files.length > MAX_BACKUPS) {
    files.slice(MAX_BACKUPS).forEach(f => {
      try { fs.unlinkSync(f.path) } catch { }
    })
  }
}
