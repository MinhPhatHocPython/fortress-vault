import React, { useState, useEffect } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { VaultProvider, useVault } from './contexts/VaultContext'
import { ToastProvider, useToast, setLegacyToastFn } from './components/UI/Toast'
import { SetupScreen } from './components/Auth/SetupScreen'
import { LoginScreen } from './components/Auth/LoginScreen'
import { Sidebar } from './components/Layout/Sidebar'
import { Header } from './components/Layout/Header'
import { AccountList } from './components/Vault/AccountList'
import { AccountDetail } from './components/Vault/AccountDetail'
import { AccountForm } from './components/Vault/AccountForm'
import { ChangePasswordModal } from './components/Vault/ChangePasswordModal'
import { useAutoLock } from './hooks/useAutoLock'
import { IAccount } from '../shared/types'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSetupComplete, checkSetup, tryAutoLogin } = useAuth()
  const [autoLoginTried, setAutoLoginTried] = useState(false)

  useEffect(() => {
    checkSetup()
  }, [checkSetup])

  useEffect(() => {
    if (isSetupComplete === true && !isAuthenticated && !autoLoginTried) {
      setAutoLoginTried(true)
      tryAutoLogin()
    }
  }, [isSetupComplete, isAuthenticated, autoLoginTried, tryAutoLogin])

  if (isSetupComplete === null) {
    return (
      <div className="min-h-screen bg-white dark:bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-secondary">
          <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm">Initializing...</span>
        </div>
      </div>
    )
  }

  if (!isSetupComplete) {
    return <SetupScreen />
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return <>{children}</>
}

function Dashboard() {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [showForm, setShowForm] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [editingAccount, setEditingAccount] = useState<IAccount | null>(null)
  const { fetchAccounts, selectedAccount, selectAccount } = useVault()

  useAutoLock()

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleAddNew = () => {
    setEditingAccount(null)
    setShowForm(true)
  }

  const handleEdit = (account: IAccount) => {
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingAccount(null)
  }

  return (
    <div className="h-screen flex bg-white dark:bg-background">
      <Sidebar onAddNew={handleAddNew} onChangePassword={() => setShowChangePassword(true)} />
      <div className="flex-1 flex flex-col">
        <Header viewMode={viewMode} onViewModeChange={setViewMode} />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col">
            <AccountList viewMode={viewMode} />
          </div>
          <AccountDetail onEdit={handleEdit} />
        </div>
      </div>
      <AccountForm isOpen={showForm} onClose={handleCloseForm} editAccount={editingAccount} />
      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VaultProvider>
          <ToastProvider>
            <AuthGate>
              <Dashboard />
            </AuthGate>
            <ToastBootstrap />
          </ToastProvider>
        </VaultProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

function ToastBootstrap() {
  const { showToast } = useToast()
  useEffect(() => {
    setLegacyToastFn(showToast)
    return () => setLegacyToastFn(null)
  }, [showToast])
  return null
}
