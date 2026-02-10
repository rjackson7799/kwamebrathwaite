'use client'

import { useCallback, useRef, KeyboardEvent, ChangeEvent } from 'react'

interface SearchBarProps {
  /** Current search value */
  value: string
  /** Change handler for controlled input */
  onChange: (value: string) => void
  /** Submit handler (Enter key) */
  onSubmit?: (value: string) => void
  /** Clear handler */
  onClear?: () => void
  /** Placeholder text */
  placeholder?: string
  /** Additional CSS classes */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Auto focus on mount */
  autoFocus?: boolean
  /** aria-label for accessibility */
  ariaLabel?: string
}

/**
 * SearchBar component with icon, clear button, and keyboard support.
 * Styled per DESIGN_SYSTEM.md specifications:
 * - 24px border radius (pill shape)
 * - Gray background, black border on focus
 * - 20px search icon positioned left
 * - Full width on mobile, max 400px on desktop
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Search...',
  className = '',
  disabled = false,
  autoFocus = false,
  ariaLabel = 'Search',
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSubmit) {
        e.preventDefault()
        onSubmit(value)
      } else if (e.key === 'Escape') {
        if (value && onClear) {
          onClear()
        }
        inputRef.current?.blur()
      }
    },
    [value, onSubmit, onClear]
  )

  const handleClear = useCallback(() => {
    onChange('')
    onClear?.()
    inputRef.current?.focus()
  }, [onChange, onClear])

  return (
    <div className={`relative w-full md:max-w-[400px] ${className}`}>
      {/* Search Icon */}
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-warm pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        className="
          w-full
          bg-[#F5F5F5] dark:bg-[#2A2A2A]
          border border-transparent
          rounded-full
          py-3 pl-12 pr-10
          text-body
          text-black dark:text-[#F0F0F0]
          placeholder:text-gray-warm dark:placeholder:text-[#666666]
          focus:outline-none
          focus:bg-white dark:focus:bg-[#1A1A1A]
          focus:border-black dark:focus:border-[#F0F0F0]
          disabled:opacity-50
          disabled:cursor-not-allowed
          transition-colors duration-normal
        "
      />

      {/* Clear Button */}
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            p-1
            text-gray-warm
            hover:text-black dark:hover:text-[#F0F0F0]
            focus:outline-none
            focus:text-black dark:focus:text-[#F0F0F0]
            transition-colors duration-normal
          "
          aria-label="Clear search"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
