'use client'

import { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { EmployeeForm } from '@/components/employees/EmployeeForm'
import { PayrollModal } from '@/components/employees/PayrollModal'
import { AttendanceModal } from '@/components/employees/AttendanceModal'
import { getEmployees, getPayrollRecords, deleteEmployee } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  Plus, Search, UserCog, Phone,
  Edit2, Trash2, Loader2, RefreshCw,
  Wallet, Calendar, BarChart2,
  CheckCircle2, XCircle, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Employee, PayrollRecord } from '@/lib/types'

type Tab = 'employees' | 'payroll'

const statusColor: Record<string, string> = {
  active:     'text-green-600 bg-green-50 dark:bg-green-950',
  inactive:   'text-gray-500 bg-gray-100 dark:bg-gray-800',
  terminated: 'text-red-600 bg-red-50 dark:bg-red-950',
}
const statusLabel: Record<string, string> = {
  active: 'সক্রিয়', inactive: 'নিষ্ক্রিয়', terminated: 'বরখাস্ত',
}

const monthNames = ['জানু','ফেব','মার্চ','এপ্রি','মে','জুন','জুলা','আগ','সেপ','অক্টো','নভে','ডিসে']

export default function EmployeesPage() {
  const { activeBusiness } = useAppStore()
  const [tab,             setTab]            = useState<Tab>('employees')
  const [employees,       setEmployees]       = useState<Employee[]>([])
  const [payrollRecords,  setPayrollRecords]  = useState<PayrollRecord[]>([])
  const [loading,         setLoading]         = useState(true)
  const [search,          setSearch]          = useState('')
  const [showForm,        setShowForm]        = useState(false)
  const [editItem,        setEditItem]        = useState<Employee | null>(null)
  const [payrollItem,     setPayrollItem]     = useState<Employee | null>(null)
  const [showAttendance,  setShowAttendance]  = useState(false)
  const [confirmDel,      setConfirmDel]      = useState<Employee | null>(null)

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const [emps, payroll] = await Promise.all([
        getEmployees(activeBusiness.id),
        getPayrollRecords(activeBusiness.id),
      ])
      setEmployees(emps)
      setPayrollRecords(payroll)
    } catch { toast.error('লোড হয়নি') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [activeBusiness])

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees])

  const stats = useMemo(() => ({
    total:       activeEmployees.length,
    totalSalary: activeEmployees.reduce((s, e) => s + e.baseSalary + e.allowances, 0),
    thisMonth:   payrollRecords
      .filter(p => p.month === new Date().getMonth()+1 && p.year === new Date().getFullYear())
      .reduce((s, p) => s + p.netSalary, 0),
  }), [activeEmployees, payrollRecords])

  const filtered = useMemo(() => {
    let list = employees
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.phone.includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
      )
    }
    return list
  }, [employees, search])

  async function handleDelete(emp: Employee) {
    try {
      await deleteEmployee(emp.id)
      toast.success('কর্মচারী বরখাস্ত হয়েছে')
      setConfirmDel(null)
      load()
    } catch { toast.error('সমস্যা হয়েছে') }
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">কর্মচারী ব্যবস্থাপনা</h1>
          <p className="text-sm text-gray-400 mt-0.5">{stats.total} জন সক্রিয় কর্মচারী</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAttendance(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950 text-orange-600 text-sm font-medium hover:bg-orange-100 transition-colors">
            <Calendar size={15} /> হাজিরা
          </button>
          <button onClick={() => { setEditItem(null); setShowForm(true) }}
            className="btn-primary flex items-center gap-2 px-4 py-2.5">
            <Plus size={17} />
            <span className="hidden sm:inline">নতুন কর্মচারী</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">মোট কর্মচারী</p>
          <p className="font-bold text-xl text-blue-600">{stats.total}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">মাসিক বেতন বিল</p>
          <p className="font-bold text-xl text-purple-600">৳{stats.totalSalary.toLocaleString()}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500 mb-1">এই মাসে প্রদান</p>
          <p className="font-bold text-xl text-green-600">৳{stats.thisMonth.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-5">
        {[
          { key: 'employees', label: 'কর্মচারী তালিকা', icon: <UserCog size={14} /> },
          { key: 'payroll',   label: 'বেতন ইতিহাস',     icon: <Wallet size={14} />  },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as Tab)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-white dark:bg-gray-900 shadow-sm text-blue-600'
                : 'text-gray-500',
            )}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab === 'employees' && (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="নাম, ফোন বা পদবি দিয়ে খোঁজো..."
              className="input-field pl-9" />
          </div>
          <button onClick={load} className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Employee list */}
          {tab === 'employees' && (
            filtered.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-gray-400">
                <UserCog size={48} className="mb-3 opacity-30" />
                <p>কোনো কর্মচারী নেই</p>
                {!search && (
                  <button onClick={() => setShowForm(true)} className="mt-4 btn-primary px-5 py-2.5">
                    প্রথম কর্মচারী যোগ করো
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(emp => (
                  <div key={emp.id} className="card flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {emp.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{emp.name}</p>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor[emp.status])}>
                          {statusLabel[emp.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {emp.designation}
                        {emp.department && ` • ${emp.department}`}
                        {' • '}<Phone size={9} className="inline" /> {emp.phone}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-purple-600">
                        ৳{(emp.baseSalary + emp.allowances).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">মাসিক</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {emp.status === 'active' && (
                        <button onClick={() => setPayrollItem(emp)}
                          className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950 hover:bg-green-100 text-green-600 transition-colors"
                          title="বেতন দাও">
                          <Wallet size={14} />
                        </button>
                      )}
                      <button onClick={() => { setEditItem(emp); setShowForm(true) }}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-600">
                        <Edit2 size={14} />
                      </button>
                      {emp.status === 'active' && (
                        <button onClick={() => setConfirmDel(emp)}
                          className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 hover:bg-red-100 text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Payroll history */}
          {tab === 'payroll' && (
            payrollRecords.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-gray-400">
                <Wallet size={48} className="mb-3 opacity-30" />
                <p>কোনো বেতন রেকর্ড নেই</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payrollRecords.map(record => (
                  <div key={record.id} className="card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center shrink-0">
                      <Wallet size={16} className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{record.employeeName}</p>
                      <p className="text-xs text-gray-400">
                        {monthNames[record.month-1]} {record.year} • {record.designation} • {record.paymentMethod}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-purple-600">৳{record.netSalary.toLocaleString()}</p>
                      {record.bonus > 0 && <p className="text-xs text-green-600">+বোনাস ৳{record.bonus.toLocaleString()}</p>}
                      {record.deductions > 0 && <p className="text-xs text-red-500">-কর্তন ৳{record.deductions.toLocaleString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Modals */}
      {showForm && (
        <EmployeeForm
          employee={editItem}
          onClose={() => { setShowForm(false); setEditItem(null) }}
          onSaved={() => { setShowForm(false); setEditItem(null); load() }}
        />
      )}

      {payrollItem && (
        <PayrollModal
          employee={payrollItem}
          onClose={() => setPayrollItem(null)}
          onSaved={() => { setPayrollItem(null); load() }}
        />
      )}

      {showAttendance && (
        <AttendanceModal onClose={() => { setShowAttendance(false); load() }} />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-2">কর্মচারী বরখাস্ত করবে?</h3>
            <p className="text-gray-500 text-sm mb-5">
              <strong>{confirmDel.name}</strong>-কে বরখাস্ত করা হবে।
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 btn-secondary py-2.5">বাতিল</button>
              <button onClick={() => handleDelete(confirmDel)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                বরখাস্ত করো
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
