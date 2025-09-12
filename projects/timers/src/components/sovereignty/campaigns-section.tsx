'use client'

import { useState, useEffect } from 'react'

interface SovereigntyCampaign {
  campaign_id: number
  structure_id: number
  solar_system_id: number
  solar_system_name?: string
  constellation_id: number
  event_type: string
  start_time: string
  defender_id?: number
  defender_name?: string
  defender_score?: number
  attackers_score?: number
}

interface CampaignsSectionProps {
  timerboardId: string
  isModeratorOrAdmin: boolean
}

export function CampaignsSection({ timerboardId, isModeratorOrAdmin }: CampaignsSectionProps) {
  const [regions, setRegions] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<SovereigntyCampaign[]>([])
  const [loading, setLoading] = useState(false)
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [error, setError] = useState('')
  const [newRegion, setNewRegion] = useState('')
  const [addingRegion, setAddingRegion] = useState(false)

  useEffect(() => {
    fetchRegions()
  }, [timerboardId])

  useEffect(() => {
    if (regions.length > 0) {
      fetchCampaigns()
    } else {
      setCampaigns([])
    }
  }, [regions])

  const fetchRegions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/timerboards/${timerboardId}/regions`)
      if (response.ok) {
        const data = await response.json()
        setRegions(data.regions || [])
      } else {
        setError('Failed to fetch regions')
      }
    } catch (error) {
      console.error('Error fetching regions:', error)
      setError('Failed to fetch regions')
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaigns = async () => {
    if (regions.length === 0) return
    
    setCampaignsLoading(true)
    try {
      const response = await fetch(`/api/sovereignty/campaigns?regions=${regions.join(',')}`)
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data)
      } else {
        console.error('Failed to fetch campaigns')
        setCampaigns([])
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      setCampaigns([])
    } finally {
      setCampaignsLoading(false)
    }
  }

  const handleAddRegion = async () => {
    if (!newRegion.trim()) return
    
    setAddingRegion(true)
    setError('')

    try {
      const updatedRegions = [...regions, newRegion.trim()]
      const response = await fetch(`/api/timerboards/${timerboardId}/regions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regions: updatedRegions,
        }),
      })

      if (response.ok) {
        setNewRegion('')
        fetchRegions()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to add region')
      }
    } catch (error) {
      setError('Failed to add region')
    } finally {
      setAddingRegion(false)
    }
  }

  const handleRemoveRegion = async (regionToRemove: string) => {
    try {
      const updatedRegions = regions.filter(r => r !== regionToRemove)
      const response = await fetch(`/api/timerboards/${timerboardId}/regions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regions: updatedRegions,
        }),
      })

      if (response.ok) {
        fetchRegions()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to remove region')
      }
    } catch (error) {
      setError('Failed to remove region')
    }
  }

  const formatEventType = (eventType: string): string => {
    return eventType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toISOString().slice(0, 19).replace('T', ' ')
  }

  const getScoreColor = (attackerScore?: number, defenderScore?: number): string => {
    if (attackerScore === undefined || defenderScore === undefined) return 'text-gray-400'
    
    if (attackerScore > defenderScore) return 'text-red-400'
    if (defenderScore > attackerScore) return 'text-green-400'
    return 'text-yellow-400'
  }

  return (
    <div className="space-y-4">
      <h4 className="text-md font-semibold">Sovereignty Campaigns</h4>
      
      {/* Region Management */}
      {isModeratorOrAdmin && (
        <div className="bg-gray-900 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-4">
            Add regions to track sovereignty campaigns. Only campaigns in these regions will be displayed.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Enter region name (e.g., Cache, Delve)"
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                disabled={addingRegion}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRegion()}
              />
              <button 
                onClick={handleAddRegion}
                disabled={addingRegion || !newRegion.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded"
              >
                {addingRegion ? 'Adding...' : 'Add Region'}
              </button>
            </div>

            {/* Current Regions List */}
            {regions.length > 0 && (
              <div className="pt-4 border-t border-gray-700">
                <h5 className="text-sm font-medium text-gray-300 mb-3">Tracked Regions ({regions.length})</h5>
                <div className="flex flex-wrap gap-2">
                  {regions.map((region) => (
                    <div key={region} className="flex items-center space-x-2 bg-gray-800 rounded px-3 py-2 text-sm">
                      <span className="text-white">{region}</span>
                      <button
                        onClick={() => handleRemoveRegion(region)}
                        className="text-red-400 hover:text-red-300 text-xs"
                        title={`Remove ${region}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Campaigns Display */}
      <div className="bg-gray-900 rounded-lg p-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-400 border-t-transparent mx-auto"></div>
          </div>
        ) : regions.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-4">
            {isModeratorOrAdmin 
              ? 'Add regions to track sovereignty campaigns'
              : 'No regions configured for sovereignty tracking'
            }
          </div>
        ) : campaignsLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-400 border-t-transparent mx-auto"></div>
            <p className="text-gray-400 text-sm mt-2">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-4">
            No active sovereignty campaigns in tracked regions
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-gray-300">
                Region Summary
              </h5>
              <button
                onClick={fetchCampaigns}
                className="text-green-400 hover:text-green-300 text-sm"
              >
                Refresh Campaigns
              </button>
            </div>
            
            <div className="bg-gray-800 rounded p-3 text-sm">
              <div className="text-gray-400">
                <p className="mb-2">
                  <span className="text-green-400 font-medium">{campaigns.length}</span> sovereignty campaigns 
                  are currently active across the {regions.length} configured region{regions.length !== 1 ? 's' : ''}
                  {regions.length > 0 && `: ${regions.join(', ')}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}