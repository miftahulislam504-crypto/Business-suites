'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Package, ShoppingCart, TruckIcon,
  Users, Building2, BookOpen, BarChart3, UserCog,
  Sparkles, GitBranch, Shield, ArrowRight, Check,
  Store, Warehouse, UtensilsCrossed, Pill, HardHat, Fish,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

type CategoryKey = 'retail' | 'wholesale' | 'restaurant' | 'pharmacy' | 'construction' | 'fishfarm'

const categories: {
  key: CategoryKey
  icon: typeof Store
  label_bn: string
  label_en: string
  focus_bn: string
  focus_en: string
  modules: string[] // keys into moduleList, in priority order for this business type
}[] = [
  {
    key: 'retail', icon: Store,
    label_bn: 'খুচরা দোকান', label_en: 'Retail Shop',
    focus_bn: 'প্রতিদিনের বিক্রি, স্টক আর বাকির হিসাব একসাথে',
    focus_en: 'Daily sales, stock, and customer dues — all in one place',
    modules: ['sales', 'inventory', 'customers', 'reports', 'accounting'],
  },
  {
    key: 'wholesale', icon: Warehouse,
    label_bn: 'পাইকারি ব্যবসা', label_en: 'Wholesale',
    focus_bn: 'বড় অর্ডার, একাধিক গোডাউন আর সাপ্লায়ার পেমেন্ট ট্র্যাক করুন',
    focus_en: 'Track bulk orders, multiple warehouses, and supplier payments',
    modules: ['purchase', 'inventory', 'suppliers', 'accounting', 'reports'],
  },
  {
    key: 'restaurant', icon: UtensilsCrossed,
    label_bn: 'রেস্তোরাঁ', label_en: 'Restaurant',
    focus_bn: 'অর্ডার, কর্মচারী শিফট আর খরচের হিসাব রাখুন সহজে',
    focus_en: 'Manage orders, staff shifts, and daily expenses effortlessly',
    modules: ['sales', 'employees', 'inventory', 'accounting', 'reports'],
  },
  {
    key: 'pharmacy', icon: Pill,
    label_bn: 'ফার্মেসি', label_en: 'Pharmacy',
    focus_bn: 'মেয়াদ, স্টক লেভেল আর বিক্রির উপর নজর রাখুন',
    focus_en: 'Watch expiry dates, stock levels, and sales closely',
    modules: ['inventory', 'sales', 'customers', 'reports', 'suppliers'],
  },
  {
    key: 'construction', icon: HardHat,
    label_bn: 'নির্মাণ ব্যবসা', label_en: 'Construction',
    focus_bn: 'মালামাল ক্রয়, শ্রমিকের বেতন আর প্রজেক্ট খরচ একসাথে দেখুন',
    focus_en: 'See material purchases, labor payroll, and project costs together',
    modules: ['purchase', 'employees', 'accounting', 'suppliers', 'reports'],
  },
  {
    key: 'fishfarm', icon: Fish,
    label_bn: 'মৎস্য খামার', label_en: 'Fish Farm',
    focus_bn: 'খাদ্য ক্রয়, উৎপাদন খরচ আর বিক্রির হিসাব সহজ করুন',
    focus_en: 'Simplify feed purchases, production costs, and sales tracking',
    modules: ['purchase', 'sales', 'accounting', 'reports', 'inventory'],
  },
]

const moduleList = {
  dashboard:  { icon: LayoutDashboard, bn: 'ড্যাশবোর্ড',      en: 'Dashboard',       desc_bn: 'ব্যবসার পুরো চিত্র এক নজরে',                  desc_en: 'Your whole business at a glance' },
  inventory:  { icon: Package,        bn: 'ইনভেন্টরি',        en: 'Inventory',       desc_bn: 'স্টক, ব্র্যান্ড আর ক্যাটাগরি ম্যানেজ করুন',    desc_en: 'Manage stock, brands, and categories' },
  sales:      { icon: ShoppingCart,   bn: 'বিক্রয়',           en: 'Sales',           desc_bn: 'দ্রুত POS বিক্রি আর ইনভয়েস',                  desc_en: 'Fast POS billing and invoices' },
  purchase:   { icon: TruckIcon,      bn: 'ক্রয়',             en: 'Purchase',        desc_bn: 'সাপ্লায়ার থেকে মাল কেনার হিসাব',              desc_en: 'Track purchases from suppliers' },
  customers:  { icon: Users,          bn: 'কাস্টমার',         en: 'Customers',       desc_bn: 'বাকি, লেজার আর ঝুঁকি স্কোর',                   desc_en: 'Dues, ledgers, and risk scoring' },
  suppliers:  { icon: Building2,      bn: 'সাপ্লায়ার',        en: 'Suppliers',       desc_bn: 'সাপ্লায়ারের বকেয়া ও পেমেন্ট ট্র্যাক',          desc_en: 'Track supplier dues and payments' },
  accounting: { icon: BookOpen,       bn: 'হিসাব',            en: 'Accounting',      desc_bn: 'জার্নাল এন্ট্রি ও খরচ ব্যবস্থাপনা',            desc_en: 'Journal entries and expense management' },
  reports:    { icon: BarChart3,      bn: 'রিপোর্ট',          en: 'Reports',         desc_bn: 'লাভ-ক্ষতি, বিক্রয় ও স্টক রিপোর্ট',              desc_en: 'Profit-loss, sales, and stock reports' },
  employees:  { icon: UserCog,        bn: 'কর্মচারী',         en: 'Employees',       desc_bn: 'হাজিরা, বেতন ও পারফরম্যান্স',                  desc_en: 'Attendance, payroll, and performance' },
} as const

