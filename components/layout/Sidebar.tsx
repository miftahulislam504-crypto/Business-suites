'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingCart, TruckIcon,
  Users, Building2, BookOpen, BarChart3,
  UserCog, Settings, X, ChevronRight,
  Sparkles, GitBranch, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'

const navItems = [
  { href: '/dashboard',  icon: LayoutDashboard, key: 'dashboard'  },
  { href: '/inventory',  icon: Package,          key: 'inventory'  },
  { href: '/sales',      icon: ShoppingCart,     key: 'sales'      },
  { href: '/purchase',   icon: TruckIcon,        key: 'purchase'   },
  { href: '/customers',  icon: Users,            key: 'customers'  },
  { href: '/suppliers',  icon: Building2,        key: 'suppliers'  },
  { href: '/accounting', icon: BookOpen,         key: 'accounting' },
  { href: '/reports',    icon: BarChart3,        key: 'reports'    },
  { href: '/employees',  icon: UserCog,          key: 'employees'  },
]

const extraItems = [
  { href: '/ai',       icon: Sparkles,   label_bn: 'AI সহকারী', label_en: 'AI Assistant', gradient: true },
  { href: '/branches', icon: GitBranch,  label_bn: 'শাখা',       label_en: 'Branches'                      },
  { href: '/audit',    icon: Shield,     label_bn: 'অডিট লগ',   label_en: 'Audit Log'                     },
  { href: '/settings', icon: Settings,   label_bn: 'সেটিংস',    label_en: 'Settings'                      },
]

export function Sidebar() {
  const pathname       = usePathname()
  const { tr, language } = useTranslation()
  const { sidebarOpen, setSidebarOpen, activeBusiness } = useAppStore()

  return (
    <>
      {/* Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-30 bg-white dark:bg-gray-900',
          'border-r border-gray-100 dark:border-gray-800',
          'flex flex-col transition-all duration-200',
          sidebarOpen ? 'w-60' : 'w-0 lg:w-16 overflow-hidden',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 dark:border-gray-800">
          {sidebarOpen && (
            <span className="font-bold text-lg text-blue-600">Business Suites</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Business name */}
        {sidebarOpen && activeBusiness && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950 border-b border-blue-100 dark:border-blue-900">
            <p className="text-xs text-blue-500 dark:text-blue-400">সক্রিয় ব্যবসা</p>
            <p className="font-semibold text-blue-700 dark:text-blue-300 text-sm truncate">
              {activeBusiness.name}
            </p>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(({ href, icon: Icon, key }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                )}
                onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
              >
                <Icon size={18} className="shrink-0" />
                {sidebarOpen && <span>{tr[key as keyof typeof tr]}</span>}
                {sidebarOpen && active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}

          {/* Divider */}
          {sidebarOpen && (
            <div className="pt-2 pb-1">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">আরও</p>
            </div>
          )}
          {!sidebarOpen && <div className="my-2 border-t border-gray-100 dark:border-gray-800" />}

          {/* Extra items */}
          {extraItems.map(({ href, icon: Icon, label_bn, label_en, gradient }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? gradient
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'bg-blue-600 text-white'
                    : gradient
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
                )}
                onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
              >
                <Icon size={18} className="shrink-0" />
                {sidebarOpen && <span>{language === 'bn' ? label_bn : label_en}</span>}
                {sidebarOpen && active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
