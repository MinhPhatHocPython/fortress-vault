import * as crypto from 'crypto'
import { PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, SALT_BYTES, IV_BYTES, AES_ALGORITHM, TOKEN_ENCRYPTION_SEED } from '../shared/constants'
import { IPasswordOptions } from '../shared/types'

let masterKey: Buffer | null = null

export function setMasterKey(key: Buffer): void {
  masterKey = key
}

export function getMasterKey(): Buffer | null {
  return masterKey
}

export function clearMasterKey(): void {
  masterKey = null
}

export function generateSalt(): string {
  return crypto.randomBytes(SALT_BYTES).toString('base64')
}

export function hashPassword(password: string, saltBase64: string): string {
  const salt = Buffer.from(saltBase64, 'base64')
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, 'sha512').toString('base64')
}

export function generateKey(password: string, saltBase64: string): Buffer {
  const salt = Buffer.from(saltBase64, 'base64')
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, 'sha512')
}

export function encrypt(plaintext: string, keyBase64?: string): string {
  const key = keyBase64 ? Buffer.from(keyBase64, 'base64') : masterKey
  if (!key) throw new Error('Master key not set')

  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return JSON.stringify({
    iv: iv.toString('base64'),
    authTag: authTag,
    ciphertext: encrypted,
  })
}

export function decrypt(encryptedData: string, keyBase64?: string): string {
  const key = keyBase64 ? Buffer.from(keyBase64, 'base64') : masterKey
  if (!key) throw new Error('Master key not set')

  const { iv, authTag, ciphertext } = JSON.parse(encryptedData)
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number'
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) return 'Password must include at least one special character'
  return null
}

export function changeMasterPassword(
  oldPassword: string,
  newPassword: string,
  oldSaltBase64: string,
  oldHashBase64: string,
  accounts: { id: number; username: string; password: string; url: string | null; note: string | null }[]
): {
  newSalt: string
  newHash: string
  newKeyBase64: string
  reEncrypted: { id: number; username: string; password: string; url: string | null; note: string | null }[]
} {
  // Verify old password
  const oldKey = generateKey(oldPassword, oldSaltBase64)
  const computedHash = hashPassword(oldPassword, oldSaltBase64)
  if (computedHash !== oldHashBase64) {
    throw new Error('Current password is incorrect')
  }

  // Generate new salt and key
  const newSalt = generateSalt()
  const newKey = generateKey(newPassword, newSalt)
  const newHash = hashPassword(newPassword, newSalt)

  // Re-encrypt all accounts with new key
  const newKeyBase64 = newKey.toString('base64')
  const reEncrypted = accounts.map(acc => {
    let decrypted: { username: string; password: string; url: string; note: string } = {
      username: '',
      password: '',
      url: '',
      note: '',
    }
    try { decrypted.username = decrypt(acc.username) } catch { decrypted.username = acc.username }
    try { decrypted.password = decrypt(acc.password) } catch { decrypted.password = acc.password }
    try { if (acc.url) decrypted.url = decrypt(acc.url) } catch { decrypted.url = acc.url || '' }
    try { if (acc.note) decrypted.note = decrypt(acc.note) } catch { decrypted.note = acc.note || '' }

    return {
      id: acc.id,
      username: encrypt(decrypted.username, newKeyBase64),
      password: encrypt(decrypted.password, newKeyBase64),
      url: decrypted.url ? encrypt(decrypted.url, newKeyBase64) : null,
      note: decrypted.note ? encrypt(decrypted.note, newKeyBase64) : null,
    }
  })

  // Set new master key in memory
  setMasterKey(newKey)

  return { newSalt, newHash, newKeyBase64, reEncrypted }
}

function getDeviceKey(): Buffer {
  return crypto.createHash('sha256').update(TOKEN_ENCRYPTION_SEED).digest()
}

export function encryptWithDeviceKey(plaintext: string): string {
  const key = getDeviceKey()
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return JSON.stringify({ iv: iv.toString('base64'), authTag, ciphertext: encrypted })
}

export function decryptWithDeviceKey(encryptedData: string): string {
  const key = getDeviceKey()
  const { iv, authTag, ciphertext } = JSON.parse(encryptedData)
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function generatePassword(options: IPasswordOptions): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'

  let chars = ''
  if (options.uppercase) chars += uppercase
  if (options.lowercase) chars += lowercase
  if (options.numbers) chars += numbers
  if (options.symbols) chars += symbols

  if (!chars) chars = lowercase + numbers

  const charsArray = crypto.randomBytes(options.length)
  let password = ''
  for (let i = 0; i < options.length; i++) {
    password += chars[charsArray[i] % chars.length]
  }

  return password
}
