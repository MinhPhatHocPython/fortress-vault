import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUpdate } from '../../contexts/UpdateContext'

export function UpdateToast() {
  const { available, downloading, progress, downloaded, error, checkForUpdates, downloadUpdate, installUpdate, dismissUpdate } = useUpdate()

  const show = !!(available || downloading || downloaded || error)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-[200] max-w-md mx-auto"
        >
          <div className="card p-4 shadow-2xl border border-primary/30">
            {error && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-error">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Update check failed. Will retry later.</span>
                </div>
                <button onClick={dismissUpdate} className="text-text-secondary hover:text-white p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}

            {available && !downloading && !downloaded && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-primary-light mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  New version available: v{available.version}
                </div>
                <div className="flex gap-2">
                  <button onClick={downloadUpdate} className="btn-primary text-xs px-3 py-1.5">Download</button>
                  <button onClick={dismissUpdate} className="btn-secondary text-xs px-3 py-1.5">Later</button>
                </div>
              </div>
            )}

            {downloading && progress && (
              <div>
                <div className="flex items-center gap-2 text-sm text-text-primary mb-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Downloading update... {Math.round(progress.percent)}%
                </div>
                <div className="w-full h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percent}%` }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            )}

            {downloaded && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-accent mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Update downloaded! Install now?
                </div>
                <div className="flex gap-2">
                  <button onClick={installUpdate} className="btn-accent text-xs px-3 py-1.5">Install</button>
                  <button onClick={dismissUpdate} className="btn-secondary text-xs px-3 py-1.5">Later</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
