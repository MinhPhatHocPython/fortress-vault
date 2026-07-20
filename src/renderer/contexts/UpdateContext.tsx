import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface UpdateInfo {
  version: string
  releaseDate?: string
}

interface DownloadProgress {
  percent: number
  bytesPerSecond: number
}

interface UpdateContextType {
  checking: boolean
  available: UpdateInfo | null
  downloading: boolean
  progress: DownloadProgress | null
  downloaded: boolean
  error: string | null
  checkForUpdates: () => void
  downloadUpdate: () => void
  installUpdate: () => void
  dismissUpdate: () => void
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined)

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<UpdateInfo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.app.onUpdateAvailable((info) => {
      setAvailable(info)
      setChecking(false)
      setError(null)
    })

    window.electronAPI.app.onUpdateNotAvailable(() => {
      setChecking(false)
      setAvailable(null)
    })

    window.electronAPI.app.onUpdateDownloadProgress((p) => {
      setProgress(p)
      setDownloading(true)
    })

    window.electronAPI.app.onUpdateDownloaded(() => {
      setDownloading(false)
      setDownloaded(true)
      setProgress(null)
    })

    window.electronAPI.app.onUpdateError?.((message) => {
      setError(message)
      setChecking(false)
      setDownloading(false)
    })
  }, [])

  const checkForUpdates = useCallback(() => {
    setChecking(true)
    setError(null)
    window.electronAPI.app.checkForUpdate()
    setTimeout(() => setChecking(false), 10000)
  }, [])

  const downloadUpdate = useCallback(() => {
    setDownloading(true)
    setError(null)
    window.electronAPI.app.downloadUpdate()
  }, [])

  const installUpdate = useCallback(() => {
    window.electronAPI.app.installUpdate()
  }, [])

  const dismissUpdate = useCallback(() => {
    setAvailable(null)
    setDownloaded(false)
    setError(null)
  }, [])

  return (
    <UpdateContext.Provider value={{
      checking, available, downloading, progress, downloaded, error,
      checkForUpdates, downloadUpdate, installUpdate, dismissUpdate,
    }}>
      {children}
    </UpdateContext.Provider>
  )
}

export function useUpdate() {
  const ctx = useContext(UpdateContext)
  if (!ctx) throw new Error('useUpdate must be used within UpdateProvider')
  return ctx
}
