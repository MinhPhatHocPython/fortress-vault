import { useState, useCallback } from 'react'
import { CLIPBOARD_CLEAR_SECONDS } from '../../shared/constants'

export function useClipboard() {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    await window.electronAPI.system.copyToClipboard(text)
    setCopiedField(field)
    setTimeout(async () => {
      await window.electronAPI.system.clearClipboard()
      setCopiedField(null)
    }, CLIPBOARD_CLEAR_SECONDS * 1000)
  }, [])

  return { copiedField, copyToClipboard }
}
