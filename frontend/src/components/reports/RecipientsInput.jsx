import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Mail } from 'lucide-react'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RecipientsInput({
  value = [],
  onChange,
  placeholder = 'Enter email address...',
  maxRecipients = 20,
}) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const validateEmail = (email) => {
    return emailRegex.test(email.trim().toLowerCase())
  }

  const addEmail = (email) => {
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail) {
      return
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address')
      return
    }

    if (value.includes(trimmedEmail)) {
      setError('This email is already added')
      return
    }

    if (value.length >= maxRecipients) {
      setError(`Maximum ${maxRecipients} recipients allowed`)
      return
    }

    setError('')
    onChange([...value, trimmedEmail])
    setInputValue('')
  }

  const removeEmail = (emailToRemove) => {
    onChange(value.filter(email => email !== emailToRemove))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addEmail(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last email when backspace on empty input
      removeEmail(value[value.length - 1])
    } else if (e.key === ',' || e.key === ' ') {
      // Also allow comma or space to add email
      if (inputValue.trim()) {
        e.preventDefault()
        addEmail(inputValue)
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')

    // Split by common delimiters
    const emails = pastedText.split(/[,;\s]+/).filter(Boolean)

    const validEmails = []
    for (const email of emails) {
      const trimmed = email.trim().toLowerCase()
      if (validateEmail(trimmed) && !value.includes(trimmed) && !validEmails.includes(trimmed)) {
        validEmails.push(trimmed)
      }
    }

    if (validEmails.length > 0) {
      const newEmails = [...value, ...validEmails].slice(0, maxRecipients)
      onChange(newEmails)
    }
  }

  return (
    <div className="space-y-2">
      {/* Email Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg bg-slate-50">
          {value.map((email) => (
            <Badge
              key={email}
              variant="secondary"
              className="gap-1 py-1 px-2 text-xs"
            >
              <Mail className="w-3 h-3" />
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="ml-1 hover:text-danger"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            ref={inputRef}
            type="email"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => addEmail(inputValue)}
          disabled={!inputValue.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {/* Helper Text */}
      <p className="text-xs text-slate-400">
        Press Enter, comma, or space to add. {value.length}/{maxRecipients} recipients.
      </p>
    </div>
  )
}
