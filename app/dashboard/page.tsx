'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import { StatCard } from '@/components/ui/StatCard'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { LowStockAlert } from '@/components/dashboard/LowStockAlert'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { DuesSummary } from '@/components/dashboard/DuesSummary'
import { useAppStore } from '@/store/useAppStore'
import {
  ShoppingCart, TrendingUp, AlertCircle,
  Package, Wallet, Users,
} from 'lucide-react'

export default function DashboardPage() {
  const { language, activeBusiness, user } = useAppStore()

  const greeting = () => {
    const h = new Date().getHours()
    if (language === 'en') {
      if (h < 12) return 'Good Morning'
      if (h < 17) return 'Good Afternoon'
      return 'Good Evening'
    }
    if (h < 12) return 'শুভ সকাল'
    if (h < 17) return 'শুভ দুপুর'
    return 'শুভ সন্ধ্যা'
  }

  const stats = [
    {
      title: language === 'bn' ? 'আজকের বিক্রয়' : "Today's Sales",
      value: '৳১২,৫০০',
      change: '১২%',
      up: true,
      icon: ShoppingCart,
      color: 'blue' as const,
    },
    {
      title: language === 'bn' ? 'আজকের লাভ' : "Today's Profit",
      value: '৳৩,২৫০',
      change: '৮%',
      up: true,
      icon: TrendingUp,
      color: 'green' as const,
    },
    {
      title: language === 'bn' ? 'ক্যাশ ব্যালেন্স' : 'Cash Balance',
      value: '৳৪৮,০০০',
      change: '৩%',
      up: true,
      icon: Wallet,
      color: 'purple' as const,
    },
    {
      title: language === 'bn' ? 'মোট পাওনা' : 'Total Due',
      value: '৳৪৫,০০০',
      change: '৫%',
      up: false,
      icon: AlertCircle,
      color: 'red' as const,
    },
    {
      title: language === 'bn' ? 'লো স্টক আইটেম' : 'Low Stock Items',
      value: '৭টি',
      change: '+২',
      up: false,
      icon: Package,
      color: 'orange' as const,
    },
    {
      title: language === 'bn' ? 'সক্রিয় কাস্টমার' : 'Active Customers',
      value: '১৪৩',
      change: '৪%',
      up: true,
      icon: Users,
      color: 'yellow' as const,
    },
  ]

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          {greeting()}, {user?.displayName?.split(' ')[0] ?? 'স্বাগতম'} 👋
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
          {activeBusiness?.name ?? 'ড্যাশবোর্ড'}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-5">
        <QuickActions />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <SalesChart />
        <CashFlowChart />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <LowStockAlert />
        </div>
        <div className="lg:col-span-1">
          <DuesSummary />
        </div>
        <div className="lg:col-span-1">
          <RecentTransactions />
        </div>
      </div>
    </MainLayout>
  )
}
