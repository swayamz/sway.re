'use client'

import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000, // 30 seconds
          refetchInterval: 60 * 1000, // Auto-refetch every minute
          refetchOnWindowFocus: true,
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  )
}