const trustPoints = [
  { icon: Sparkles,  bn: 'AI সহকারী দিয়ে রিপোর্ট বিশ্লেষণ ও পূর্বাভাস',  en: 'AI assistant for report analysis and forecasting' },
  { icon: GitBranch, bn: 'একাধিক শাখা এক অ্যাকাউন্ট থেকে পরিচালনা',       en: 'Manage multiple branches from one account' },
  { icon: Shield,    bn: 'প্রতিটি কাজের অডিট লগ, সম্পূর্ণ স্বচ্ছতা',       en: 'Full audit log for every action, complete transparency' },
]

export default function LandingPage() {
  const { language, toggleLanguage } = useAppStore()
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('retail')
  const isBn = language === 'bn'

  const current = categories.find((c) => c.key === activeCategory)!
  const highlighted = new Set(current.modules.slice(0, 3))
  const orderedModules = [
    ...current.modules,
    ...Object.keys(moduleList).filter((k) => !current.modules.includes(k)),
  ] as (keyof typeof moduleList)[]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-950">
              <span className="text-white text-lg font-bold">B</span>
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">Business Suites</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              {isBn ? 'English' : 'বাংলা'}
            </button>
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex items-center gap-1.5 btn-primary px-4 py-2 text-sm"
            >
              {isBn ? 'শুরু করুন' : "Let's Start"}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-14 pb-10 sm:pt-20 sm:pb-14">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            {isBn ? 'বাংলাদেশের ব্যবসার জন্য তৈরি' : 'Built for Bangladeshi businesses'}
          </div>
          <h1 className="font-bold text-gray-900 dark:text-white leading-tight text-[2.1rem] sm:text-5xl">
            {isBn ? (
              <>আপনার ব্যবসার হিসাব,<br />এক জায়গায় গোছানো</>
            ) : (
              <>Your entire business,<br />organized in one place</>
            )}
          </h1>
          <p className="mt-5 text-gray-500 dark:text-gray-400 text-base sm:text-lg">
            {isBn
              ? 'বিক্রয়, ক্রয়, ইনভেন্টরি, হিসাব আর কর্মচারী — সব মডিউল একসাথে, বাংলা আর ইংরেজি দুই ভাষাতেই।'
              : 'Sales, purchase, inventory, accounting, and employees — every module together, in Bangla and English.'}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 btn-primary px-7 py-3.5 text-base font-semibold"
            >
              {isBn ? 'শুরু করুন' : "Let's Start"}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Business type selector — signature interactive element */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <p className="text-center text-sm font-medium text-gray-400 dark:text-gray-500 mb-4">
          {isBn ? 'আপনার ব্যবসার ধরন বেছে নিন' : 'Choose your business type'}
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => {
            const Icon = cat.icon
            const active = cat.key === activeCategory
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150',
                  active
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-blue-950'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-blue-200 dark:hover:border-blue-900 hover:text-blue-700 dark:hover:text-blue-300',
                )}
              >
                <Icon size={16} />
                {isBn ? cat.label_bn : cat.label_en}
              </button>
            )
          })}
        </div>

        <div className="card p-6 sm:p-8 bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/30 dark:to-gray-900 border-blue-100 dark:border-blue-900/50">
          <p className="text-center text-gray-700 dark:text-gray-300 font-medium max-w-lg mx-auto mb-8">
            {isBn ? current.focus_bn : current.focus_en}
          </p>

          {/* Module grid, reordered + highlighted per selected business type */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {orderedModules.map((key) => {
              const mod = moduleList[key]
              const Icon = mod.icon
              const isTop = highlighted.has(key)
              return (
                <div
                  key={key}
                  className={cn(
                    'rounded-xl p-4 border transition-all duration-200',
                    isTop
                      ? 'bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800 shadow-sm'
                      : 'bg-white/50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800 opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      isTop ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400',
                    )}>
                      <Icon size={16} />
                    </div>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {isBn ? mod.bn : mod.en}
                    </span>
                    {isTop && <Check size={14} className="text-blue-600 dark:text-blue-400 ml-auto shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {isBn ? mod.desc_bn : mod.desc_en}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Trust / premium features strip */}
      <section className="bg-gray-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <div className="grid sm:grid-cols-3 gap-6">
            {trustPoints.map((p, i) => {
              const Icon = p.icon
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-white" />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 pt-1.5 leading-relaxed">
                    {isBn ? p.bn : p.en}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-6xl mx-auto px-5 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {isBn ? 'আজই আপনার ব্যবসা ডিজিটাল করুন' : 'Digitize your business today'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-7 max-w-md mx-auto">
          {isBn ? 'সেটআপ করতে সময় লাগবে মাত্র কয়েক মিনিট।' : 'Setup takes only a few minutes.'}
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center gap-2 btn-primary px-7 py-3.5 text-base font-semibold"
        >
          {isBn ? 'শুরু করুন' : "Let's Start"}
          <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="border-t border-gray-100 dark:border-gray-800 py-6">
        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          © {new Date().getFullYear()} Business Suites
        </p>
      </footer>
    </div>
  )
}
