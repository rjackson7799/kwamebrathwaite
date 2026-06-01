'use client'

interface CoaPrintButtonProps {
  label: string
}

export function CoaPrintButton({ label }: CoaPrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') window.print()
      }}
      className="inline-block px-8 py-3 bg-[#0e0e0e] hover:bg-[#1a1a1a] text-[#C9A961] border border-[#C9A961] text-sm uppercase tracking-[0.18em] font-medium transition-colors"
    >
      {label}
    </button>
  )
}
