import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/providers'
import { SignInButton } from '@/components/auth/sign-in-button'

export const metadata: Metadata = {
  title: 'Toast Response Coordination',
  description: 'Coordinate response to entosis events',
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
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center">
                    <h1 className="text-xl font-bold">Toast</h1>
                    <span className="ml-2 text-gray-400">Response Coordination</span>
                  </div>
                  <SignInButton />
                </div>
              </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}