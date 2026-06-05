'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, Users, Settings, Loader2, LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserBusinesses, updateBusiness } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import { BusinessCard } from '@/components/business/BusinessCard'
import { CreateBusinessModal } from '@/components/business/CreateBusinessModal'
import { StaffModal } from '@/components/business/StaffModal'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Business } from '@/lib/types'

export default function SetupPage() {
  const router = useRouter()
  const { user, activeBusiness, setActiveBusiness, language } = useAppStore()

  const [businesses, setBusinesses]         = useState<Business[]>([])
  const [loading, setLoading]               = useState(true)
  const [selected, setSelected]             = useState<Business | null>(null)
  const [showCreate, setShowCreate]         = useState(false)
  const [showStaff, setShowStaff]           = useState(false)
  const [editingBiz, setEditingBiz]         = useState<Business | null>(null)

  async function loadBusinesses() {
    if (!user) return
    setLoading(true)
    try {
      const list = await getUserBusinesses(user.uid)
      setBusinesses(list)
      if (list.length === 0) setShowCreate(true)
      // Pre-select active business if exists
      if (activeBusiness) {
        const found = list.find((b) => b.id === activeBusiness.id)
        if (found) setSelected(found)
      } else if (list.length === 1) {
        setSelected(list[0])
      }
    } catch {
      toast.error('ব্যবসার তালিকা লোড হয়নি')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBusinesses() }, [user])

  function handleSelect(biz: Business) {
    setSelected(biz)
  }

  function handleEnter() {
    if (!selected) {
      toast.error('একটি ব্যবসা বেছে নাও')
      return
    }
    setActiveBusiness(selected)
    router.push('/dashboard')
  }

  async function handleLogout() {
    await signOut(auth)
    toast.success('লগআউট হয়েছে')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">

      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="font-bold text-blue-600">Smart ERP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 hidden sm:block">
            {user?.displayName ?? user?.email ?? user?.phone}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <LogOut size={15} />
            লগআউট
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pt-8">

        {/* Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Building2 size={26} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            আপনার ব্যবসা
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            একটি ব্যবসা বেছে নিন বা নতুন তৈরি করুন
          </p>
        </div>

        {/* Business list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {businesses.map((biz) => (
              <div key={biz.id} className="relative">
                <BusinessCard
                  business={biz}
                  active={selected?.id === biz.id}
                  onClick={() => handleSelect(biz)}
                />
                {/* Action buttons (visible when selected) */}
                {selected?.id === biz.id && (
                  <div className="flex gap-2 mt-2 pl-2">
                    <button
                      onClick={() => { setEditingBiz(biz); setShowStaff(true) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                      <Users size={12} /> স্টাফ
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Add new business */}
            <button
              onClick={() => setShowCreate(true)}
              className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-400 transition-all"
            >
              <Plus size={18} />
              <span className="font-medium text-sm">নতুন ব্যবসা যোগ করো</span>
            </button>
          </div>
        )}

        {/* Enter button */}
        {!loading && businesses.length > 0 && (
          <button
            onClick={handleEnter}
            disabled={!selected}
            className="w-full btn-primary py-3.5 text-base font-semibold disabled:opacity-40"
          >
            {selected ? `"${selected.name}" খোলো →` : 'ব্যবসা বেছে নাও'}
          </button>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateBusinessModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadBusinesses() }}
        />
      )}

      {showStaff && editingBiz && (
        <StaffModal
          business={editingBiz}
          onClose={() => { setShowStaff(false); setEditingBiz(null) }}
          onUpdated={() => { loadBusinesses() }}
        />
      )}
    </div>
  )
}
