'use client'

import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  value: string
  change?: string
  up?: boolean
  icon: LucideIcon
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'yellow'
  onClick?: () => void
}

const colorMap = {
  blue:   { icon: 'bg-blue-50 dark:bg-blue-950 text-blue-600',   border: 'hover:border-blue-200 dark:hover:border-blue-800' },
  green:  { icon: 'bg-green-50 dark:bg-green-950 text-green-600', border: 'hover:border-green-200 dark:hover:border-green-800' },
  red:    { icon: 'bg-red-50 dark:bg-red-950 text-red-600',       border: 'hover:border-red-200 dark:hover:border-red-800' },
  orange: { icon: 'bg-orange-50 dark:bg-orange-950 text-orange-600', border: 'hover:border-orange-200 dark:hover:border-orange-800' },
  purple: { icon: 'bg-purple-50 dark:bg-purple-950 text-purple-600', border: 'hover:border-purple-200 dark:hover:border-purple-800' },
  yellow: { icon: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600', border: 'hover:border-yellow-200 dark:hover:border-yellow-800' },
}

export function StatCard({ title, value, change, up, icon: Icon, color, onClick }: Props) {
  const c = colorMap[color]
  return (
    <div
      onClick={onClick}
      className={cn(
        'card border transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        c.border,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl', c.icon)}>
          <Icon size={18} />
        </div>
        {change !== undefined && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
            up
              ? 'text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400'
              : 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
          )}>
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {change}
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{title}</p>
    </div>
  )
}
