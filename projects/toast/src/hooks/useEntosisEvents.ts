import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface EntosisEvent {
  id: string
  system: string
  region: string | null
  timestamp: string
  isReinforced: boolean
  status: 'Being Captured!' | 'On the way' | 'Cleared' | 'Reset' | 'REINFORCED'
  notificationHash: string
  importedBy: string
  markedBy?: string | null
  markedAt?: string | null
  markedNote?: string | null
  lastUpdatedBy?: string | null
  lastUpdatedAt?: string | null
  importedByUser?: {
    characterName: string
  }
  markedByUser?: {
    characterName: string
  } | null
}

// Hook to fetch all entosis events
export function useEntosisEvents() {
  return useQuery({
    queryKey: ['entosis-events'],
    queryFn: async () => {
      const response = await fetch('/api/entosis')
      if (!response.ok) {
        throw new Error('Failed to fetch entosis events')
      }
      return response.json()
    },
    refetchInterval: 5 * 1000, // Refresh every 5 seconds for real-time updates
  })
}

// Mutations for data modification
export function useEntosisEventMutations() {
  const queryClient = useQueryClient()

  const updateStatus = useMutation({
    mutationFn: async ({ eventId, status, note }: {
      eventId: string;
      status: string;
      note?: string
    }) => {
      const response = await fetch('/api/entosis', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId, status, note }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update event status')
      }
      return response.json()
    },
    onMutate: async ({ eventId, status, note }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['entosis-events'] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['entosis-events'])

      // Optimistically update the event status
      queryClient.setQueryData(['entosis-events'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          events: old.events.map((event: EntosisEvent) =>
            event.id === eventId
              ? {
                  ...event,
                  status,
                  markedNote: note || null,
                  lastUpdatedAt: new Date().toISOString()
                }
              : event
          )
        }
      })

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData(['entosis-events'], context.previousData)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['entosis-events'] })
    },
  })

  const importNotifications = useMutation({
    mutationFn: async ({ mailText }: { mailText: string }) => {
      const response = await fetch('/api/entosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mailText }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to import notifications')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch events after successful import
      queryClient.invalidateQueries({ queryKey: ['entosis-events'] })
    },
  })

  const deleteEvent = useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      const response = await fetch('/api/entosis', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete event')
      }
      return response.json()
    },
    onMutate: async ({ eventId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['entosis-events'] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['entosis-events'])

      // Optimistically remove the event
      queryClient.setQueryData(['entosis-events'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          events: old.events.filter((event: EntosisEvent) => event.id !== eventId)
        }
      })

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData(['entosis-events'], context.previousData)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['entosis-events'] })
    },
  })

  return {
    updateStatus,
    importNotifications,
    deleteEvent,
  }
}