'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

interface ToastProps {
  toast: ToastMessage
  onRemove: (id: string) => void
}

function Toast({ toast, onRemove }: ToastProps) {
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRemoving(true)
      // Wait for animation to complete before actually removing
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 5000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  const typeStyles = {
    success: 'bg-green-800 border-green-600 text-green-100',
    error: 'bg-red-800 border-red-600 text-red-100',
    info: 'bg-blue-800 border-blue-600 text-blue-100',
    warning: 'bg-yellow-800 border-yellow-600 text-yellow-100'
  }

  const iconMap = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  }

  return (
    <div className={`border rounded-lg p-4 shadow-lg min-w-72 max-w-96 ${typeStyles[toast.type]} transition-all duration-300 ${
      isRemoving ? 'animate-slide-out-right opacity-0' : 'animate-slide-in-right opacity-100'
    }`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg">{iconMap[toast.type]}</span>
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <p className="text-sm font-medium break-words">{toast.title}</p>
          {toast.message && (
            <p className="mt-1 text-sm opacity-90 break-words">{toast.message}</p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={handleRemove}
            className="text-gray-400 hover:text-gray-300"
          >
            <span className="sr-only">Close</span>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemoveToast: (id: string) => void
}

export function ToastContainer({ toasts, onRemoveToast }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemoveToast} />
      ))}
    </div>
  )
}

// Custom hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'success', title, message, duration: duration || 3000 })
  }, [addToast])

  const error = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'error', title, message, duration: duration || 6000 })
  }, [addToast])

  const info = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'info', title, message, duration })
  }, [addToast])

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    addToast({ type: 'warning', title, message, duration })
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning
  }
}