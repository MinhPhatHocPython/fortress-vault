import { useState, useEffect, useCallback } from 'react'

interface Wallet {
  id: string; currency: string; address: string; label: string
  balance?: string; createdAt?: string; updatedAt?: string
}

interface Transaction {
  id: string; walletId: string; type: string; amount: string; currency: string
  txHash?: string; status?: string; createdAt?: string
}

interface Favorite {
  id: string; address: string; label?: string; currency?: string; createdAt?: string
}

interface SyncStatus {
  lastSync: string | null; pendingWrites: number; networkAvailable: boolean; syncInProgress: boolean
}

export function useDriveData() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [w, t, f, s, p] = await Promise.all([
        window.electronAPI.googleDrive.getWallets(),
        window.electronAPI.googleDrive.getTransactions(),
        window.electronAPI.googleDrive.getFavorites(),
        window.electronAPI.googleDrive.getSettings(),
        window.electronAPI.googleDrive.getProfile(),
      ])
      if (w.success) setWallets(w.data || [])
      if (t.success) setTransactions(t.data || [])
      if (f.success) setFavorites(f.data || [])
      if (s.success) setSettings(s.data || {})
      if (p.success) setProfile(p.data || null)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshSyncStatus = useCallback(async () => {
    try {
      const status = await window.electronAPI.googleDrive.getSyncStatus()
      setSyncStatus(status)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadAll(); refreshSyncStatus() }, [loadAll, refreshSyncStatus])

  // Wallet operations
  const addWallet = async (wallet: Omit<Wallet, 'id' | 'createdAt'>) => {
    const result = await window.electronAPI.googleDrive.addWallet(wallet)
    if (result.success) { setWallets(prev => [...prev, result.data]); return result.data }
    throw new Error(result.message)
  }

  const updateWallet = async (id: string, updates: Partial<Wallet>) => {
    const result = await window.electronAPI.googleDrive.updateWallet(id, updates)
    if (result.success) {
      setWallets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
      return result.data
    }
    throw new Error(result.message)
  }

  const deleteWallet = async (id: string) => {
    const result = await window.electronAPI.googleDrive.deleteWallet(id)
    if (result.success) setWallets(prev => prev.filter(w => w.id !== id))
    else throw new Error(result.message)
  }

  // Transaction operations
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const result = await window.electronAPI.googleDrive.addTransaction(tx)
    if (result.success) { setTransactions(prev => [result.data, ...prev]); return result.data }
    throw new Error(result.message)
  }

  // Favorite operations
  const addFavorite = async (fav: Omit<Favorite, 'id' | 'createdAt'>) => {
    const result = await window.electronAPI.googleDrive.addFavorite(fav)
    if (result.success) { setFavorites(prev => [...prev, result.data]); return result.data }
    throw new Error(result.message)
  }

  const removeFavorite = async (id: string) => {
    const result = await window.electronAPI.googleDrive.removeFavorite(id)
    if (result.success) setFavorites(prev => prev.filter(f => f.id !== id))
    else throw new Error(result.message)
  }

  // Settings
  const updateSettings = async (newSettings: Record<string, unknown>) => {
    const merged = { ...settings, ...newSettings }
    const result = await window.electronAPI.googleDrive.saveSettings(merged)
    if (result.success) setSettings(merged)
    else throw new Error(result.message)
  }

  // Sync
  const triggerSync = async () => {
    await window.electronAPI.googleDrive.syncAll()
    await loadAll()
    await refreshSyncStatus()
  }

  return {
    wallets, transactions, favorites, settings, profile,
    loading, error, syncStatus,
    addWallet, updateWallet, deleteWallet,
    addTransaction,
    addFavorite, removeFavorite,
    updateSettings,
    loadAll, triggerSync, refreshSyncStatus,
  }
}
