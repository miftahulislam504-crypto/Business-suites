'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const PUBLIC_PATHS  = ['/auth/login']
const SETUP_PATHS   = ['/setup']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, activeBusiness } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
    const isSetup  = SETUP_PATHS.some((p)  => pathname.startsWith(p))

    // Not logged in → go to login
    if (!user && !isPublic) {
      router.replace('/auth/login')
      return
    }

    // Logged in, on login page → go to setup
    if (user && isPublic) {
      router.replace('/setup')
      return
    }

    // Logged in, no active business, not on setup → go to setup
    if (user && !activeBusiness && !isSetup) {
      router.replace('/setup')
      return
    }
  }, [user, activeBusiness, pathname, router])

  return <>{children}</>
}
