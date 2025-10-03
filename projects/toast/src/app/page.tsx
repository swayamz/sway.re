'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { AddNotificationsModal } from '@/components/entosis/add-notifications-modal'
import { EntosisEventRow } from '@/components/entosis/entosis-event-row'
import { useEntosisEvents } from '@/hooks/useEntosisEvents'
import { LiveIndicator, RefreshingIndicator } from '@/components/ui/live-indicator'
import { InlineLoading } from '@/components/ui/loading-spinner'

export default function HomePage() {
  const { data: session, status } = useSession()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const eventsQuery = useEntosisEvents()
  const { data: eventsData, isLoading, error } = eventsQuery

  if (status === 'loading') {
    return <InlineLoading message="Loading..." />
  }

  if (!session) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Toast</h1>
        <p className="text-gray-400 mb-8">
          Sign in with your EVE Online character to track entosis notifications.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold">Entosis Events</h1>
            <LiveIndicator
              isLive={!eventsQuery.isError}
              lastUpdated={eventsQuery.dataUpdatedAt ? new Date(eventsQuery.dataUpdatedAt) : undefined}
            />
            <RefreshingIndicator isRefreshing={eventsQuery.isFetching} />
          </div>
          <p className="text-gray-400">Showing events from the last 6 hours</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
        >
          Import Notifications
        </button>
      </div>

      {isLoading && <InlineLoading message="Loading events..." />}

      {error && (
        <div className="text-center py-8">
          <div className="text-red-400">Failed to load events</div>
        </div>
      )}

      {eventsData && (
        <div className="space-y-3">
          {eventsData.events.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400">No entosis events found</div>
              <p className="text-sm text-gray-500 mt-2">
                Click "Add Notifications" to import sovereignty notifications from your EVE mail.
              </p>
            </div>
          ) : (
            eventsData.events.map((event: any) => (
              <EntosisEventRow key={event.id} event={event} />
            ))
          )}
        </div>
      )}

      <AddNotificationsModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  )
}