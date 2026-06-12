'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { useAppStore } from '@/store/useAppStore'
import { updateBusiness } from '@/lib/firestore'
import {
  Settings, Globe, Moon, Sun, Building2,
  Phone, MapPin, Save, Loader2, User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { language, toggleLanguage, theme, toggleTheme, activeBusiness, setActiveBusiness, user } = useAppStore()

  const [bizName,    setBizName]    = useState(activeBusiness?.name    ?? '')
  const [bizPhone,   setBizPhone]   = useState(activeBusiness?.phone   ?? '')
  const [bizAddress, setBizAddress] = useState(activeBusiness?.address ?? '')
  const [saving,     setSaving]     = useState(false)

  async function handleSaveBusiness() {
    if (!activeBusiness) return
    if (!bizName.trim()) { toast.error(language === 'bn' ? 'নাম দাও' : 'Enter name'); return }
    setSaving(true)
    try {
      await updateBusiness(activeBusiness.id, {
        name:    bizName.trim(),
        phone:   bizPhone.trim(),
        address: bizAddress.trim(),
      })
      setActiveBusiness({ ...activeBusiness, name: bizName.trim(), phone: bizPhone.trim(), address: bizAddress.trim() })
      toast.success(language === 'bn' ? 'সেভ হয়েছে' : 'Saved!')
    } catch {
      toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error saving')
    } finally {
      setSaving(false)
    }
  }

  const sectionClass = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4'

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-xl">
            <Settings size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {language === 'bn' ? 'সেটিংস' : 'Settings'}
            </h1>
            <p className="text-sm text-gray-400">
              {language === 'bn' ? 'অ্যাপ ও ব্যবসার তথ্য পরিবর্তন করো' : 'Manage app & business settings'}
            </p>
          </div>
        </div>

        {/* App Preferences */}
        <div className={sectionClass}>
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Globe size={16} className="text-blue-500" />
            {language === 'bn' ? 'অ্যাপ সেটিংস' : 'App Preferences'}
          </h2>

          {/* Language */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {language === 'bn' ? 'ভাষা' : 'Language'}
              </p>
              <p className="text-xs text-gray-400">
                {language === 'bn' ? 'বর্তমানে: বাংলা' : 'Current: English'}
              </p>
            </div>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            >
              <Globe size={15} />
              {language === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করো'}
            </button>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {language === 'bn' ? 'থিম' : 'Theme'}
              </p>
              <p className="text-xs text-gray-400">
                {theme === 'dark'
                  ? (language === 'bn' ? 'বর্তমানে: ডার্ক মোড' : 'Current: Dark mode')
                  : (language === 'bn' ? 'বর্তমানে: লাইট মোড' : 'Current: Light mode')}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              {theme === 'dark'
                ? (language === 'bn' ? 'লাইট মোড' : 'Light Mode')
                : (language === 'bn' ? 'ডার্ক মোড' : 'Dark Mode')}
            </button>
          </div>
        </div>

        {/* Account Info */}
        <div className={sectionClass}>
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <User size={16} className="text-purple-500" />
            {language === 'bn' ? 'অ্যাকাউন্ট তথ্য' : 'Account Info'}
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {user?.displayName?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{user?.displayName ?? '-'}</p>
                <p className="text-xs text-gray-400">{user?.email ?? user?.phone ?? '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Business Settings */}
        {activeBusiness && (
          <div className={sectionClass}>
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Building2 size={16} className="text-green-500" />
              {language === 'bn' ? 'ব্যবসার তথ্য' : 'Business Info'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {language === 'bn' ? 'ব্যবসার নাম *' : 'Business Name *'}
                </label>
                <input
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  className="input-field"
                  placeholder={language === 'bn' ? 'ব্যবসার নাম' : 'Business name'}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <Phone size={12} className="inline mr-1" />
                  {language === 'bn' ? 'ফোন নম্বর' : 'Phone'}
                </label>
                <input
                  value={bizPhone}
                  onChange={e => setBizPhone(e.target.value)}
                  className="input-field"
                  placeholder="01XXXXXXXXX"
                  type="tel"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  <MapPin size={12} className="inline mr-1" />
                  {language === 'bn' ? 'ঠিকানা' : 'Address'}
                </label>
                <input
                  value={bizAddress}
                  onChange={e => setBizAddress(e.target.value)}
                  className="input-field"
                  placeholder={language === 'bn' ? 'ব্যবসার ঠিকানা' : 'Business address'}
                />
              </div>
            </div>

            <button
              onClick={handleSaveBusiness}
              disabled={saving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {language === 'bn' ? 'সেভ করো' : 'Save Changes'}
            </button>
          </div>
        )}

      </div>
    </MainLayout>
  )
}
