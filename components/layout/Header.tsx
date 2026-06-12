'use client'

import { useState, useRef, useEffect } from 'react'
import { Menu, Sun, Moon, Globe, Bell, LogOut, User, Settings, Building2, ChevronDown } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export function Header() {
  const {
    theme, toggleTheme,
    language, toggleLanguage,
    setSidebarOpen, sidebarOpen,
    user, activeBusiness, setActiveBusiness,
  } = useAppStore()

  const router = useRouter()
  const [accountOpen, setAccountOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    try {
      setActiveBusiness(null)
      await signOut(auth)
      toast.success('লগআউট হয়েছে')
      router.replace('/auth/login')
    } catch {
      toast.error('সমস্যা হয়েছে')
    }
    setAccountOpen(false)
  }

  function handleChangeBusiness() {
    setActiveBusiness(null)
    router.push('/setup')
    setAccountOpen(false)
  }

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 z-10',
        'bg-white dark:bg-gray-900',
        'border-b border-gray-100 dark:border-gray-800',
        'flex items-center justify-between px-4 gap-3',
        'transition-all duration-200',
        sidebarOpen ? 'left-60' : 'left-0 lg:left-16',
      )}
    >
      {/* Left — hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Right */}
      <div className="flex items-center gap-1 ml-auto">

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Globe size={16} />
          <span>{language === 'bn' ? 'EN' : 'বাং'}</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification */}
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Account dropdown */}
        <div className="relative ml-1" ref={dropRef}>
          <button
            onClick={() => setAccountOpen(!accountOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight max-w-[100px] truncate">
                {user?.displayName ?? 'ব্যবহারকারী'}
              </p>
              <p className="text-xs text-gray-400 truncate max-w-[100px]">
                {activeBusiness?.name ?? ''}
              </p>
            </div>
            <ChevronDown size={14} className={cn('text-gray-400 transition-transform', accountOpen && 'rotate-180')} />
          </button>

          {/* Dropdown */}
          {accountOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-50">

              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {user?.displayName ?? 'ব্যবহারকারী'}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {user?.email ?? user?.phone ?? ''}
                </p>
              </div>

              {/* Active business */}
              {activeBusiness && (
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-400">{language === 'bn' ? 'সক্রিয় ব্যবসা' : 'Active Business'}</p>
                  <p className="text-sm font-medium text-blue-600 truncate">{activeBusiness.name}</p>
                </div>
              )}

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { router.push('/settings'); setAccountOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Settings size={15} className="text-gray-400" />
                  {language === 'bn' ? 'সেটিংস' : 'Settings'}
                </button>

                <button
                  onClick={handleChangeBusiness}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Building2 size={15} className="text-gray-400" />
                  {language === 'bn' ? 'ব্যবসা পরিবর্তন' : 'Change Business'}
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  <LogOut size={15} />
                  {language === 'bn' ? 'লগআউট' : 'Logout'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
