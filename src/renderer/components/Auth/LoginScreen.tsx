import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from '../UI/Toast'
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_SECONDS } from '../../../shared/constants'

const shakeVariants = {
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
}

export function LoginScreen() {
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [hint, setHint] = useState('')
  const [shake, setShake] = useState(false)
  const [remember, setRemember] = useState(false)

  const fetchHint = async () => {
    try {
      const settings = await window.electronAPI.db.getSettings()
      if (settings && settings.masterKeyHint) {
        setHint(settings.masterKeyHint)
      }
    } catch {}
  }

  useEffect(() => {
    if (lockoutUntil) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000)
        if (remaining <= 0) {
          setLockoutUntil(null)
          setCountdown(0)
          setAttempts(0)
          clearInterval(interval)
        } else {
          setCountdown(remaining)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [lockoutUntil])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutUntil && Date.now() < lockoutUntil) return

    if (!password) {
      toast('Please enter your master password', 'error')
      return
    }

    setLoading(true)
    try {
      const success = await login(password, remember)
      if (success) {
        toast('Welcome back!', 'success')
        setAttempts(0)
      } else {
        setShake(true)
        setTimeout(() => setShake(false), 500)
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          setLockoutUntil(Date.now() + LOCKOUT_SECONDS * 1000)
          toast(`Too many attempts. Locked for ${LOCKOUT_SECONDS}s`, 'error')
        } else {
          toast(`Invalid password (${newAttempts}/${MAX_LOGIN_ATTEMPTS})`, 'error')
        }
        if (newAttempts === 1) {
          fetchHint()
        }
      }
    } catch {
      toast('Login failed', 'error')
    } finally {
      setLoading(false)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Fortress Vault</h1>
          <p className="text-text-secondary mt-2">Enter your Master Password</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Master Password</label>
            <motion.div
              animate={shake ? 'shake' : undefined}
              variants={shakeVariants}
              className="relative"
            >
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`input-field pr-10 ${shake ? 'border-error ring-1 ring-error' : ''}`}
                placeholder="Enter master password"
                disabled={!!(lockoutUntil && Date.now() < lockoutUntil)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-gray-700 dark:hover:text-text-primary"
              >
                {showPassword ? (
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
            </motion.div>
          </div>

          {attempts > 0 && hint && (
            <div className="text-sm text-primary-light bg-primary/5 p-3 rounded-lg border border-primary/20">
              <span className="font-medium">Hint: </span>{hint}
            </div>
          )}

          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-border bg-white dark:bg-background-tertiary accent-primary"
            />
            <span>Remember this device for {7} days</span>
          </label>

          {lockoutUntil && Date.now() < lockoutUntil && (
            <div className="text-center text-error text-sm bg-error/10 p-3 rounded-lg">
              Locked out. Retry in {countdown}s
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!(lockoutUntil && Date.now() < lockoutUntil)}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? 'Unlocking...' : 'Unlock Vault'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
