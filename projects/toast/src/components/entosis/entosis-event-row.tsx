'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useEntosisEventMutations, type EntosisEvent } from '@/hooks/useEntosisEvents'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface EntosisEventRowProps {
  event: EntosisEvent
}

export function EntosisEventRow({ event }: EntosisEventRowProps) {
  const { data: session } = useSession()
  const { updateStatus, deleteEvent } = useEntosisEventMutations()

  const getTimeSinceCapture = () => {
    const now = new Date()
    const eventTime = new Date(event.timestamp)
    const diffMs = now.getTime() - eventTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m ago`
    }
    return `${diffMins}m ago`
  }

  const getTimeSinceLastUpdate = () => {
    if (!event.lastUpdatedAt) return null

    const now = new Date()
    const updateTime = new Date(event.lastUpdatedAt)
    const diffMs = now.getTime() - updateTime.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m ago`
    }
    return `${diffMins}m ago`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Being Captured!': return 'text-red-400'
      case 'On the way': return 'text-yellow-400'
      case 'Cleared': return 'text-green-400'
      case 'Reset': return 'text-blue-400'
      case 'REINFORCED': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ eventId: event.id, status: newStatus })
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      await deleteEvent.mutateAsync({ eventId: event.id })
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const isSwayRe = session?.user && (session.user as any).characterName === 'Sway Re'

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="font-bold text-blue-400">{event.system}</div>
          <div className="text-gray-400">[{event.region || 'Unknown Region'}]</div>
          <div className={`font-semibold ${getStatusColor(event.status)}`}>
            [{event.status}]
          </div>
          <div className="text-gray-500">{getTimeSinceCapture()}</div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleStatusChange('Being Captured!')}
            disabled={updateStatus.isPending || event.status === 'Being Captured!'}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors flex items-center space-x-1"
          >
            {updateStatus.isPending && updateStatus.variables?.eventId === event.id ? (
              <LoadingSpinner size="small" />
            ) : (
              <span>Being Captured!</span>
            )}
          </button>
          <button
            onClick={() => handleStatusChange('On the way')}
            disabled={updateStatus.isPending || event.status === 'On the way'}
            className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors flex items-center space-x-1"
          >
            {updateStatus.isPending && updateStatus.variables?.eventId === event.id ? (
              <LoadingSpinner size="small" />
            ) : (
              <span>Traveling</span>
            )}
          </button>
          <button
            onClick={() => handleStatusChange('Cleared')}
            disabled={updateStatus.isPending || event.status === 'Cleared'}
            className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors flex items-center space-x-1"
          >
            {updateStatus.isPending && updateStatus.variables?.eventId === event.id ? (
              <LoadingSpinner size="small" />
            ) : (
              <span>Cleared</span>
            )}
          </button>
          <button
            onClick={() => handleStatusChange('Reset')}
            disabled={updateStatus.isPending || event.status === 'Reset'}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors flex items-center space-x-1"
          >
            {updateStatus.isPending && updateStatus.variables?.eventId === event.id ? (
              <LoadingSpinner size="small" />
            ) : (
              <span>Fully Reset</span>
            )}
          </button>
          <button
            onClick={() => handleStatusChange('REINFORCED')}
            disabled={updateStatus.isPending || event.status === 'REINFORCED'}
            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors flex items-center space-x-1"
          >
            {updateStatus.isPending && updateStatus.variables?.eventId === event.id ? (
              <LoadingSpinner size="small" />
            ) : (
              <span>Reinforced</span>
            )}
          </button>
          {isSwayRe && (
            <button
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
              className="px-2 py-1 bg-red-700 hover:bg-red-800 disabled:bg-gray-600 text-white text-xs rounded transition-colors flex items-center space-x-1"
            >
              {deleteEvent.isPending && deleteEvent.variables?.eventId === event.id ? (
                <LoadingSpinner size="small" />
              ) : (
                <span>Delete</span>
              )}
            </button>
          )}
        </div>
      </div>

      {event.markedBy && (
        <div className="mt-2 text-sm text-gray-500">
          {event.status === 'Being Captured!' && `${event.markedByUser?.characterName || 'Someone'} marked as being captured`}
          {event.status === 'On the way' && `${event.markedByUser?.characterName || 'Someone'} is on the way`}
          {event.status === 'Cleared' && `${event.markedByUser?.characterName || 'Someone'} marked as cleared`}
          {event.status === 'Reset' && `${event.markedByUser?.characterName || 'Someone'} marked as reset`}
          {event.status === 'REINFORCED' && `${event.markedByUser?.characterName || 'Someone'} marked as reinforced`}
          {event.markedNote && ` - ${event.markedNote}`}
          {getTimeSinceLastUpdate() && ` - ${getTimeSinceLastUpdate()}`}
        </div>
      )}
    </div>
  )
}