import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  showClose?: boolean
}

export default function Modal({ open, onClose, children, showClose = true }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto
        bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up p-6">
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
              rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
