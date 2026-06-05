'use client'

import { Menu, Sun, Moon, Globe, Bell, LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAppStore } from '@/store/useAppStore'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export function Header() {
  const { theme, toggleTheme, toggleLanguage, setSidebarOpen, sidebarOpen, user } =
    useAppStore()
  const { language } = useTranslation()

  async function handleLogout() {
    try {
      await signOut(auth)
      toast.success('লগআউট হয়েছে')
    } catch {
      toast.error('সমস্যা হয়েছে')
    }
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
      {/* Left */}
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
          {language === 'bn' ? 'EN' : 'বাং'}
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

        {/* User */}
        <div className="flex items-center gap-2 ml-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.displayName?.[0] ?? user?.email?.[0] ?? 'U'}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition-colors"
            title="লগআউট"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
