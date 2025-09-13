import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Timer {
  id: string
  structureType: string
  system: string
  region: string | null
  location: string
  owner: string
  layer: string | null
  expiresAt: string
  activeUntil: string | null
  notes: string | null
  isActive: boolean
  isExpired: boolean
  addedBy: string
  createdAt: string
}

export interface Timerboard {
  id: string
  name: string
  description: string | null
  userRole: string
}

export interface TimerboardData {
  timerboard: Timerboard
  timers: Timer[]
}

// Hook to fetch all timerboards
export function useTimerboards() {
  return useQuery({
    queryKey: ['timerboards'],
    queryFn: async () => {
      const response = await fetch('/api/timerboards')
      if (!response.ok) {
        throw new Error('Failed to fetch timerboards')
      }
      return response.json()
    },
  })
}

// Hook to fetch a specific timerboard with its timers
export function useTimerboard(id: string | null) {
  return useQuery({
    queryKey: ['timerboard', id],
    queryFn: async () => {
      if (!id) return null
      const response = await fetch(`/api/timerboards/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch timerboard')
      }
      return response.json() as Promise<TimerboardData>
    },
    enabled: !!id,
    refetchInterval: 30 * 1000, // More frequent updates for active timer data
  })
}

// Hook to fetch timerboard users
export function useTimerboardUsers(timerboardId: string | null) {
  return useQuery({
    queryKey: ['timerboard-users', timerboardId],
    queryFn: async () => {
      if (!timerboardId) return null
      const response = await fetch(`/api/timerboards/${timerboardId}/users`)
      if (!response.ok) {
        throw new Error('Failed to fetch timerboard users')
      }
      const data = await response.json()
      return data.users
    },
    enabled: !!timerboardId,
  })
}

// Hook to fetch timerboard statistics
export function useTimerboardStatistics(timerboardId: string | null) {
  return useQuery({
    queryKey: ['timerboard-statistics', timerboardId],
    queryFn: async () => {
      if (!timerboardId) return null
      const response = await fetch(`/api/timerboards/${timerboardId}/statistics`)
      if (!response.ok) {
        throw new Error('Failed to fetch timerboard statistics')
      }
      return response.json()
    },
    enabled: !!timerboardId,
    staleTime: 5 * 60 * 1000, // Statistics can be cached longer (5 minutes)
  })
}

// Hook to fetch audit logs
export function useAuditLogs(timerboardId: string | null) {
  return useQuery({
    queryKey: ['audit-logs', timerboardId],
    queryFn: async () => {
      if (!timerboardId) return null
      const response = await fetch(`/api/timerboards/${timerboardId}/audit-logs`)
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }
      const data = await response.json()
      return data.auditLogs
    },
    enabled: !!timerboardId,
  })
}

// Hook to fetch regions and campaigns
export function useCampaigns(timerboardId: string | null) {
  const queryClient = useQueryClient()
  
  const regionsQuery = useQuery({
    queryKey: ['timerboard-regions', timerboardId],
    queryFn: async () => {
      if (!timerboardId) return []
      const response = await fetch(`/api/timerboards/${timerboardId}/regions`)
      if (!response.ok) return []
      const data = await response.json()
      return data.regions || []
    },
    enabled: !!timerboardId,
  })

  const campaignsQuery = useQuery({
    queryKey: ['campaigns', regionsQuery.data],
    queryFn: async () => {
      const regions = regionsQuery.data
      if (!regions || regions.length === 0) return []
      
      const response = await fetch(`/api/sovereignty/campaigns?regions=${regions.join(',')}`)
      if (!response.ok) return []
      
      const campaigns = await response.json()
      return campaigns.sort((a: any, b: any) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    },
    enabled: !!(regionsQuery.data && regionsQuery.data.length > 0),
    refetchInterval: 2 * 60 * 1000, // Refresh campaigns every 2 minutes
  })

  return {
    regions: regionsQuery.data || [],
    campaigns: campaignsQuery.data || [],
    regionsLoading: regionsQuery.isLoading,
    campaignsLoading: campaignsQuery.isLoading,
  }
}

// Mutations for data modification
export function useTimerboardMutations() {
  const queryClient = useQueryClient()

  const deleteTimer = useMutation({
    mutationFn: async (timerId: string) => {
      const response = await fetch(`/api/timers/${timerId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete timer')
      }
      return response.json()
    },
    onMutate: async (timerId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timerboard'] })
      
      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: ['timerboard'] })
      
      // Optimistically remove the timer from all timerboard queries
      queryClient.setQueriesData({ queryKey: ['timerboard'] }, (old: any) => {
        if (!old) return old
        return {
          ...old,
          timers: old.timers.filter((timer: Timer) => timer.id !== timerId)
        }
      })
      
      return { previousData }
    },
    onError: (err, timerId, context) => {
      // Revert the optimistic update on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['timerboard'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
  })

  const repairTimer = useMutation({
    mutationFn: async (timerId: string) => {
      const response = await fetch(`/api/timers/${timerId}/repair`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Failed to repair timer')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timerboard'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
  })

  const createTimerboard = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const response = await fetch('/api/timerboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || null,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create timerboard')
      }
      return response.json()
    },
    onMutate: async ({ name, description }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timerboards'] })
      
      // Snapshot the previous value
      const previousTimerboards = queryClient.getQueryData(['timerboards'])
      
      // Optimistically add the new timerboard (with temporary ID)
      const optimisticTimerboard = {
        id: `temp-${Date.now()}`,
        name: name.trim(),
        description: description?.trim() || null,
        role: 'ADMIN',
        timerCount: 0
      }
      
      queryClient.setQueryData(['timerboards'], (old: any[]) => {
        if (!old) return [optimisticTimerboard]
        return [...old, optimisticTimerboard]
      })
      
      return { previousTimerboards }
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousTimerboards) {
        queryClient.setQueryData(['timerboards'], context.previousTimerboards)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timerboards'] })
    },
  })

  const deleteTimerboard = useMutation({
    mutationFn: async (timerboardId: string) => {
      const response = await fetch(`/api/timerboards/${timerboardId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete timerboard')
      }
      return response.json()
    },
    onMutate: async (timerboardId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timerboards'] })
      
      // Snapshot the previous value
      const previousTimerboards = queryClient.getQueryData(['timerboards'])
      
      // Optimistically remove the timerboard
      queryClient.setQueryData(['timerboards'], (old: any[]) => {
        if (!old) return old
        return old.filter((board: any) => board.id !== timerboardId)
      })
      
      return { previousTimerboards }
    },
    onError: (err, timerboardId, context) => {
      // Revert the optimistic update on error
      if (context?.previousTimerboards) {
        queryClient.setQueryData(['timerboards'], context.previousTimerboards)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timerboards'] })
    },
  })

  const addUser = useMutation({
    mutationFn: async ({ timerboardId, characterName, role }: { 
      timerboardId: string; 
      characterName: string; 
      role: string 
    }) => {
      const response = await fetch(`/api/timerboards/${timerboardId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterName: characterName.trim(),
          role,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user')
      }
      return data
    },
    onMutate: async ({ timerboardId, characterName, role }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timerboard-users', timerboardId] })
      
      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(['timerboard-users', timerboardId])
      
      // Optimistically add the new user
      queryClient.setQueryData(['timerboard-users', timerboardId], (old: any[]) => {
        if (!old) return [{ characterName, role, isAdmin: false }]
        return [...old, { characterName, role, isAdmin: false }]
      })
      
      return { previousUsers }
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousUsers) {
        queryClient.setQueryData(['timerboard-users', variables.timerboardId], context.previousUsers)
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timerboard-users', variables.timerboardId] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs', variables.timerboardId] })
    },
  })

  const removeUser = useMutation({
    mutationFn: async ({ timerboardId, characterName }: { 
      timerboardId: string; 
      characterName: string 
    }) => {
      const response = await fetch(`/api/timerboards/${timerboardId}/users`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterName,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove user')
      }
      return data
    },
    onMutate: async ({ timerboardId, characterName }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timerboard-users', timerboardId] })
      
      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData(['timerboard-users', timerboardId])
      
      // Optimistically remove the user
      queryClient.setQueryData(['timerboard-users', timerboardId], (old: any[]) => {
        if (!old) return old
        return old.filter((user: any) => user.characterName !== characterName)
      })
      
      return { previousUsers }
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousUsers) {
        queryClient.setQueryData(['timerboard-users', variables.timerboardId], context.previousUsers)
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timerboard-users', variables.timerboardId] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs', variables.timerboardId] })
    },
  })

  return {
    deleteTimer,
    repairTimer,
    createTimerboard,
    deleteTimerboard,
    addUser,
    removeUser,
  }
}