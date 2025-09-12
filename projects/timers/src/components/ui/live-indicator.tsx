'use client'

import { useEffect, useState } from 'react'

interface LiveIndicatorProps {
  isLive?: boolean
  lastUpdated?: Date
  className?: string
}

export function LiveIndicator({ isLive = true, lastUpdated, className = '' }: LiveIndicatorProps) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setPulse(prev => !prev)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [isLive])

  if (!isLive) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs text-red-400">Offline</span>
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            Last: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className={`w-2 h-2 rounded-full bg-green-400 transition-opacity duration-500 ${
          pulse ? 'opacity-100' : 'opacity-50'
        }`} 
      />
      <span className="text-xs text-green-400 font-medium">LIVE</span>
      {lastUpdated && (
        <span className="text-xs text-gray-500">
          Updated: {lastUpdated.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}

export function RefreshingIndicator({ isRefreshing }: { isRefreshing: boolean }) {
  if (!isRefreshing) return null

  return (
    <div className="flex items-center space-x-2 text-blue-400">
      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs">Refreshing...</span>
    </div>
  )
}