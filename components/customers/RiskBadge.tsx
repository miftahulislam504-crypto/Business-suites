'use client'

import { Shield, AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  score: number
  showLabel?: boolean
}

export function RiskBadge({ score, showLabel = true }: Props) {
  const level =
    score <= 20  ? { label: 'নিরাপদ',    color: 'text-green-600 bg-green-50 dark:bg-green-950',   icon: <Shield size={11} />        } :
    score <= 50  ? { label: 'মাঝারি',    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950', icon: <AlertTriangle size={11} /> } :
                   { label: 'উচ্চ ঝুঁকি', color: 'text-red-600 bg-red-50 dark:bg-red-950',          icon: <AlertCircle size={11} />   }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
      level.color,
    )}>
      {level.icon}
      {showLabel ? level.label : `${score}%`}
    </span>
  )
}
