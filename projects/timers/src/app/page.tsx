'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { AddTimerModal } from '@/components/timers/add-timer-modal'

interface TimerboardSelectionProps {
  timerboards: any[]
  onSelectTimerboard: (id: string) => void
  isAdmin: boolean
  onTimerboardsUpdated: () => void
}

function TimerboardSelection({ timerboards, onSelectTimerboard, isAdmin, onTimerboardsUpdated }: TimerboardSelectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTimerboardName, setNewTimerboardName] = useState('')
  const [newTimerboardDescription, setNewTimerboardDescription] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  
  const handleCreateTimerboard = async () => {
    if (!newTimerboardName.trim()) {
      setCreateError('Name is required')
      return
    }
    
    setCreateLoading(true)
    setCreateError('')

    try {
      const response = await fetch('/api/timerboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTimerboardName.trim(),
          description: newTimerboardDescription.trim() || null,
        }),
      })

      if (response.ok) {
        setNewTimerboardName('')
        setNewTimerboardDescription('')
        setShowCreateModal(false)
        onTimerboardsUpdated()
      } else {
        const errorData = await response.json()
        setCreateError(errorData.error || 'Failed to create timerboard')
      }
    } catch (error) {
      setCreateError('Failed to create timerboard')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteTimerboard = async (timerboardId: string, timerboardName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${timerboardName}"? This will delete all associated timers and cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/timerboards/${timerboardId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onTimerboardsUpdated()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to delete timerboard')
      }
    } catch (error) {
      alert('Failed to delete timerboard')
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
      {timerboards.length === 0 ? (
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
                  disabled={createLoading}
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
                  disabled={createLoading}
                />
              </label>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateTimerboard}
                  disabled={createLoading || !newTimerboardName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded font-medium"
                >
                  {createLoading ? 'Creating...' : 'Create Timerboard'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateError('')
                    setNewTimerboardName('')
                    setNewTimerboardDescription('')
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded"
                  disabled={createLoading}
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

interface Timer {
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
  addedBy: string
  createdAt: string
}

interface Timerboard {
  id: string
  name: string
  description: string | null
  userRole: string
}

interface TimerboardData {
  timerboard: Timerboard
  timers: Timer[]
}

function formatTimeUntil(timer: Timer, isPast: boolean = false): string {
  const now = new Date()
  const expiresAt = new Date(timer.expiresAt)
  const activeUntil = timer.activeUntil ? new Date(timer.activeUntil) : null
  
  // If timer has expired but is still in active window, show "Active Now"
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

export default function HomePage() {
  const { data: session, status } = useSession()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [timerboards, setTimerboards] = useState<any[]>([])
  const [selectedTimerboard, setSelectedTimerboard] = useState<TimerboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAddTimer, setShowAddTimer] = useState(false)
  const [showPastTimers, setShowPastTimers] = useState(false)
  const [showManageBoard, setShowManageBoard] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState('USER')
  const [timerboardUsers, setTimerboardUsers] = useState<any[]>([])
  const [userManagementLoading, setUserManagementLoading] = useState(false)
  const [userManagementError, setUserManagementError] = useState('')
  const [statistics, setStatistics] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [statisticsLoading, setStatisticsLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTimerboards()
    }
  }, [status])

  const fetchTimerboards = async () => {
    try {
      const response = await fetch('/api/timerboards')
      if (response.ok) {
        const boards = await response.json()
        setTimerboards(boards)
        // Don't auto-select timerboard - let user choose
      }
    } catch (error) {
      console.error('Error fetching timerboards:', error)
    }
  }

  const fetchTimerboard = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/timerboards/${id}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedTimerboard(data)
      }
    } catch (error) {
      console.error('Error fetching timerboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualRepair = async (timerId: string) => {
    try {
      const response = await fetch(`/api/timers/${timerId}/repair`, {
        method: 'POST',
      })
      
      if (response.ok) {
        // Refresh timerboard data to update the display
        if (selectedTimerboard) {
          fetchTimerboard(selectedTimerboard.timerboard.id)
        }
      } else {
        console.error('Failed to repair timer')
      }
    } catch (error) {
      console.error('Error repairing timer:', error)
    }
  }

  const handleDeleteTimer = async (timerId: string) => {
    if (!confirm('Are you sure you want to permanently delete this timer? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/timers/${timerId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // Refresh timerboard data to update the display
        if (selectedTimerboard) {
          fetchTimerboard(selectedTimerboard.timerboard.id)
        }
      } else {
        console.error('Failed to delete timer')
      }
    } catch (error) {
      console.error('Error deleting timer:', error)
    }
  }

  const fetchTimerboardUsers = async () => {
    if (!selectedTimerboard) return
    
    try {
      const response = await fetch(`/api/timerboards/${selectedTimerboard.timerboard.id}/users`)
      if (response.ok) {
        const data = await response.json()
        setTimerboardUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching timerboard users:', error)
    }
  }

  const fetchStatistics = async () => {
    if (!selectedTimerboard) return
    
    setStatisticsLoading(true)
    try {
      const response = await fetch(`/api/timerboards/${selectedTimerboard.timerboard.id}/statistics`)
      if (response.ok) {
        const data = await response.json()
        setStatistics(data)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setStatisticsLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    if (!selectedTimerboard) return
    
    try {
      const response = await fetch(`/api/timerboards/${selectedTimerboard.timerboard.id}/audit-logs`)
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.auditLogs)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    }
  }

  const handleAddUser = async () => {
    if (!newUserName.trim() || !selectedTimerboard) return
    
    setUserManagementLoading(true)
    setUserManagementError('')

    try {
      const response = await fetch(`/api/timerboards/${selectedTimerboard.timerboard.id}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterName: newUserName.trim(),
          role: newUserRole,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewUserName('')
        setNewUserRole('USER')
        fetchTimerboardUsers() // Refresh the user list
      } else {
        setUserManagementError(data.error || 'Failed to add user')
      }
    } catch (error) {
      console.error('Error adding user:', error)
      setUserManagementError('Failed to add user')
    } finally {
      setUserManagementLoading(false)
    }
  }

  const handleRemoveUser = async (characterName: string) => {
    if (!confirm(`Are you sure you want to remove "${characterName}" from this timerboard?`)) {
      return
    }

    try {
      const response = await fetch(`/api/timerboards/${selectedTimerboard?.timerboard.id}/users`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterName: characterName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        fetchTimerboardUsers() // Refresh the user list
      } else {
        alert(data.error || 'Failed to remove user')
      }
    } catch (error) {
      console.error('Error removing user:', error)
      alert('Failed to remove user')
    }
  }

  // Fetch timerboard users, statistics, and audit logs when manage board is shown
  useEffect(() => {
    if (showManageBoard && selectedTimerboard) {
      fetchTimerboardUsers()
      fetchStatistics()
      fetchAuditLogs()
    }
  }, [showManageBoard, selectedTimerboard])

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
        onSelectTimerboard={fetchTimerboard}
        isAdmin={(session?.user as any)?.isAdmin || false}
        onTimerboardsUpdated={() => {
          // Clear selection when timerboards are updated (like after deletion)
          setSelectedTimerboard(null)
          fetchTimerboards()
        }}
      />
    )
  }

  const upcomingTimers = selectedTimerboard ? selectedTimerboard.timers
    .filter(timer => {
      const expiredTime = new Date(timer.expiresAt)
      const activeUntil = timer.activeUntil ? new Date(timer.activeUntil) : expiredTime
      return activeUntil > currentTime
    })
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()) : []
    
  const pastTimers = selectedTimerboard ? selectedTimerboard.timers
    .filter(timer => {
      const expiredTime = new Date(timer.expiresAt)
      const activeUntil = timer.activeUntil ? new Date(timer.activeUntil) : expiredTime
      return activeUntil <= currentTime
    })
    .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime()) : []
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-400 border-t-transparent"></div>
      </div>
    )
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
                  onClick={() => setSelectedTimerboard(null)}
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
              <h4 className="text-md font-semibold">User Management</h4>
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
                      disabled={userManagementLoading}
                    />
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      disabled={userManagementLoading}
                    >
                      <option value="USER">User</option>
                      {selectedTimerboard?.timerboard.userRole === 'ADMIN' && (
                        <option value="MODERATOR">Moderator</option>
                      )}
                    </select>
                    <button 
                      onClick={handleAddUser}
                      disabled={userManagementLoading || !newUserName.trim()}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded"
                    >
                      {userManagementLoading ? 'Adding...' : 'Add User'}
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
              <h4 className="text-md font-semibold">Statistics</h4>
              {statisticsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-400 border-t-transparent mx-auto"></div>
                </div>
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

            {/* Audit Log Section */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold">Recent Activity</h4>
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
                              {log.action === 'USER_ADDED' && 'added user'}
                              {log.action === 'USER_REMOVED' && 'removed user'}
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
            <h3 className="text-lg font-semibold">
              {showPastTimers 
                ? `Past Timers (${pastTimers.length})`
                : `Upcoming Timers (${upcomingTimers.length})`
              }
            </h3>
          </div>
          
          {(showPastTimers ? pastTimers : upcomingTimers).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {showPastTimers ? 'No past timers' : 'No upcoming timers'}
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {(showPastTimers ? pastTimers : upcomingTimers).map((timer) => (
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
                        {/* Manual Repair Button - only show for Jump Bridges and Mercenary Dens during active window */}
                        {!showPastTimers && formatTimeUntil(timer, showPastTimers) === 'Active Now' && 
                          (timer.structureType === 'JUMP_BRIDGE' || timer.structureType === 'MERCENARY_DEN') && (
                          <button
                            onClick={() => handleManualRepair(timer.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
                          >
                            Repaired
                          </button>
                        )}
                        {/* Delete Button - only show for moderators and admins */}
                        {selectedTimerboard && (selectedTimerboard.timerboard.userRole === 'ADMIN' || selectedTimerboard.timerboard.userRole === 'MODERATOR') && (
                          <button
                            onClick={() => handleDeleteTimer(timer.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium"
                            title="Delete timer permanently"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
          onTimerAdded={() => {
            fetchTimerboard(selectedTimerboard.timerboard.id)
          }}
        />
      )}
    </div>
  )
}