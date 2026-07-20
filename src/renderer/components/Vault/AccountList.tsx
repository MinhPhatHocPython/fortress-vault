import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { IAccount } from '../../../shared/types'
import { useVault } from '../../contexts/VaultContext'
import { AccountCard } from './AccountCard'
import { motion } from 'framer-motion'

interface AccountListProps {
  viewMode: 'card' | 'table'
}

export function AccountList({ viewMode }: AccountListProps) {
  const { accounts, searchQuery, selectedAccount, selectAccount, toggleFavorite, loading } = useVault()

  const filtered = searchQuery
    ? accounts.filter(a => {
        const term = searchQuery.toLowerCase().trim()
        if (!term) return true
        const titleMatch = a.title.toLowerCase().includes(term)
        const usernamePart = a.username.split('@')[0].toLowerCase()
        const usernameMatch = usernamePart.includes(term)
        return titleMatch || usernameMatch
      })
    : accounts

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-secondary">
          <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm">Loading vault...</span>
        </div>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 dark:text-text-secondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-text-secondary text-sm">No accounts found</p>
          {searchQuery && (
            <p className="text-text-secondary/60 text-xs mt-1">Try a different search term</p>
          )}
        </div>
      </div>
    )
  }

  if (viewMode === 'table') {
    return (
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-background">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-border text-text-secondary text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Username</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Favorite</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(account => (
                <motion.tr
                  key={account.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => selectAccount(account)}
                  className={`border-b border-gray-200 dark:border-border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-background-tertiary ${
                    selectedAccount?.id === account.id ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary-light">
                        {account.title.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-gray-900 dark:text-text-primary font-medium">{account.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{account.username}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {account.favorite === 1 && (
                      <svg className="w-4 h-4 text-accent inline" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {filtered.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              isSelected={selectedAccount?.id === account.id}
              onClick={() => selectAccount(account)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
