'use client'

import { signIn, getSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface SignInPageProps {
  appName: string
  description: string
}

export default function SignInPage({ appName, description }: SignInPageProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('eve-online', { callbackUrl: '/' })
    } catch (error) {
      console.error('Sign in error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Sign in to {appName}</h1>
        <p className="text-gray-400 mb-8">
          {description}
        </p>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-3 transition-colors"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.71 9 11 5.16-1.29 9-5.45 9-11V7l-10-5z"/>
              </svg>
              <span>Sign in with EVE Online</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}