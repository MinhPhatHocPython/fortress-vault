import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { IAccount } from '../../shared/types'

interface VaultContextType {
  accounts: IAccount[]
  selectedAccount: IAccount | null
  searchQuery: string
  loading: boolean
  setSearchQuery: (query: string) => void
  selectAccount: (account: IAccount | null) => void
  fetchAccounts: () => Promise<void>
  addAccount: (account: IAccount) => Promise<void>
  updateAccount: (id: number, account: IAccount) => Promise<void>
  deleteAccount: (id: number) => Promise<void>
  toggleFavorite: (id: number, current: number) => Promise<void>
}

const VaultContext = createContext<VaultContextType | undefined>(undefined)

export function VaultProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<IAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<IAccount | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.db.getAllAccounts()
      setAccounts(result)
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const addAccount = async (account: IAccount) => {
    await window.electronAPI.db.addAccount(account)
    await fetchAccounts()
  }

  const updateAccount = async (id: number, account: IAccount) => {
    await window.electronAPI.db.updateAccount(id, account)
    await fetchAccounts()
  }

  const deleteAccount = async (id: number) => {
    await window.electronAPI.db.deleteAccount(id)
    setSelectedAccount(prev => prev?.id === id ? null : prev)
    await fetchAccounts()
  }

  const selectAccount = (account: IAccount | null) => {
    setSelectedAccount(account)
  }

  const toggleFavorite = async (id: number, current: number) => {
    const newValue = current === 1 ? 0 : 1
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, favorite: newValue } : a))
    setSelectedAccount(prev => prev?.id === id ? { ...prev, favorite: newValue } : prev)
  }

  return (
    <VaultContext.Provider value={{
      accounts,
      selectedAccount,
      searchQuery,
      loading,
      setSearchQuery,
      selectAccount,
      fetchAccounts,
      addAccount,
      updateAccount,
      deleteAccount,
      toggleFavorite,
    }}>
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) throw new Error('useVault must be used within VaultProvider')
  return context
}
