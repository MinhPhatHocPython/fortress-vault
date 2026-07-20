import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { REMEMBER_DEVICE_DAYS } from '../../shared/constants'

interface AuthContextType {
  isAuthenticated: boolean
  isSetupComplete: boolean | null
  masterKey: string | null
  login: (password: string, remember?: boolean) => Promise<boolean>
  setup: (password: string, hint: string) => Promise<boolean>
  logout: () => Promise<void>
  checkSetup: () => Promise<void>
  tryAutoLogin: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  const [masterKey, setMasterKey] = useState<string | null>(null)

  const checkSetup = useCallback(async () => {
    try {
      const done = await window.electronAPI.db.isSetupComplete()
      setIsSetupComplete(done)
    } catch {
      setIsSetupComplete(false)
    }
  }, [])

  useEffect(() => {
    checkSetup()
  }, [checkSetup])

  const login = async (password: string, remember = false): Promise<boolean> => {
    try {
      const settings = await window.electronAPI.db.getSettings()
      if (!settings) {
        console.error('Login failed: no settings found')
        return false
      }
      if (!settings.salt || !settings.hash) {
        console.error('Login failed: missing salt or hash in settings', settings)
        return false
      }

      const key = await window.electronAPI.crypto.generateKey(password, settings.salt)
      const storedHash = await window.electronAPI.crypto.hashPassword(password, settings.salt)

      const storedHashTrimmed = storedHash.trim()
      const settingsHashTrimmed = settings.hash.trim()

      if (storedHashTrimmed === settingsHashTrimmed) {
        setMasterKey(key)
        setIsAuthenticated(true)

        if (remember) {
          try {
            const expiry = new Date(Date.now() + REMEMBER_DEVICE_DAYS * 24 * 60 * 60 * 1000).toISOString()
            const encrypted = await window.electronAPI.crypto.encryptWithDeviceKey(key)
            await window.electronAPI.db.saveRememberToken(encrypted, expiry)
          } catch (err) {
            console.error('Failed to save remember token:', err)
          }
        }

        return true
      }

      console.warn('Login failed: hash mismatch', {
        storedHashLength: storedHash.length,
        settingsHashLength: settings.hash.length,
        storedHashPrefix: storedHash.substring(0, 10),
        settingsHashPrefix: settings.hash.substring(0, 10),
      })
      return false
    } catch (err) {
      console.error('Login error:', err)
      return false
    }
  }

  const tryAutoLogin = async (): Promise<boolean> => {
    try {
      const token = await window.electronAPI.db.getRememberToken()
      if (!token) return false

      const { remember_token: encryptedToken, remember_token_expiry: expiry } = token
      if (!encryptedToken || !expiry) return false

      if (new Date(expiry) < new Date()) {
        await window.electronAPI.db.deleteRememberToken()
        return false
      }

      const keyBase64 = await window.electronAPI.crypto.decryptWithDeviceKey(encryptedToken)
      await window.electronAPI.crypto.setMasterKeyFromBase64(keyBase64)
      setMasterKey(keyBase64)
      setIsAuthenticated(true)
      return true
    } catch {
      try { await window.electronAPI.db.deleteRememberToken() } catch { }
      return false
    }
  }

  const setup = async (password: string, hint: string): Promise<boolean> => {
    try {
      const salt = await window.electronAPI.crypto.generateSalt()
      const hash = await window.electronAPI.crypto.hashPassword(password, salt)
      const key = await window.electronAPI.crypto.generateKey(password, salt)

      await window.electronAPI.db.saveSettings({ key: 'salt', value: salt })
      await window.electronAPI.db.saveSettings({ key: 'hash', value: hash })
      await window.electronAPI.db.saveSettings({ key: 'masterKeyHint', value: hint })

      setMasterKey(key)
      setIsAuthenticated(true)
      setIsSetupComplete(true)
      return true
    } catch {
      return false
    }
  }

  const logout = async () => {
    await window.electronAPI.app.lock()
    try { await window.electronAPI.db.deleteRememberToken() } catch { }
    setMasterKey(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isSetupComplete, masterKey, login, setup, logout, checkSetup, tryAutoLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
