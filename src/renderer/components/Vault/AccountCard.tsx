import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { IAccount } from '../../../shared/types'
import { getInitials, truncate } from '../../utils/helpers'

interface AccountCardProps {
  account: IAccount
  isSelected: boolean
  onClick: () => void
  onToggleFavorite: (id: number, current: number) => void
}

export function AccountCard({ account, isSelected, onClick, onToggleFavorite }: AccountCardProps) {
  const [optimisticFav, setOptimisticFav] = useState<boolean | null>(null)
  const initials = getInitials(account.title)

  const isFav = optimisticFav ?? (account.favorite === 1)

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!account.id) return
    const newValue = isFav ? 0 : 1
    setOptimisticFav(newValue === 1)
    try {
      await window.electronAPI.db.updateFavorite(account.id, newValue)
      setOptimisticFav(null)
      onToggleFavorite(account.id, account.favorite)
    } catch {
      setOptimisticFav(null)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`card p-4 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-primary ring-1 ring-primary'
          : 'hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
          isSelected ? 'bg-primary text-white' : 'bg-primary/20 text-primary-light'
        }`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-text-primary truncate">
            {account.title}
          </h3>
          <p className="text-xs text-text-secondary truncate mt-0.5">
            {truncate(account.username, 24)}
          </p>
        </div>
        <button
          onClick={handleFavoriteToggle}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-background-tertiary transition-colors z-10"
          type="button"
        >
          <svg
            className={`w-5 h-5 transition-all duration-200 ${
              isFav ? 'text-accent scale-110' : 'text-text-secondary hover:text-accent'
            }`}
            fill={isFav ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={isFav ? 0 : 2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}
