'use client'

import { useState } from 'react'
import { useEntosisEventMutations } from '@/hooks/useEntosisEvents'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface AddNotificationsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddNotificationsModal({ isOpen, onClose }: AddNotificationsModalProps) {
  const [mailText, setMailText] = useState('')
  const { importNotifications } = useEntosisEventMutations()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mailText.trim()) return

    try {
      await importNotifications.mutateAsync({ mailText })
      setMailText('')
      onClose()
    } catch (error) {
      console.error('Failed to import notifications:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Import Entosis Notifications</h2>
        <p className="text-gray-400 mb-4">
          Copy and paste all sovereignty notifications from your EVE mail. Use Ctrl+A to select all mails from your Sovereignty folder.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={mailText}
            onChange={(e) => setMailText(e.target.value)}
            placeholder="Paste your sovereignty notifications here..."
            className="w-full h-64 bg-gray-700 border border-gray-600 rounded p-3 text-white resize-none"
            required
          />

          {importNotifications.isError && (
            <div className="mt-2 text-red-400 text-sm">
              {importNotifications.error?.message || 'Failed to import notifications'}
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importNotifications.isPending || !mailText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded transition-colors flex items-center space-x-2"
            >
              {importNotifications.isPending && <LoadingSpinner size="small" />}
              <span>{importNotifications.isPending ? 'Importing...' : 'Import Notifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}