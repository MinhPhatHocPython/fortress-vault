const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function deriveKey(masterKey) {
  if (!masterKey) throw new Error('Encryption key not provided');
  const key = crypto.scryptSync(masterKey, 'fortress-vault-drive-v1', KEY_LENGTH);
  return key;
}

function encrypt(data, masterKey) {
  const key = deriveKey(masterKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(typeof data === 'string' ? data : JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return JSON.stringify({ iv: iv.toString('base64'), authTag, ciphertext: encrypted });
}

function decrypt(encryptedStr, masterKey) {
  const key = deriveKey(masterKey);
  const { iv, authTag, ciphertext } = JSON.parse(encryptedStr);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  try { return JSON.parse(decrypted); } catch { return decrypted; }
}

function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = { encrypt, decrypt, hashString };
