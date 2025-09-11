import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { SignInButton } from '@/components/auth/sign-in-button'

export const metadata: Metadata = {
  title: 'EVE Online Timers - Sway.re',
  description: 'EVE Online structure timer management application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-gray-900 text-white">
            <header className="bg-gray-800 border-b border-gray-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold text-green-400">EVE Timers</h1>
                  <SignInButton />
                </div>
              </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="bg-gray-800 border-t border-gray-700 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-gray-400">
                <p>Part of <strong className="text-white">sway.re</strong> - A collection of useful tools</p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}