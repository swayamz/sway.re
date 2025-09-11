'use client'

import { useSession, signIn, signOut } from "next-auth/react"

export function SignInButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div className="text-gray-400">Loading...</div>
  }

  if (session?.user) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <img 
            src={session.user.image || '/default-avatar.png'} 
            alt="Character portrait"
            className="w-8 h-8 rounded-full"
          />
          <span className="text-white">{session.user.name}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('eve-online')}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center space-x-2"
    >
      <span>Sign in with EVE Online</span>
    </button>
  )
}