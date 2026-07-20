import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { IPasswordOptions } from '../../../shared/types'

interface PasswordGeneratorProps {
  onSelect: (password: string) => void
  onClose: () => void
}

export function PasswordGenerator({ onSelect, onClose }: PasswordGeneratorProps) {
  const [options, setOptions] = useState<IPasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
  })
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    const password = await window.electronAPI.crypto.generatePassword(options)
    setGeneratedPassword(password)
    setCopied(false)
  }

  const handleCopy = async () => {
    if (generatedPassword) {
      await window.electronAPI.system.copyToClipboard(generatedPassword)
      setCopied(true)
      setTimeout(async () => {
        await window.electronAPI.system.clearClipboard()
        setCopied(false)
      }, 15000)
    }
  }

  const strength = () => {
    let score = 0
    if (options.length >= 12) score++
    if (options.length >= 16) score++
    if (options.uppercase) score++
    if (options.lowercase) score++
    if (options.numbers) score++
    if (options.symbols) score++
    if (score <= 2) return { label: 'Weak', color: 'text-error', bg: 'bg-error/20' }
    if (score <= 4) return { label: 'Medium', color: 'text-warning', bg: 'bg-warning/20' }
    return { label: 'Strong', color: 'text-accent', bg: 'bg-accent/20' }
  }

  const s = strength()

  return (
    <div className="space-y-4">
      {generatedPassword && (
        <div className="p-4 bg-gray-50 dark:bg-background-tertiary rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${s.color} ${s.bg} px-2 py-0.5 rounded-full`}>
              {s.label}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs text-primary-light hover:text-primary"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-lg font-mono text-gray-900 dark:text-text-primary break-all tracking-wider">{generatedPassword}</p>
        </div>
      )}

      <div>
        <label className="text-sm text-gray-700 dark:text-text-primary flex justify-between">
          Length: <span className="text-primary-light font-mono">{options.length}</span>
        </label>
        <input
          type="range"
          min={8}
          max={64}
          value={options.length}
          onChange={e => setOptions({ ...options, length: parseInt(e.target.value) })}
          className="w-full accent-primary mt-1"
        />
        <div className="flex justify-between text-xs text-text-secondary">
          <span>8</span>
          <span>64</span>
        </div>
      </div>

      <div className="space-y-2">
        {[
          { label: 'Uppercase (A-Z)', key: 'uppercase' as const },
          { label: 'Lowercase (a-z)', key: 'lowercase' as const },
          { label: 'Numbers (0-9)', key: 'numbers' as const },
          { label: 'Symbols (!@#$%^&*)', key: 'symbols' as const },
        ].map(item => (
          <label key={item.key} className="flex items-center gap-3 text-sm text-gray-700 dark:text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={options[item.key]}
              onChange={e => setOptions({ ...options, [item.key]: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 dark:border-border bg-white dark:bg-background-tertiary accent-primary"
            />
            {item.label}
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={generate} className="btn-primary flex-1">
          Generate
        </button>
        <button
          onClick={() => onSelect(generatedPassword)}
          disabled={!generatedPassword}
          className="btn-secondary flex-1"
        >
          Use Password
        </button>
      </div>
    </div>
  )
}
