'use client'

import Link from 'next/link'
import {
  ShoppingCart, Package, Users, TruckIcon,
  BookOpen, BarChart3, Plus, Zap,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const actions = [
  { href: '/sales/new',     icon: ShoppingCart, label_bn: 'নতুন বিক্রয়',  label_en: 'New Sale',     color: 'bg-blue-500'  },
  { href: '/purchase/new',  icon: TruckIcon,    label_bn: 'নতুন ক্রয়',    label_en: 'New Purchase', color: 'bg-purple-500' },
  { href: '/inventory/add', icon: Package,      label_bn: 'পণ্য যোগ',      label_en: 'Add Product',  color: 'bg-green-500'  },
  { href: '/customers/add', icon: Users,        label_bn: 'কাস্টমার যোগ',  label_en: 'Add Customer', color: 'bg-orange-500' },
  { href: '/accounting',    icon: BookOpen,     label_bn: 'হিসাব',         label_en: 'Accounting',   color: 'bg-red-500'    },
  { href: '/reports',       icon: BarChart3,    label_bn: 'রিপোর্ট',       label_en: 'Reports',      color: 'bg-indigo-500' },
]

export function QuickActions() {
  const { language } = useAppStore()

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-yellow-500" />
        <h2 className="font-bold text-gray-800 dark:text-gray-100">
          {language === 'bn' ? 'দ্রুত অ্যাকশন' : 'Quick Actions'}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {actions.map(({ href, icon: Icon, label_bn, label_en, color }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 group"
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform',
              color,
            )}>
              <Icon size={18} />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">
              {language === 'bn' ? label_bn : label_en}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
