interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function LoadingSpinner({ size = 'medium', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-6 w-6 border-2',
    large: 'h-8 w-8 border-2'
  }

  return (
    <div
      className={`animate-spin rounded-full ${sizeClasses[size]} border-blue-400 border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10">
      <div className="flex flex-col items-center space-y-3">
        <LoadingSpinner size="large" />
        <p className="text-gray-300 text-sm">{message}</p>
      </div>
    </div>
  )
}

export function InlineLoading({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center space-x-3">
        <LoadingSpinner />
        <span className="text-gray-400">{message}</span>
      </div>
    </div>
  )
}