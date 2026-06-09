import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Smart ERP BD',
  description: 'বাংলাদেশের সবচেয়ে স্মার্ট ব্যবসা ম্যানেজমেন্ট সফটওয়্যার',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: '10px',
                  background: '#1e293b',
                  color: '#f1f5f9',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
