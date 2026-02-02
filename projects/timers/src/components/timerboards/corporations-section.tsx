'use client'

import { useState } from 'react'
import { useTimerboardCorporations, useTimerboardMutations } from '@/hooks/useTimerboards'
import { RefreshingIndicator } from '@/components/ui/live-indicator'

interface CorporationsSectionProps {
  timerboardId: string
  isModeratorOrAdmin: boolean
  toast: {
    success: (message: string, details?: string) => void
    error: (message: string, details?: string) => void
  }
}

export function CorporationsSection({ timerboardId, isModeratorOrAdmin, toast }: CorporationsSectionProps) {
  const [newCorpName, setNewCorpName] = useState('')
  const [newCorpRole, setNewCorpRole] = useState('USER')
  const [error, setError] = useState('')

  const corporationsQuery = useTimerboardCorporations(timerboardId)
  const { addCorporation, removeCorporation } = useTimerboardMutations()

  const corporations = corporationsQuery.data || []

  const handleAddCorporation = async () => {
    if (!newCorpName.trim()) return

    setError('')

    try {
      await addCorporation.mutateAsync({
        timerboardId,
        corporationName: newCorpName,
        role: newCorpRole,
      })
      setNewCorpName('')
      setNewCorpRole('USER')
      toast.success(`Added ${newCorpName} to timerboard`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add corporation'
      setError(errorMessage)
      toast.error('Failed to add corporation', errorMessage)
    }
  }

  const handleRemoveCorporation = async (corporationId: number, corporationName: string) => {
    if (!confirm(`Are you sure you want to remove "${corporationName}" from this timerboard? All members of this corporation will lose access.`)) {
      return
    }

    try {
      await removeCorporation.mutateAsync({
        timerboardId,
        corporationId,
      })
      toast.success(`Removed ${corporationName} from timerboard`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove corporation'
      toast.error('Failed to remove corporation', errorMessage)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold">Corporation Access</h4>
        <RefreshingIndicator isRefreshing={corporationsQuery.isFetching && !corporationsQuery.isLoading} />
      </div>

      <div className="bg-gray-900 rounded-lg p-4">
        <p className="text-gray-400 text-sm mb-4">
          Grant entire corporations access to this timerboard. Any member of a corporation listed below will automatically have access.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {isModeratorOrAdmin && (
          <div className="space-y-3">
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Enter corporation name"
                value={newCorpName}
                onChange={(e) => setNewCorpName(e.target.value)}
                className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                disabled={addCorporation.isPending}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCorporation()}
              />
              <select
                value={newCorpRole}
                onChange={(e) => setNewCorpRole(e.target.value)}
                className="p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                disabled={addCorporation.isPending}
              >
                <option value="USER">User</option>
                <option value="MODERATOR">Moderator</option>
              </select>
              <button
                onClick={handleAddCorporation}
                disabled={addCorporation.isPending || !newCorpName.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded"
              >
                {addCorporation.isPending ? 'Adding...' : 'Add Corp'}
              </button>
            </div>
          </div>
        )}

        {/* Current Corporations List */}
        {corporations.length > 0 ? (
          <div className={`${isModeratorOrAdmin ? 'mt-4 pt-4 border-t border-gray-700' : ''}`}>
            <h5 className="text-sm font-medium text-gray-300 mb-3">
              Corporations with Access ({corporations.length})
            </h5>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {corporations.map((corp: any) => (
                <div key={corp.id} className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm">
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-medium">{corp.corporationName}</span>
                    <span className="text-gray-500 text-xs">ID: {corp.corporationId}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      corp.role === 'MODERATOR' ? 'bg-green-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>
                      {corp.role}
                    </span>
                    {isModeratorOrAdmin && (
                      <button
                        onClick={() => handleRemoveCorporation(corp.corporationId, corp.corporationName)}
                        disabled={removeCorporation.isPending}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded disabled:opacity-50"
                        title={`Remove ${corp.corporationName} from timerboard`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Added by: {corporations[0]?.addedBy || 'Unknown'}
            </p>
          </div>
        ) : (
          <div className={`${isModeratorOrAdmin ? 'mt-4 pt-4 border-t border-gray-700' : ''} text-gray-400 text-sm text-center py-4`}>
            No corporations have access to this timerboard yet
          </div>
        )}
      </div>
    </div>
  )
}
