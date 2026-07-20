import { useEffect, useRef } from 'react'
import { AUTO_LOCK_MINUTES } from '../../shared/constants'
import { useAuth } from '../contexts/AuthContext'

export function useAutoLock() {
  const { isAuthenticated, logout } = useAuth()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        logout()
      }, AUTO_LOCK_MINUTES * 60 * 1000)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, resetTimer))
    resetTimer()

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isAuthenticated, logout])
}
