'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAppStore } from '@/store/useAppStore'
import { canAccess, getRole, moduleFromPath } from '@/lib/permissions'
import { cn } from '@/lib/utils'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const sidebarOpen    = useAppStore((s) => s.sidebarOpen)
  const activeBusiness = useAppStore((s) => s.activeBusiness)
  const user           = useAppStore((s) => s.user)
  const pathname       = usePathname()

  const role    = getRole(activeBusiness, user?.uid)
  const allowed = canAccess(role, moduleFromPath(pathname))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <Header />
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-200',
          sidebarOpen ? 'lg:ml-60' : 'lg:ml-16',
        )}
      >
        <div className="p-4 lg:p-6">
          {allowed ? children : (
            <div className="max-w-sm mx-auto text-center py-20">
              <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">এই পাতা দেখার অনুমতি নেই</p>
              <p className="text-sm text-gray-500 mb-5">আপনার ভূমিকা দিয়ে এটা খোলা যায় না। মালিকের সাথে কথা বলুন।</p>
              <Link href="/dashboard" className="btn-primary px-4 py-2 inline-block">ড্যাশবোর্ডে যাও</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
