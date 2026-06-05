'use client'

import { Building2, Users, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Business } from '@/lib/types'

interface Props {
  business: Business
  active: boolean
  onClick: () => void
}

const categoryLabel: Record<string, { bn: string; en: string }> = {
  retail:       { bn: 'খুচরা',    en: 'Retail'       },
  wholesale:    { bn: 'পাইকারি',  en: 'Wholesale'    },
  restaurant:   { bn: 'রেস্তোরাঁ', en: 'Restaurant'  },
  pharmacy:     { bn: 'ফার্মেসি', en: 'Pharmacy'     },
  construction: { bn: 'নির্মাণ',  en: 'Construction' },
  fishfarm:     { bn: 'মৎস্য',    en: 'Fish Farm'    },
  other:        { bn: 'অন্যান্য', en: 'Other'        },
}

export function BusinessCard({ business, active, onClick }: Props) {
  const cat = categoryLabel[business.category] ?? categoryLabel.other

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4',
        active
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
          : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-200 dark:hover:border-blue-800',
      )}
    >
      {/* Logo / Icon */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0',
          active
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
        )}
      >
        {business.name[0]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white truncate">
          {business.name}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {cat.bn} • {business.members.length} জন
        </p>
      </div>

      {/* Active badge */}
      {active ? (
        <CheckCircle2 size={20} className="text-blue-600 shrink-0" />
      ) : (
        <ChevronRight size={16} className="text-gray-400 shrink-0" />
      )}
    </button>
  )
}
