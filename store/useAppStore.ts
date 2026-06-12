import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language, Theme, Business, User } from '@/lib/types'

interface AppState {
  // Auth
  user: User | null
  setUser: (user: User | null) => void

  // Active Business
  activeBusiness: Business | null
  setActiveBusiness: (business: Business | null) => void

  // Theme
  theme: Theme
  toggleTheme: () => void

  // Language
  language: Language
  toggleLanguage: () => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),

      // Business
      activeBusiness: null,
      setActiveBusiness: (business) => set({ activeBusiness: business }),

      // Theme
      theme: 'light',
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      // Language
      language: 'bn',
      toggleLanguage: () =>
        set((state) => ({ language: state.language === 'bn' ? 'en' : 'bn' })),

      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'business-suites-store',
      partialize: (state) => ({
        theme:    state.theme,
        language: state.language,
        activeBusiness: state.activeBusiness,
      }),
    }
  )
)
