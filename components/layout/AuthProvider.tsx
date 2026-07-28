'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

const PUBLIC_PATHS = ['/auth/login']
const SETUP_PATHS  = ['/setup']
// ল্যান্ডিং পেজ — লগইন ছাড়াই দেখা যাবে, কিন্তু লগইন করা থাকলে এখানে থামবে না
const LANDING_PATH = '/'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, activeBusiness, authLoading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Firebase এখনো check করছে — কিছু করবো না
    if (authLoading) return

    const isLanding = pathname === LANDING_PATH
    const isPublic  = isLanding || PUBLIC_PATHS.some((p) => pathname.startsWith(p))
    const isSetup   = SETUP_PATHS.some((p) => pathname.startsWith(p))

    // লগইন ছাড়া ইউজার: ল্যান্ডিং পেজ আর লগইন পেজ ছাড়া সবকিছু থেকে লগইনে পাঠাও
    if (!user && !isPublic) {
      router.replace('/auth/login')
      return
    }

    // লগইন করা ইউজার লগইন পেজে গেলে সেটআপ/ড্যাশবোর্ডে পাঠাও (কিন্তু ল্যান্ডিং পেজে থামতে দাও না)
    if (user && isPublic) {
      router.replace('/setup')
      return
    }

    if (user && !activeBusiness && !isSetup) {
      router.replace('/setup')
      return
    }
  }, [user, activeBusiness, authLoading, pathname, router])

  // Firebase auth check চলাকালীন blank screen দেখাও
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">E</span>
          </div>
          <Loader2 size={20} className="animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
