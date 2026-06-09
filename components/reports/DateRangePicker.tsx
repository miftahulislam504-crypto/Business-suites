'use client'

import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DateRange {
  from: Date
  to:   Date
  label: string
}

interface Props {
  value:    DateRange
  onChange: (range: DateRange) => void
}

function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0,0,0,0); return x
}
function endOfDay(d: Date) {
  const x = new Date(d); x.setHours(23,59,59,999); return x
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  const now   = new Date()
  const today = startOfDay(now)

  const presets: DateRange[] = [
    {
      label: 'আজ',
      from:  today,
      to:    endOfDay(now),
    },
    {
      label: 'গতকাল',
      from:  startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)),
      to:    endOfDay(new Date(now.getFullYear(),   now.getMonth(), now.getDate() - 1)),
    },
    {
      label: 'এই সপ্তাহ',
      from:  startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())),
      to:    endOfDay(now),
    },
    {
      label: 'এই মাস',
      from:  startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      to:    endOfDay(now),
    },
    {
      label: 'গত মাস',
      from:  startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to:    endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    },
    {
      label: 'এই বছর',
      from:  startOfDay(new Date(now.getFullYear(), 0, 1)),
      to:    endOfDay(now),
    },
  ]

  function applyCustom() {
    if (!customFrom || !customTo) return
    onChange({
      label: `${customFrom} — ${customTo}`,
      from:  startOfDay(new Date(customFrom)),
      to:    endOfDay(new Date(customTo)),
    })
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium hover:border-blue-400 transition-colors"
      >
        <Calendar size={15} className="text-blue-600" />
        {value.label}
        <ChevronDown size={14} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-40 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-3 w-64">
          <div className="space-y-1 mb-3">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => { onChange(p); setOpen(false) }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  value.label === p.label
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
            <p className="text-xs font-medium text-gray-500">কাস্টম তারিখ</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="input-field text-xs py-1.5" />
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="input-field text-xs py-1.5" />
            </div>
            <button onClick={applyCustom}
              className="w-full btn-primary py-1.5 text-sm">
              প্রয়োগ করো
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
