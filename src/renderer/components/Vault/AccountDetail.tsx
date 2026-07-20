import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IAccount } from '../../../shared/types'
import { useVault } from '../../contexts/VaultContext'
import { useClipboard } from '../../hooks/useClipboard'
import { toast } from '../UI/Toast'

interface AccountDetailProps {
  onEdit: (account: IAccount) => void
}

export function AccountDetail({ onEdit }: AccountDetailProps) {
  const { selectedAccount, deleteAccount } = useVault()
  const { copiedField, copyToClipboard } = useClipboard()
  const [showPassword, setShowPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copyTooltip, setCopyTooltip] = useState<string | null>(null)

  if (!selectedAccount) {
    return (
      <div className="w-80 h-full border-l border-gray-200 dark:border-border bg-white dark:bg-background-secondary flex items-center justify-center p-6">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-text-secondary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-text-secondary text-sm">Select an account to view details</p>
        </div>
      </div>
    )
  }

  const account = selectedAccount
  const initials = account.title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const handleCopy = (text: string, field: string) => {
    copyToClipboard(text, field)
    setCopyTooltip(field)
    setTimeout(() => setCopyTooltip(null), 1500)
  }

  const handleDelete = async () => {
    if (!account.id) return
    await deleteAccount(account.id)
    toast('Account deleted', 'success')
    setShowDeleteConfirm(false)
  }

  const handleOpenUrl = (url: string) => {
    if (url && !url.startsWith('http')) {
      window.open('https://' + url, '_blank')
    } else if (url) {
      window.open(url, '_blank')
    }
  }

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-80 h-full border-l border-gray-200 dark:border-border bg-white dark:bg-background-secondary overflow-y-auto"
    >
      <div className="p-5">
        <div className="flex flex-col items-center mb-6 pt-4">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-xl font-bold text-primary-light mb-3">
            {initials}
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary text-center">{account.title}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Username</label>
            <div className="flex items-center justify-between mt-1 p-3 bg-gray-50 dark:bg-background-tertiary rounded-lg">
              <span className="text-sm text-gray-900 dark:text-text-primary truncate mr-2">{account.username}</span>
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => handleCopy(account.username, 'username')}
                  className="text-primary-light hover:text-primary"
                >
                  {copiedField === 'username' ? (
                    <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
                <AnimatePresence>
                  {copyTooltip === 'username' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -top-9 right-0 bg-gray-900 dark:bg-background text-white dark:text-text-primary text-xs px-2 py-1 rounded-md whitespace-nowrap flex items-center gap-1 shadow-lg"
                    >
                      <svg className="w-3 h-3 text-accent-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Password</label>
            <div className="flex items-center justify-between mt-1 p-3 bg-gray-50 dark:bg-background-tertiary rounded-lg">
              <span className="text-sm text-gray-900 dark:text-text-primary font-mono truncate mr-2">
                {showPassword ? account.password : '••••••••••••'}
              </span>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-text-secondary hover:text-gray-700 dark:hover:text-text-primary p-1"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
                <div className="relative">
                  <button
                    onClick={() => handleCopy(account.password, 'password')}
                    className="text-primary-light hover:text-primary"
                  >
                    {copiedField === 'password' ? (
                      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                  <AnimatePresence>
                    {copyTooltip === 'password' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute -top-9 right-0 bg-gray-900 dark:bg-background text-white dark:text-text-primary text-xs px-2 py-1 rounded-md whitespace-nowrap flex items-center gap-1 shadow-lg"
                      >
                        <svg className="w-3 h-3 text-accent-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {account.url && (
            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">URL</label>
              <div className="flex items-center justify-between mt-1 p-3 bg-gray-50 dark:bg-background-tertiary rounded-lg">
                <span
                  onClick={() => handleOpenUrl(account.url)}
                  className="text-sm text-primary-light hover:text-primary cursor-pointer truncate mr-2"
                >
                  {account.url}
                </span>
                <button
                  onClick={() => handleOpenUrl(account.url)}
                  className="text-primary-light hover:text-primary flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {account.note && (
            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Note</label>
              <div className="mt-1 p-3 bg-gray-50 dark:bg-background-tertiary rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">{account.note}</p>
              </div>
            </div>
          )}

          <div className="text-xs text-text-secondary space-y-1 pt-2">
            <p>Created: {new Date(account.createdAt).toLocaleDateString()}</p>
            <p>Updated: {new Date(account.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onEdit(account)}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white dark:bg-background-secondary border border-gray-200 dark:border-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Delete Account?</h3>
              <p className="text-sm text-text-secondary mb-4">
                Are you sure you want to delete "{account.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-danger flex-1"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
