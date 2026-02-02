'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AddTimerModal } from '@/components/timers/add-timer-modal'
import { CampaignsSection } from '@/components/sovereignty/campaigns-section'
import { CorporationsSection } from '@/components/timerboards/corporations-section'
import { 
  useTimerboards, 
  useTimerboard, 
  useTimerboardUsers, 
  useTimerboardStatistics, 
  useAuditLogs, 
  useCampaigns, 
  useTimerboardMutations,
  type Timer,
  type Timerboard,
  type TimerboardData
} from '@/hooks/useTimerboards'
import { LoadingSpinner, InlineLoading } from '@/components/ui/loading-spinner'
import { LiveIndicator, RefreshingIndicator } from '@/components/ui/live-indicator'
import { ToastContainer, useToast } from '@/components/ui/toast'

interface TimerboardSelectionProps {
  timerboards: any[]
  onSelectTimerboard: (id: string) => void
  isAdmin: boolean
  isLoading: boolean
  toast: any
}

function TimerboardSelection({ timerboards, onSelectTimerboard, isAdmin, isLoading, toast }: TimerboardSelectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTimerboardName, setNewTimerboardName] = useState('')
  const [newTimerboardDescription, setNewTimerboardDescription] = useState('')
  const [createError, setCreateError] = useState('')
  
  const { createTimerboard, deleteTimerboard } = useTimerboardMutations()
  
  const handleCreateTimerboard = async () => {
    if (!newTimerboardName.trim()) {
      setCreateError('Name is required')
      return
    }
    
    setCreateError('')

    try {
      await createTimerboard.mutateAsync({
        name: newTimerboardName,
        description: newTimerboardDescription || undefined,
      })
      setNewTimerboardName('')
      setNewTimerboardDescription('')
      setShowCreateModal(false)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create timerboard')
    }
  }

  const handleDeleteTimerboard = async (timerboardId: string, timerboardName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${timerboardName}"? This will delete all associated timers and cannot be undone.`)) {
      return
    }

    try {
      await deleteTimerboard.mutateAsync(timerboardId)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete timerboard')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Select a Timerboard</h2>
        <p className="text-gray-400">
          Choose a timerboard to view and manage structure timers.
        </p>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="flex justify-center">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Create New Timerboard
          </button>
        </div>
      )}

      {/* Timerboards Grid */}
      {isLoading ? (
        <InlineLoading message="Loading timerboards..." />
      ) : timerboards.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-4">No Timerboards Available</h3>
          <p className="text-gray-400">
            {isAdmin 
              ? "Create your first timerboard to get started." 
              : "Ask an admin to add you to a timerboard."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {timerboards.map((board) => (
            <div 
              key={board.id} 
              className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-green-500 transition-colors cursor-pointer"
              onClick={() => onSelectTimerboard(board.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">{board.name}</h3>
                  {board.description && (
                    <p className="text-gray-400 text-sm mb-3">{board.description}</p>
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTimerboard(board.id, board.name)
                    }}
                    className="text-red-400 hover:text-red-300 text-sm ml-2"
                    title="Delete timerboard"
                  >
                    Delete
                  </button>
                )}
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">
                  {board.timerCount} timer{board.timerCount !== 1 ? 's' : ''}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  board.role === 'ADMIN' ? 'bg-blue-600 text-white' :
                  board.role === 'MODERATOR' ? 'bg-green-600 text-white' :
                  'bg-yellow-600 text-white'
                }`}>
                  {board.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Timerboard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-green-400">Create New Timerboard</h2>
              <button 
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateError('')
                  setNewTimerboardName('')
                  setNewTimerboardDescription('')
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            {createError && (
              <div className="bg-red-600 text-white p-3 rounded mb-4">
                {createError}
              </div>
            )}

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Name *</span>
                <input
                  type="text"
                  value={newTimerboardName}
                  onChange={(e) => setNewTimerboardName(e.target.value)}
                  placeholder="Enter timerboard name"
                  className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  disabled={createTimerboard.isPending}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  value={newTimerboardDescription}
                  onChange={(e) => setNewTimerboardDescription(e.target.value)}
                  placeholder="Enter timerboard description (optional)"
                  rows={3}
                  className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  disabled={createTimerboard.isPending}
                />
              </label>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateTimerboard}
                  disabled={createTimerboard.isPending || !newTimerboardName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded font-medium"
                >
                  {createTimerboard.isPending ? 'Creating...' : 'Create Timerboard'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateError('')
                    setNewTimerboardName('')
                    setNewTimerboardDescription('')
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded"
                  disabled={createTimerboard.isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function formatTimeUntil(timer: Timer, isPast: boolean = false): string {
  const now = new Date()
  const expiresAt = new Date(timer.expiresAt)
  const activeUntil = timer.activeUntil ? new Date(timer.activeUntil) : null
  
  // Check if timer has expired but is still in active window
  if (!isPast && activeUntil && expiresAt <= now && now <= activeUntil) {
    return 'Active Now'
  }
  
  // For past timers, calculate time since active window ended
  const targetDate = isPast ? (activeUntil || expiresAt) : expiresAt
  const diffMs = Math.abs(targetDate.getTime() - now.getTime())
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h ${diffMinutes % 60}m`
  } else if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes % 60}m`
  } else {
    return `${diffMinutes}m`
  }
}

function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function formatStructureType(structureType: string): string {
  return structureType.replace(/_/g, ' ').toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase())
}

function isTimerDestroyed(timer: Timer): boolean {
  return timer.isDestroyed
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedTimerboardId, setSelectedTimerboardId] = useState<string | null>(null)
  const [showAddTimer, setShowAddTimer] = useState(false)
  const [showPastTimers, setShowPastTimers] = useState(false)
  const [showManageBoard, setShowManageBoard] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState('USER')
  const [userManagementError, setUserManagementError] = useState('')
  const [showDestroyModal, setShowDestroyModal] = useState(false)
  const [selectedTimerForDestroy, setSelectedTimerForDestroy] = useState<string | null>(null)
  const [zkillboardLink, setZkillboardLink] = useState('')
  const [destroyError, setDestroyError] = useState('')
  
  // React Query hooks
  const timerboardsQuery = useTimerboards()
  const timerboardQuery = useTimerboard(selectedTimerboardId)
  const timerboardUsersQuery = useTimerboardUsers(showManageBoard ? selectedTimerboardId : null)
  const statisticsQuery = useTimerboardStatistics(showManageBoard ? selectedTimerboardId : null)
  const auditLogsQuery = useAuditLogs(showManageBoard ? selectedTimerboardId : null)
  const { regions, campaigns, campaignsLoading } = useCampaigns(selectedTimerboardId)
  
  // Mutations
  const { deleteTimer, repairTimer, destroyTimer, addUser, removeUser } = useTimerboardMutations()
  
  // Toast notifications
  const toast = useToast()
  
  // Extracted data
  const timerboards = timerboardsQuery.data || []
  const selectedTimerboard = timerboardQuery.data
  const timerboardUsers = timerboardUsersQuery.data || []
  const statistics = statisticsQuery.data
  const auditLogs = auditLogsQuery.data || []
  const loading = timerboardQuery.isLoading

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  const handleSelectTimerboard = (id: string) => {
    setSelectedTimerboardId(id)
  }
  
  const handleBackToTimerboards = () => {
    setSelectedTimerboardId(null)
    setShowManageBoard(false)
    setShowPastTimers(false)
  }

  const handleManualRepair = async (timerId: string) => {
    try {
      await repairTimer.mutateAsync(timerId)
      toast.success('Timer repaired successfully')
    } catch (error) {
      toast.error('Failed to repair timer', error instanceof Error ? error.message : 'Unknown error')
      console.error('Error repairing timer:', error)
    }
  }

  const handleDeleteTimer = async (timerId: string) => {
    if (!confirm('Are you sure you want to permanently delete this timer? This action cannot be undone.')) {
      return
    }

    try {
      await deleteTimer.mutateAsync(timerId)
      toast.success('Timer deleted successfully')
    } catch (error) {
      toast.error('Failed to delete timer', error instanceof Error ? error.message : 'Unknown error')
      console.error('Error deleting timer:', error)
    }
  }

  const handleDestroyTimerClick = (timerId: string) => {
    setSelectedTimerForDestroy(timerId)
    setShowDestroyModal(true)
    setZkillboardLink('')
    setDestroyError('')
  }

  const handleDestroyTimer = async () => {
    if (!selectedTimerForDestroy || !zkillboardLink.trim()) {
      setDestroyError('zkillboard link is required')
      return
    }

    setDestroyError('')

    try {
      await destroyTimer.mutateAsync({
        timerId: selectedTimerForDestroy,
        zkillboardLink: zkillboardLink.trim()
      })
      toast.success('Timer marked as destroyed')
      setShowDestroyModal(false)
      setSelectedTimerForDestroy(null)
      setZkillboardLink('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to destroy timer'
      setDestroyError(errorMessage)
      toast.error('Failed to destroy timer', errorMessage)
    }
  }


  const handleAddUser = async () => {
    if (!newUserName.trim() || !selectedTimerboardId) return
    
    setUserManagementError('')

    try {
      await addUser.mutateAsync({
        timerboardId: selectedTimerboardId,
        characterName: newUserName,
        role: newUserRole,
      })
      setNewUserName('')
      setNewUserRole('USER')
      toast.success(`Added ${newUserName} to timerboard`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add user'
      setUserManagementError(errorMessage)
      toast.error('Failed to add user', errorMessage)
    }
  }

  const handleRemoveUser = async (characterName: string) => {
    if (!confirm(`Are you sure you want to remove "${characterName}" from this timerboard?`)) {
      return
    }

    if (!selectedTimerboardId) return

    try {
      await removeUser.mutateAsync({
        timerboardId: selectedTimerboardId,
        characterName,
      })
      toast.success(`Removed ${characterName} from timerboard`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove user'
      toast.error('Failed to remove user', errorMessage)
    }
  }


  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-400 border-t-transparent"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Timerboard</h2>
        <p className="text-gray-400 mb-8">
          Sign in with your EVE Online character to access timer boards and manage structure timers.
        </p>
      </div>
    )
  }

  // Show timerboard selection interface
  if (!selectedTimerboard && !loading) {
    return (
      <TimerboardSelection 
        timerboards={timerboards} 
        onSelectTimerboard={handleSelectTimerboard}
        isAdmin={(session?.user as any)?.isAdmin || false}
        isLoading={timerboardsQuery.isLoading}
        toast={toast}
      />
    )
  }

  // Convert campaigns to unified timer format for sorting
  const campaignTimers = campaigns.map(campaign => ({
    id: `campaign-${campaign.campaign_id}`,
    expiresAt: campaign.start_time,
    isCampaign: true,
    campaign: campaign
  }))
  
  const regularTimers = selectedTimerboard ? selectedTimerboard.timers.map(timer => ({
    ...timer,
    isCampaign: false
  })) : []
  
  // Combine and sort all events by time
  const allEvents = [...regularTimers, ...campaignTimers]
  
  const upcomingEvents = allEvents
    .filter(event => {
      if (event.isCampaign) {
        const startTime = new Date(event.expiresAt)
        return startTime > currentTime ||
               (startTime <= currentTime &&
                event.campaign.attackers_score !== undefined &&
                event.campaign.defender_score !== undefined)
      }
      const expiredTime = new Date(event.expiresAt)
      const activeUntil = event.activeUntil ? new Date(event.activeUntil) : expiredTime
      return activeUntil > currentTime
    })
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())

  const pastEvents = allEvents
    .filter(event => {
      if (event.isCampaign) {
        const startTime = new Date(event.expiresAt)
        // Campaign is "past" if:
        // 1. It has started AND has no active scores (finished or inactive)
        return startTime <= currentTime &&
               (event.campaign.attackers_score === undefined ||
                event.campaign.defender_score === undefined)
      }
      const expiredTime = new Date(event.expiresAt)
      const activeUntil = event.activeUntil ? new Date(event.activeUntil) : expiredTime
      return activeUntil <= currentTime
    })
    .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())
  
  const totalUpcomingCount = upcomingEvents.length
  const totalPastCount = pastEvents.length
  
  if (loading) {
    return <InlineLoading message="Loading timerboard..." />
  }

  return (
    <div className="space-y-6">
      {/* Timerboard Header */}
      {selectedTimerboard && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <button 
                  onClick={handleBackToTimerboards}
                  className="text-green-400 hover:text-green-300 text-sm"
                >
                  ← Back to Timerboards
                </button>
              </div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-green-400">{selectedTimerboard.timerboard.name}</h2>
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium uppercase">
                  {selectedTimerboard.timerboard.userRole}
                </span>
              </div>
              <p className="text-gray-400 mt-1">{selectedTimerboard.timerboard.description}</p>
            </div>
            <div className="text-right text-sm text-gray-400">
              <div className="flex items-center justify-end space-x-3 mb-1">
                <LiveIndicator 
                  isLive={!timerboardQuery.isError} 
                  lastUpdated={timerboardQuery.dataUpdatedAt ? new Date(timerboardQuery.dataUpdatedAt) : undefined}
                />
                <RefreshingIndicator isRefreshing={timerboardQuery.isFetching} />
              </div>
              <div>Current Time (UTC)</div>
              <div className="font-mono text-white">{formatDateTime(currentTime)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button 
          onClick={() => setShowAddTimer(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          Add New Timer
        </button>
        <button 
          onClick={() => {
            setShowPastTimers(!showPastTimers && !showManageBoard)
            setShowManageBoard(false)
          }}
          className={`px-6 py-2 rounded-lg font-medium ${
            showPastTimers && !showManageBoard
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          {showPastTimers && !showManageBoard ? 'View Upcoming Timers' : 'View Past Timers'}
        </button>
        {selectedTimerboard && (selectedTimerboard.timerboard.userRole === 'ADMIN' || selectedTimerboard.timerboard.userRole === 'MODERATOR') && (
          <button 
            onClick={() => {
              setShowManageBoard(!showManageBoard)
              setShowPastTimers(false)
            }}
            className={`px-6 py-2 rounded-lg font-medium ${
              showManageBoard
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            Manage Board
          </button>
        )}
      </div>
      
      {/* Main Content Area */}
      {showManageBoard ? (
        /* Manage Board Interface */
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-green-400">Board Management</h3>
          </div>
          <div className="p-6 space-y-6">
            {/* User Management Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold">User Management</h4>
                <RefreshingIndicator isRefreshing={timerboardUsersQuery.isFetching && !timerboardUsersQuery.isLoading} />
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-4">
                  Add users to this timerboard by entering their EVE character name
                </p>
                {userManagementError && (
                  <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-300 text-sm">
                    {userManagementError}
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      placeholder="Enter EVE character name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      disabled={addUser.isPending}
                    />
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      disabled={addUser.isPending}
                    >
                      <option value="USER">User</option>
                      {(selectedTimerboard?.timerboard.userRole === 'ADMIN' || selectedTimerboard?.timerboard.userRole === 'MODERATOR') && (
                        <option value="MODERATOR">Moderator</option>
                      )}
                    </select>
                    <button 
                      onClick={handleAddUser}
                      disabled={addUser.isPending || !newUserName.trim()}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded"
                    >
                      {addUser.isPending ? 'Adding...' : 'Add User'}
                    </button>
                  </div>
                </div>
                
                {/* Current Users List */}
                {timerboardUsers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h5 className="text-sm font-medium text-gray-300 mb-3">Current Users ({timerboardUsers.length})</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {timerboardUsers.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm">
                          <span className="text-white">{user.characterName}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.isAdmin ? 'bg-blue-600 text-white' :
                              user.role === 'MODERATOR' ? 'bg-green-600 text-white' :
                              'bg-yellow-600 text-white'
                            }`}>
                              {user.isAdmin ? 'ADMIN' : user.role}
                            </span>
                            {/* Show remove button for moderators/admins, but not for self or site admins */}
                            {selectedTimerboard && 
                             (selectedTimerboard.timerboard.userRole === 'ADMIN' || selectedTimerboard.timerboard.userRole === 'MODERATOR') && 
                             user.characterName !== session?.user?.name && 
                             !user.isAdmin && (
                              <button
                                onClick={() => handleRemoveUser(user.characterName)}
                                className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                                title={`Remove ${user.characterName} from timerboard`}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Corporation Access Section */}
            <CorporationsSection
              timerboardId={selectedTimerboard?.timerboard.id || ''}
              isModeratorOrAdmin={selectedTimerboard?.timerboard.userRole === 'ADMIN' || selectedTimerboard?.timerboard.userRole === 'MODERATOR'}
              toast={toast}
            />

            {/* Role Management Section */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold">Role Management</h4>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-4">
                  Manage user roles on this timerboard
                </p>
                <div className="text-gray-400">
                  <div className="mb-2">• <span className="text-blue-400">ADMIN</span> - Full access to all timerboards</div>
                  <div className="mb-2">• <span className="text-green-400">MODERATOR</span> - Can add/delete timers and manage users</div>
                  <div>• <span className="text-yellow-400">USER</span> - Can view and add timers</div>
                </div>
              </div>
            </div>

            {/* Statistics Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold">Statistics</h4>
                <RefreshingIndicator isRefreshing={statisticsQuery.isFetching && !statisticsQuery.isLoading} />
              </div>
              {statisticsQuery.isLoading ? (
                <InlineLoading message="Loading statistics..." />
              ) : statistics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-400 mb-2">Timers This Month</h5>
                      <div className="text-2xl font-bold text-green-400">
                        {statistics.timersThisMonth}
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-400 mb-2">Total Timers</h5>
                      <div className="text-2xl font-bold text-blue-400">
                        {statistics.totalTimers}
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-400 mb-2">Active Users</h5>
                      <div className="text-2xl font-bold text-purple-400">
                        {statistics.activeUsersCount}
                      </div>
                    </div>
                  </div>
                  
                  {/* User Statistics */}
                  {statistics.userStats.length > 0 && (
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-400 mb-3">Top Contributors This Month</h5>
                      <div className="space-y-2">
                        {statistics.userStats.slice(0, 5).map((user: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-white">{user.characterName}</span>
                            <span className="text-green-400 font-medium">{user.timerCount} timers</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Structure Type Breakdown */}
                  {statistics.structureStats.length > 0 && (
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-400 mb-3">Structure Types This Month</h5>
                      <div className="space-y-2">
                        {statistics.structureStats.map((structure: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-white">{structure.structureType}</span>
                            <span className="text-blue-400 font-medium">{structure.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg p-4 text-gray-400 text-center">
                  No statistics available
                </div>
              )}
            </div>

            {/* Sovereignty Campaigns Region Management */}
            <CampaignsSection 
              timerboardId={selectedTimerboard?.timerboard.id || ''}
              isModeratorOrAdmin={selectedTimerboard?.timerboard.userRole === 'ADMIN' || selectedTimerboard?.timerboard.userRole === 'MODERATOR'}
            />

            {/* Audit Log Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold">Recent Activity</h4>
                <RefreshingIndicator isRefreshing={auditLogsQuery.isFetching && !auditLogsQuery.isLoading} />
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                {auditLogs.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="text-sm border-b border-gray-700 pb-2 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="text-white font-medium">{log.characterName}</span>
                            <span className="text-gray-400 ml-2">
                              {log.action === 'TIMER_ADDED' && 'added timer'}
                              {log.action === 'TIMER_DELETED' && 'deleted timer'}
                              {log.action === 'TIMER_REPAIRED' && 'repaired timer'}
                              {log.action === 'TIMER_DESTROYED' && 'destroyed timer'}
                              {log.action === 'USER_ADDED' && 'added user'}
                              {log.action === 'USER_REMOVED' && 'removed user'}
                              {log.action === 'UPDATE_REGIONS' && 'updated regions'}
                              {log.action === 'CORPORATION_ADDED' && 'added corporation'}
                              {log.action === 'CORPORATION_REMOVED' && 'removed corporation'}
                              {log.action === 'CORPORATION_ROLE_UPDATED' && 'updated corporation role'}
                            </span>
                            {log.details && (
                              <div className="text-gray-400 text-xs mt-1">
                                {log.action === 'TIMER_ADDED' && log.details.structureType && (
                                  <span>
                                    {log.details.structureType.replace(/_/g, ' ').toLowerCase()
                                      .replace(/\b\w/g, (l: string) => l.toUpperCase())} 
                                    ({log.details.system} - {log.details.location})
                                  </span>
                                )}
                                {log.action === 'USER_ADDED' && log.details.addedUserName && (
                                  <span>User: {log.details.addedUserName}</span>
                                )}
                                {log.action === 'USER_REMOVED' && log.details.removedUserName && (
                                  <span>User: {log.details.removedUserName}</span>
                                )}
                                {log.action === 'UPDATE_REGIONS' && log.details && (
                                  <span>Regions: {log.details.regions?.join(', ') || 'N/A'}</span>
                                )}
                                {(log.action === 'CORPORATION_ADDED' || log.action === 'CORPORATION_REMOVED' || log.action === 'CORPORATION_ROLE_UPDATED') && log.details?.corporationName && (
                                  <span>Corporation: {log.details.corporationName}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 ml-4">
                            {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm text-center py-4">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Timer List */
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {showPastTimers 
                  ? `Past Events (${totalPastCount})`
                  : `Upcoming Events (${totalUpcomingCount})`
                }
              </h3>
              <div className="flex items-center space-x-3">
                {campaignsLoading && (
                  <div className="flex items-center space-x-2 text-purple-400">
                    <LoadingSpinner size="small" />
                    <span className="text-xs">Updating campaigns...</span>
                  </div>
                )}
                <RefreshingIndicator isRefreshing={timerboardQuery.isFetching} />
              </div>
            </div>
          </div>
          
          {totalUpcomingCount === 0 && totalPastCount === 0 && !campaignsLoading ? (
            <div className="text-center py-12 text-gray-400">
              {showPastTimers ? 'No past events' : 'No upcoming events'}
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {(showPastTimers ? pastEvents : upcomingEvents).map((event) => {
                if (event.isCampaign) {
                  // Render campaign event
                  const campaign = event.campaign
                  const formatEventType = (eventType: string): string => {
                    return eventType.replace(/_/g, ' ').toLowerCase()
                      .replace(/\b\w/g, l => l.toUpperCase())
                  }
                  
                  const getTimeUntilCampaign = (): string => {
                    const startTime = new Date(campaign.start_time)
                    const diffMs = Math.abs(startTime.getTime() - currentTime.getTime())
                    
                    if (!showPastTimers && startTime.getTime() <= currentTime.getTime()) {
                      return 'Active Now'
                    }
                    
                    const diffMinutes = Math.floor(diffMs / (1000 * 60))
                    const diffHours = Math.floor(diffMinutes / 60)
                    const diffDays = Math.floor(diffHours / 24)
                    
                    if (diffDays > 0) {
                      return `${diffDays}d ${diffHours % 24}h ${diffMinutes % 60}m`
                    } else if (diffHours > 0) {
                      return `${diffHours}h ${diffMinutes % 60}m`
                    } else {
                      return `${diffMinutes}m`
                    }
                  }
                  
                  const isCampaignActive = (): boolean => {
                    const startTime = new Date(campaign.start_time)
                    // Only show as active if campaign has started AND we're in upcoming events (not past events)
                    return startTime.getTime() <= currentTime.getTime() && !showPastTimers
                  }
                  
                  const getScoreDisplay = (): JSX.Element | null => {
                    if (!isCampaignActive() || campaign.attackers_score === undefined || campaign.defender_score === undefined) {
                      return null
                    }

                    const attackerPercentage = Math.round(campaign.attackers_score * 100)
                    const defenderPercentage = Math.round(campaign.defender_score * 100)
                    const attackerWinning = campaign.attackers_score > campaign.defender_score
                    const defenderWinning = campaign.defender_score > campaign.attackers_score

                    return (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${attackerWinning ? 'text-red-400' : 'text-red-300'}`}>
                            Attackers: {attackerPercentage}%
                          </span>
                          <span className={`font-medium ${defenderWinning ? 'text-green-400' : 'text-green-300'}`}>
                            Defenders: {defenderPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div className="h-full flex">
                            <div
                              className="bg-red-500 transition-all duration-500"
                              style={{ width: `${attackerPercentage}%` }}
                            />
                            <div
                              className="bg-green-500 transition-all duration-500"
                              style={{ width: `${defenderPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <div key={event.id} className="p-4 hover:bg-gray-750 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-4">
                            <span className="font-mono text-sm text-gray-300 bg-gray-900 px-2 py-1 rounded">
                              {formatDateTime(new Date(campaign.start_time))}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">
                                {formatEventType("Sov Campaign")}
                              </span>
                              <span className="text-gray-300">
                                ({campaign.solar_system_name || `System ${campaign.solar_system_id}`})
                              </span>
                              {campaign.region_name && (
                                <span className="text-gray-400">[{campaign.region_name}]</span>
                              )}
                              {campaign.defender_name && (
                                <span className="text-blue-400 font-medium">
                                  [{campaign.defender_name}]
                                </span>
                              )}
                              <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs font-medium">
                                ENTOSIS
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <span>Campaign #{campaign.campaign_id}</span>
                            {isCampaignActive() && (
                              <span className="text-purple-400 font-medium uppercase tracking-wide">ACTIVE</span>
                            )}
                          </div>
                          
                          {getScoreDisplay()}
                        </div>
                        
                        <div className="text-right ml-4 flex flex-col items-end space-y-2">
                          <div className={`font-bold text-lg ${
                            showPastTimers ? 'text-red-400' : (
                              getTimeUntilCampaign() === 'Active Now' ? 'text-purple-400' : 'text-green-400'
                            )
                          }`}>
                            {getTimeUntilCampaign()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {showPastTimers ? 'ago' : (getTimeUntilCampaign() === 'Active Now' ? '' : 'from now')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                } else {
                  // Render regular timer event
                  const timer = event
                  return (
                    <div key={timer.id} className="p-4 hover:bg-gray-750 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-4">
                            <span className="font-mono text-sm text-gray-300 bg-gray-900 px-2 py-1 rounded">
                              {formatDateTime(new Date(timer.expiresAt))}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-medium">
                                {formatStructureType(timer.structureType)}
                              </span>
                              <span className="text-gray-300">
                                ({timer.system} [{timer.region || 'Unknown'}] {timer.location})
                              </span>
                              <span className="text-blue-400 font-medium">
                                [{timer.owner}]
                              </span>
                              {timer.layer && (
                                <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-medium">
                                  {timer.layer}
                                </span>
                              )}
                              {showPastTimers && !isTimerDestroyed(timer) && (
                                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-medium">
                                  REPAIRED
                                </span>
                              )}
                              {showPastTimers && isTimerDestroyed(timer) && (
                                <div className="flex items-center space-x-2">
                                  <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-medium">
                                    DESTROYED
                                  </span>
                                  {timer.zkillboardId && (
                                    <a
                                      href={`https://zkillboard.com/kill/${timer.zkillboardId}/`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-gray-700 hover:bg-gray-600 text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded text-xs font-medium transition-colors"
                                      title="View kill on zkillboard"
                                    >
                                      zkillboard
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <span>Added by: {timer.addedBy}</span>
                            {timer.notes && (
                              <span className="italic">&quot;{timer.notes}&quot;</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4 flex flex-col items-end space-y-2">
                          <div className={`font-bold text-lg ${
                            showPastTimers ? 'text-red-400' : (formatTimeUntil(timer, showPastTimers) === 'Active Now' ? 'text-orange-400' : 'text-green-400')
                          }`}>
                            {formatTimeUntil(timer, showPastTimers)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {showPastTimers ? 'ago' : 'from now'}
                          </div>
                          <div className="flex space-x-2">
                            {/* Manual Repair Button - only show for Jump Bridges and Mercenary Dens during active window and for moderators/admins */}
                            {!showPastTimers && formatTimeUntil(timer, showPastTimers) === 'Active Now' && 
                              (timer.structureType === 'JUMP_BRIDGE' || timer.structureType === 'MERCENARY_DEN') &&
                              selectedTimerboard && (selectedTimerboard.timerboard.userRole === 'ADMIN' || selectedTimerboard.timerboard.userRole === 'MODERATOR') && (
                              <button
                                onClick={() => handleManualRepair(timer.id)}
                                disabled={repairTimer.isPending}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center space-x-1"
                              >
                                {repairTimer.isPending && repairTimer.variables === timer.id ? (
                                  <LoadingSpinner size="small" />
                                ) : (
                                  <span>Repaired</span>
                                )}
                              </button>
                            )}
                            {/* Destroyed Button - only show for active or past timers and for all users */}
                            {selectedTimerboard && !isTimerDestroyed(timer) && new Date(timer.expiresAt) <= currentTime && (
                              <button
                                onClick={() => handleDestroyTimerClick(timer.id)}
                                disabled={destroyTimer.isPending}
                                className="bg-red-700 hover:bg-red-800 disabled:bg-gray-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center space-x-1"
                                title="Mark timer as destroyed with zkillboard link"
                              >
                                {destroyTimer.isPending && destroyTimer.variables?.timerId === timer.id ? (
                                  <LoadingSpinner size="small" />
                                ) : (
                                  <span>Destroyed</span>
                                )}
                              </button>
                            )}
                            {/* Delete Button - only show for moderators and admins */}
                            {selectedTimerboard && (selectedTimerboard.timerboard.userRole === 'ADMIN' || selectedTimerboard.timerboard.userRole === 'MODERATOR') && (
                              <button
                                onClick={() => handleDeleteTimer(timer.id)}
                                disabled={deleteTimer.isPending}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-xs font-medium flex items-center space-x-1"
                                title="Delete timer permanently"
                              >
                                {deleteTimer.isPending && deleteTimer.variables === timer.id ? (
                                  <LoadingSpinner size="small" />
                                ) : (
                                  <span>Delete</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Timer Modal */}
      {selectedTimerboard && (
        <AddTimerModal
          isOpen={showAddTimer}
          onClose={() => setShowAddTimer(false)}
          timerboardId={selectedTimerboard.timerboard.id}
          toast={toast}
          onTimerAdded={() => {
            // React Query will automatically refetch
          }}
        />
      )}

      {/* Destroy Timer Modal */}
      {showDestroyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-red-400">Mark Timer as Destroyed</h2>
              <button
                onClick={() => {
                  setShowDestroyModal(false)
                  setSelectedTimerForDestroy(null)
                  setZkillboardLink('')
                  setDestroyError('')
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            {destroyError && (
              <div className="bg-red-600 text-white p-3 rounded mb-4">
                {destroyError}
              </div>
            )}

            <div className="space-y-4">
              <div className="text-sm text-gray-300">
                <p className="mb-2">Enter the zkillboard link for the kill that destroyed this structure.</p>
                <p className="text-gray-400 text-xs">Example: https://zkillboard.com/kill/130099527/</p>
              </div>

              <label className="block">
                <span className="text-sm font-medium">zkillboard Link *</span>
                <input
                  type="url"
                  value={zkillboardLink}
                  onChange={(e) => setZkillboardLink(e.target.value)}
                  placeholder="https://zkillboard.com/kill/..."
                  className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  disabled={destroyTimer.isPending}
                />
              </label>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleDestroyTimer}
                  disabled={destroyTimer.isPending || !zkillboardLink.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 px-4 rounded font-medium"
                >
                  {destroyTimer.isPending ? 'Marking as Destroyed...' : 'Mark as Destroyed'}
                </button>
                <button
                  onClick={() => {
                    setShowDestroyModal(false)
                    setSelectedTimerForDestroy(null)
                    setZkillboardLink('')
                    setDestroyError('')
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded"
                  disabled={destroyTimer.isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer 
        toasts={toast.toasts} 
        onRemoveToast={toast.removeToast} 
      />
    </div>
  )
}