'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, CheckCircle2, XCircle, Clock, Coffee } from 'lucide-react'
import { getEmployees, markAttendance, getAttendanceByDate } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Employee, Attendance } from '@/lib/types'

interface Props {
  onClose: () => void
}

type AttStatus = 'present' | 'absent' | 'halfday' | 'leave'

const statusConfig: Record<AttStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  present: { label: 'উপস্থিত', icon: <CheckCircle2 size={14} />, color: 'text-green-600',  bg: 'bg-green-500'  },
  absent:  { label: 'অনুপস্থিত',icon: <XCircle size={14} />,     color: 'text-red-600',    bg: 'bg-red-500'    },
  halfday: { label: 'অর্ধদিন', icon: <Clock size={14} />,        color: 'text-orange-600', bg: 'bg-orange-500' },
  leave:   { label: 'ছুটি',    icon: <Coffee size={14} />,        color: 'text-blue-600',   bg: 'bg-blue-500'   },
}

export function AttendanceModal({ onClose }: Props) {
  const { activeBusiness, user } = useAppStore()
  const [employees,   setEmployees]   = useState<Employee[]>([])
  const [attendance,  setAttendance]  = useState<Record<string, AttStatus>>({})
  const [existing,    setExisting]    = useState<Attendance[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [date,        setDate]        = useState(new Date().toISOString().split('T')[0])

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const [emps, att] = await Promise.all([
        getEmployees(activeBusiness.id),
        getAttendanceByDate(activeBusiness.id, new Date(date)),
      ])
      const activeEmps = emps.filter(e => e.status === 'active')
      setEmployees(activeEmps)
      setExisting(att)
      // Pre-fill existing attendance
      const map: Record<string, AttStatus> = {}
      att.forEach(a => { map[a.employeeId] = a.status })
      // Default: present for all
      activeEmps.forEach(e => { if (!map[e.id]) map[e.id] = 'present' })
      setAttendance(map)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [activeBusiness, date])

  function toggle(employeeId: string, status: AttStatus) {
    setAttendance(prev => ({ ...prev, [employeeId]: status }))
  }

  async function handleSave() {
    if (!activeBusiness || !user) return
    setSaving(true)
    try {
      const alreadyMarked = new Set(existing.map(a => a.employeeId))
      const newEntries = employees.filter(e => !alreadyMarked.has(e.id))
      for (const emp of newEntries) {
        await markAttendance({
          businessId:   activeBusiness.id,
          employeeId:   emp.id,
          employeeName: emp.name,
          date:         new Date(date),
          status:       attendance[emp.id] ?? 'present',
          createdAt:    new Date(),
        })
      }
      const present = Object.values(attendance).filter(s => s === 'present').length
      toast.success(`হাজিরা সংরক্ষণ হয়েছে — ${present}/${employees.length} জন উপস্থিত`)
      onClose()
    } catch { toast.error('সমস্যা হয়েছে') }
    finally  { setSaving(false) }
  }

  const presentCount = Object.values(attendance).filter(s => s === 'present').length
  const absentCount  = Object.values(attendance).filter(s => s === 'absent').length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="font-bold">দৈনিক হাজিরা</h2>
            <p className="text-sm text-gray-500">{employees.length} জন কর্মচারী</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0 space-y-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
          {/* Summary */}
          <div className="flex gap-2">
            {[
              { label: 'উপস্থিত', count: presentCount,                color: 'text-green-600 bg-green-50 dark:bg-green-950' },
              { label: 'অনুপস্থিত',count: absentCount,                color: 'text-red-600 bg-red-50 dark:bg-red-950'       },
              { label: 'অন্যান্য', count: employees.length - presentCount - absentCount, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950' },
            ].map(s => (
              <div key={s.label} className={cn('flex-1 text-center py-2 rounded-xl text-xs font-medium', s.color)}>
                <p className="text-lg font-bold">{s.count}</p>
                <p>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
          ) : employees.length === 0 ? (
            <p className="text-center text-gray-400 py-10">কোনো কর্মচারী নেই</p>
          ) : (
            employees.map(emp => {
              const status = attendance[emp.id] ?? 'present'
              const isMarked = existing.some(a => a.employeeId === emp.id)
              return (
                <div key={emp.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                    {emp.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.designation}</p>
                  </div>
                  {isMarked ? (
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusConfig[status].color, 'bg-gray-100 dark:bg-gray-700')}>
                      {statusConfig[status].label} ✓
                    </span>
                  ) : (
                    <div className="flex gap-1">
                      {(Object.keys(statusConfig) as AttStatus[]).map(s => (
                        <button key={s} onClick={() => toggle(emp.id, s)}
                          title={statusConfig[s].label}
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                            status === s
                              ? `${statusConfig[s].bg} text-white`
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300',
                          )}>
                          {statusConfig[s].icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onClose} className="flex-1 btn-secondary py-3">বাতিল</button>
          <button onClick={handleSave} disabled={saving || loading}
            className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            হাজিরা সংরক্ষণ করো
          </button>
        </div>
      </div>
    </div>
  )
}
