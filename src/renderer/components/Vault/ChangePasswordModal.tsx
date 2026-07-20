import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Modal } from '../UI/Modal'
import { toast } from '../UI/Toast'
import { useAuth } from '../../contexts/AuthContext'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

const shakeVariants = {
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
}

function getPasswordStrength(password: string): { label: string; color: string; bg: string; score: number } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score++

  if (score <= 2) return { label: 'Weak', color: 'text-error', bg: 'bg-error/20', score }
  if (score <= 4) return { label: 'Medium', color: 'text-warning', bg: 'bg-warning/20', score }
  return { label: 'Strong', color: 'text-accent', bg: 'bg-accent/20', score }
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [hint, setHint] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shakeFields, setShakeFields] = useState<string[]>([])
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)

  const strength = getPasswordStrength(newPassword)

  const triggerShake = (...fields: string[]) => {
    setShakeFields(fields)
    setTimeout(() => setShakeFields([]), 500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutUntil && Date.now() < lockoutUntil) return

    if (!currentPassword) {
      triggerShake('current')
      toast('Please enter your current password', 'error')
      return
    }
    if (!newPassword) {
      triggerShake('new')
      toast('Please enter a new password', 'error')
      return
    }
    if (newPassword.length < 8) {
      triggerShake('new')
      toast('New password must be at least 8 characters', 'error')
      return
    }
    if (newPassword === currentPassword) {
      triggerShake('new')
      toast('New password must be different from current password', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      triggerShake('confirm')
      toast('New passwords do not match', 'error')
      return
    }

    setLoading(true)
    try {
      await window.electronAPI.db.changeMasterPassword(currentPassword, newPassword, hint)
      toast('Master password changed successfully!', 'success')
      setAttempts(0)
      setTimeout(async () => {
        onClose()
        await logout()
      }, 1500)
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Failed to change password'
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= 5) {
        setLockoutUntil(Date.now() + 30000)
        toast('Too many attempts. Locked for 30s', 'error')
      } else {
        toast(message, 'error')
      }
      triggerShake('current')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Master Password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div
          animate={shakeFields.includes('current') ? 'shake' : ''}
          variants={shakeVariants}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Current Password *</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className={`input-field pr-10 ${shakeFields.includes('current') ? 'border-error ring-1 ring-error' : ''}`}
              placeholder="Enter current master password"
              disabled={!!(lockoutUntil && Date.now() < lockoutUntil)}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-gray-700 dark:hover:text-text-primary"
            >
              {showCurrent ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </motion.div>

        <motion.div
          animate={shakeFields.includes('new') ? 'shake' : ''}
          variants={shakeVariants}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">New Password *</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={`input-field pr-10 ${shakeFields.includes('new') ? 'border-error ring-1 ring-error' : ''}`}
              placeholder="Enter new master password"
              disabled={!!(lockoutUntil && Date.now() < lockoutUntil)}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-gray-700 dark:hover:text-text-primary"
            >
              {showNew ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {newPassword.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-background-tertiary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(strength.score / 6) * 100}%` }}
                  className={`h-full rounded-full ${
                    strength.score <= 2 ? 'bg-error' : strength.score <= 4 ? 'bg-warning' : 'bg-accent'
                  }`}
                />
              </div>
              <span className={`text-xs font-medium ${strength.color}`}>{strength.label}</span>
            </div>
          )}
        </motion.div>

        <motion.div
          animate={shakeFields.includes('confirm') ? 'shake' : ''}
          variants={shakeVariants}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Confirm New Password *</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={`input-field pr-10 ${shakeFields.includes('confirm') ? 'border-error ring-1 ring-error' : ''}`}
              placeholder="Confirm new master password"
              disabled={!!(lockoutUntil && Date.now() < lockoutUntil)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-gray-700 dark:hover:text-text-primary"
            >
              {showConfirm ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </motion.div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Password Hint (optional)</label>
          <input
            type="text"
            value={hint}
            onChange={e => setHint(e.target.value)}
            className="input-field"
            placeholder="e.g. My favorite song"
          />
        </div>

        {lockoutUntil && Date.now() < lockoutUntil && (
          <div className="text-center text-error text-sm bg-error/10 p-3 rounded-lg">
            Too many attempts. Locked for {Math.ceil((lockoutUntil - Date.now()) / 1000)}s
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading || !!(lockoutUntil && Date.now() < lockoutUntil)} className="btn-primary flex-1">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Changing...
              </span>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
