'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { parseOrbitalSkyhook, parseJumpBridge, parseMercenaryDen, parseOtherStructure, parseAnchoringStructure, detectAnchoringStructure } from '@/lib/timer-parsers'

interface AddTimerModalProps {
  isOpen: boolean
  onClose: () => void
  timerboardId: string
  onTimerAdded: () => void
  toast?: any
}

export function AddTimerModal({ isOpen, onClose, timerboardId, onTimerAdded, toast }: AddTimerModalProps) {
  const [structureType, setStructureType] = useState('')
  const [pasteInput, setPasteInput] = useState('')
  const [owner, setOwner] = useState('')
  const [layer, setLayer] = useState('')
  const [system, setSystem] = useState('')
  const [planet, setPlanet] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  
  const queryClient = useQueryClient()

  if (!isOpen) return null

  const handleStructureTypeChange = (type: string) => {
    setStructureType(type)
    setStep(2)
    setError('')
    setPasteInput('')
    setOwner('')
    setLayer('')
    setSystem('')
    setPlanet('')
  }

  // Handle paste input changes and detect anchoring structures
  const handlePasteInputChange = (value: string) => {
    setPasteInput(value)

    // Auto-detect anchoring structures and set layer accordingly
    if (['FORTIZAR', 'AZBEL', 'SOTIYO', 'KEEPSTAR', 'TATARA', 'ASTRAHUS', 'ATHANOR', 'RAITARU'].includes(structureType)) {
      if (detectAnchoringStructure(value)) {
        setLayer('ANCHORING')
      }
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      let parsedTimer = null

      // Check if this is an anchoring structure first
      if (['FORTIZAR', 'AZBEL', 'SOTIYO', 'KEEPSTAR', 'TATARA', 'ASTRAHUS', 'ATHANOR', 'RAITARU'].includes(structureType) &&
          layer === 'ANCHORING' && detectAnchoringStructure(pasteInput)) {
        if (!owner) {
          setError('Owner is required for anchoring structures')
          setLoading(false)
          return
        }
        parsedTimer = parseAnchoringStructure(pasteInput, structureType, owner)
      } else {
        switch (structureType) {
          case 'ORBITAL_SKYHOOK':
            parsedTimer = parseOrbitalSkyhook(pasteInput)
            break
          case 'JUMP_BRIDGE':
            if (!owner) {
              setError('Owner is required for Jump Bridges')
              setLoading(false)
              return
            }
            parsedTimer = parseJumpBridge(pasteInput, owner)
            break
          case 'MERCENARY_DEN':
            if (!owner || !system || !planet) {
              setError('Owner, system, and planet are required for Mercenary Dens')
              setLoading(false)
              return
            }
            parsedTimer = parseMercenaryDen(pasteInput, system, planet, owner)
            break
          case 'METENOX':
            if (!owner) {
              setError('Owner is required for Metenox structures')
              setLoading(false)
              return
            }
            parsedTimer = parseOtherStructure(pasteInput, structureType, '', owner)
            break
          default:
            // Other structures (Astrahus, Fortizar, etc.)
            if (!owner || !layer) {
              setError('Owner and layer are required for this structure type')
              setLoading(false)
              return
            }
            parsedTimer = parseOtherStructure(pasteInput, structureType, layer, owner)
            break
        }
      }

      if (!parsedTimer || !parsedTimer.expiresAt) {
        setError('Failed to parse timer input. Please check the format.')
        setLoading(false)
        return
      }

      // Submit to API
      const response = await fetch('/api/timers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timerboardId,
          structureType: parsedTimer.structureType,
          system: parsedTimer.system,
          location: parsedTimer.location,
          owner: parsedTimer.owner,
          layer: parsedTimer.layer,
          expiresAt: parsedTimer.expiresAt.toISOString(),
          notes: notes.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create timer')
      }

      // Success - invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['timerboard', timerboardId] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs', timerboardId] })
      
      if (toast) {
        toast.success('Timer added successfully')
      }
      
      onTimerAdded()
      handleClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      
      if (toast) {
        toast.error('Failed to add timer', errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setStructureType('')
    setPasteInput('')
    setOwner('')
    setLayer('')
    setSystem('')
    setPlanet('')
    setNotes('')
    setError('')
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-green-400">Add New Timer</h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Structure Type</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleStructureTypeChange('ORBITAL_SKYHOOK')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Orbital Skyhook</div>
                <div className="text-sm text-gray-400">15min active window</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('JUMP_BRIDGE')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Jump Bridge</div>
                <div className="text-sm text-gray-400">30min active window</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('MERCENARY_DEN')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Mercenary Den</div>
                <div className="text-sm text-gray-400">30min active window</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('METENOX')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Metenox</div>
                <div className="text-sm text-gray-400">15min active window</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('ASTRAHUS')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Astrahus</div>
                <div className="text-sm text-gray-400">15min (armor only)</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('FORTIZAR')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Fortizar</div>
                <div className="text-sm text-gray-400">15min (armor) / 30min (hull)</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('ATHANOR')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Athanor</div>
                <div className="text-sm text-gray-400">15min (armor only)</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('TATARA')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Tatara</div>
                <div className="text-sm text-gray-400">15min (armor) / 30min (hull)</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('RAITARU')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Raitaru</div>
                <div className="text-sm text-gray-400">15min (armor only)</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('AZBEL')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Azbel</div>
                <div className="text-sm text-gray-400">15min (armor) / 30min (hull)</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('SOTIYO')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Sotiyo</div>
                <div className="text-sm text-gray-400">15min (armor) / 30min (hull)</div>
              </button>
              <button
                onClick={() => handleStructureTypeChange('KEEPSTAR')}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-left"
              >
                <div className="font-semibold">Keepstar</div>
                <div className="text-sm text-gray-400">15min (armor) / 30min (hull)</div>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setStep(1)}
                className="text-green-400 hover:text-green-300"
              >
                ← Back
              </button>
              <h3 className="text-lg font-semibold">
                Add {structureType.replace(/_/g, ' ')} Timer
              </h3>
            </div>

            {/* Structure-specific inputs */}
            {structureType === 'ORBITAL_SKYHOOK' && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium">Paste from game:</span>
                  <textarea
                    value={pasteInput}
                    onChange={(e) => handlePasteInputChange(e.target.value)}
                    placeholder="Orbital Skyhook (F2OY-X IV) [Brave Holdings]
69 km
Reinforced until 2025.05.04 20:23:01"
                    rows={4}
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                  />
                </label>
              </div>
            )}

            {structureType === 'JUMP_BRIDGE' && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium">Paste from game:</span>
                  <textarea
                    value={pasteInput}
                    onChange={(e) => handlePasteInputChange(e.target.value)}
                    placeholder="EFM-C4 » C-J6MT - Eye Of Terror Mk.VIII
1,595 m
Reinforced until 2025.08.26 19:16:49"
                    rows={4}
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Owner:</span>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Enter owner name"
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </label>
              </div>
            )}

            {structureType === 'MERCENARY_DEN' && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium">Timer date:</span>
                  <input
                    type="text"
                    value={pasteInput}
                    onChange={(e) => setPasteInput(e.target.value)}
                    placeholder="2025.09.13 10:32"
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white font-mono"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">System:</span>
                  <input
                    type="text"
                    value={system}
                    onChange={(e) => setSystem(e.target.value)}
                    placeholder="F2OY-X"
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Planet:</span>
                  <input
                    type="text"
                    value={planet}
                    onChange={(e) => setPlanet(e.target.value)}
                    placeholder="IV"
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Owner:</span>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Enter owner name"
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </label>
              </div>
            )}

            {['FORTIZAR', 'AZBEL', 'SOTIYO', 'KEEPSTAR', 'TATARA'].includes(structureType) && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium">Structure Layer:</span>
                  <select
                    value={layer}
                    onChange={(e) => setLayer(e.target.value)}
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">Select layer...</option>
                    <option value="ANCHORING">Anchoring</option>
                    <option value="ARMOR">Armor</option>
                    <option value="HULL">Hull</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Owner:</span>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Enter owner name"
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Paste from game:</span>
                  <textarea
                    value={pasteInput}
                    onChange={(e) => handlePasteInputChange(e.target.value)}
                    placeholder="E8-432 - P A N F A M S T A R
2,398 km
Anchoring until 2025.09.22 16:49:02

OR

E8-432 - P A N F A M S T A R
3,714 km
Reinforced until 2025.08.24 19:25:45"
                    rows={4}
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                  />
                </label>
              </div>
            )}

            {['ASTRAHUS', 'ATHANOR', 'RAITARU'].includes(structureType) && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium">Structure Layer:</span>
                  <select
                    value={layer}
                    onChange={(e) => setLayer(e.target.value)}
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">Select layer...</option>
                    <option value="ANCHORING">Anchoring</option>
                    <option value="ARMOR">Armor</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Owner:</span>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Enter owner name"
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Paste from game:</span>
                  <textarea
                    value={pasteInput}
                    onChange={(e) => handlePasteInputChange(e.target.value)}
                    placeholder="E8-432 - P A N F A M S T A R
2,398 km
Anchoring until 2025.09.22 16:49:02

OR

E8-432 - P A N F A M S T A R
3,714 km
Reinforced until 2025.08.24 19:25:45"
                    rows={4}
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                  />
                </label>
              </div>
            )}

            {structureType === 'METENOX' && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium">Owner:</span>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Enter owner name"
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Paste from game:</span>
                  <textarea
                    value={pasteInput}
                    onChange={(e) => handlePasteInputChange(e.target.value)}
                    placeholder="L-FVHR - Military Parade S
3,714 km
Reinforced until 2025.08.24 19:25:45"
                    rows={4}
                    className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                  />
                </label>
              </div>
            )}

            {/* Notes field for all structure types */}
            <label className="block">
              <span className="text-sm font-medium">Notes (optional):</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this timer..."
                rows={2}
                className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </label>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded font-medium"
              >
                {loading ? 'Adding Timer...' : 'Add Timer'}
              </button>
              <button
                onClick={handleClose}
                className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}