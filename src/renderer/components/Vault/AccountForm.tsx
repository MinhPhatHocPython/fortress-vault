import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Modal } from '../UI/Modal'
import { PasswordGenerator } from './PasswordGenerator'
import { IAccount } from '../../../shared/types'
import { useVault } from '../../contexts/VaultContext'
import { toast } from '../UI/Toast'

const shakeVariants = {
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
}

interface AccountFormProps {
  isOpen: boolean
  onClose: () => void
  editAccount?: IAccount | null
}

export function AccountForm({ isOpen, onClose, editAccount }: AccountFormProps) {
  const { addAccount, updateAccount } = useVault()
  const [showGenerator, setShowGenerator] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [titleShake, setTitleShake] = useState(false)
  const [form, setForm] = useState({
    title: '',
    username: '',
    password: '',
    url: '',
    note: '',
    favorite: 0,
  })

  useEffect(() => {
    if (editAccount) {
      setForm({
        title: editAccount.title || '',
        username: editAccount.username || '',
        password: editAccount.password || '',
        url: editAccount.url || '',
        note: editAccount.note || '',
        favorite: editAccount.favorite || 0,
      })
    } else {
      setForm({ title: '', username: '', password: '', url: '', note: '', favorite: 0 })
    }
    setIsSubmitting(false)
    setShowSuccess(false)
    setTitleShake(false)
  }, [editAccount, isOpen])

  const triggerShake = () => {
    setTitleShake(true)
    setTimeout(() => setTitleShake(false), 500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      triggerShake()
      toast('Title is required', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      if (editAccount?.id) {
        await updateAccount(editAccount.id, { ...form, id: editAccount.id, createdAt: editAccount.createdAt, updatedAt: new Date().toISOString() })
      } else {
        await addAccount({ ...form, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      }
      setShowSuccess(true)
      setTimeout(() => {
        onClose()
      }, 600)
    } catch (err: unknown) {
      setIsSubmitting(false)
      const message = (err as { message?: string })?.message || 'Failed to save account'
      toast(message, 'error')
    }
  }

  const handleSelectPassword = (password: string) => {
    setForm(prev => ({ ...prev, password }))
    setShowGenerator(false)
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={editAccount ? 'Edit Account' : 'Add Account'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Title *</label>
            <motion.div
              animate={titleShake ? 'shake' : ''}
              variants={shakeVariants}
            >
              <input
                type="text"
                value={form.title}
                onChange={e => { setForm({ ...form, title: e.target.value }); setTitleShake(false) }}
                className={`input-field ${titleShake ? 'border-error ring-1 ring-error' : ''}`}
                placeholder="e.g. Google, GitHub"
                autoFocus
              />
            </motion.div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="input-field"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Password</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-field flex-1"
                placeholder="Enter or generate password"
              />
              <button
                type="button"
                onClick={() => setShowGenerator(true)}
                className="btn-secondary whitespace-nowrap text-xs"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">URL</label>
            <input
              type="text"
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              className="input-field"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Note</label>
            <textarea
              value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              className="input-field resize-none h-20"
              placeholder="Optional notes..."
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={form.favorite === 1}
              onChange={e => setForm({ ...form, favorite: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 rounded border-gray-300 dark:border-border bg-white dark:bg-background-tertiary accent-accent"
            />
            Add to favorites
          </label>

          <div className="flex gap-3 pt-2 min-h-[44px]">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={isSubmitting}>
              Cancel
            </button>
            <div className="flex-1 relative">
              {showSuccess ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full h-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : null}
                  {isSubmitting ? 'Saving...' : editAccount ? 'Update' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showGenerator} onClose={() => setShowGenerator(false)} title="Password Generator" maxWidth="max-w-sm">
        <PasswordGenerator onSelect={handleSelectPassword} onClose={() => setShowGenerator(false)} />
      </Modal>
    </>
  )
}
