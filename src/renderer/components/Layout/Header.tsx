import React from 'react'
import { DEBOUNCE_MS } from '../../../shared/constants'
import { useVault } from '../../contexts/VaultContext'

interface HeaderProps {
  viewMode: 'card' | 'table'
  onViewModeChange: (mode: 'card' | 'table') => void
}

export function Header({ viewMode, onViewModeChange }: HeaderProps) {
  const { searchQuery, setSearchQuery, accounts } = useVault()
  const [localSearch, setLocalSearch] = React.useState(searchQuery)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [localSearch, setSearchQuery])

  return (
    <div className="h-14 flex items-center gap-4 px-6 border-b border-gray-200 dark:border-border bg-white/80 dark:bg-background-secondary/80 backdrop-blur-sm">
      <div className="flex-1 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          placeholder="Search accounts..."
          className="w-full bg-background-tertiary border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm text-text-secondary">
          {accounts.length} items
        </div>

        <div className="flex bg-gray-100 dark:bg-background-tertiary rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('card')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-primary text-white' : 'text-text-secondary hover:text-gray-700 dark:hover:text-text-primary'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'text-text-secondary hover:text-gray-700 dark:hover:text-text-primary'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
