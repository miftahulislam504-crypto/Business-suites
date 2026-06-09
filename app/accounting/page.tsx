'use client'

import { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ExpenseForm } from '@/components/accounting/ExpenseForm'
import { JournalEntryForm } from '@/components/accounting/JournalEntryForm'
import { AccountSetupModal } from '@/components/accounting/AccountSetupModal'
import {
  getAccounts, getExpenses, getJournalEntries, deleteExpense,
} from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import {
  BookOpen, Receipt, BarChart2, Plus,
  Trash2, Loader2, RefreshCw, TrendingUp,
  TrendingDown, Wallet, Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Account, Expense, JournalEntry } from '@/lib/types'

type Tab = 'overview' | 'expenses' | 'journal' | 'ledger'

const accountTypeLabel: Record<string, { bn: string; color: string }> = {
  asset:     { bn: 'সম্পদ',    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950'     },
  liability: { bn: 'দায়',      color: 'text-red-600 bg-red-50 dark:bg-red-950'         },
  equity:    { bn: 'মালিকানা', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
  income:    { bn: 'আয়',       color: 'text-green-600 bg-green-50 dark:bg-green-950'   },
  expense:   { bn: 'ব্যয়',     color: 'text-orange-600 bg-orange-50 dark:bg-orange-950'},
}

export default function AccountingPage() {
  const { activeBusiness } = useAppStore()
  const [tab,          setTab]          = useState<Tab>('overview')
  const [accounts,     setAccounts]     = useState<Account[]>([])
  const [expenses,     setExpenses]     = useState<Expense[]>([])
  const [journals,     setJournals]     = useState<JournalEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showExpense,  setShowExpense]  = useState(false)
  const [showJournal,  setShowJournal]  = useState(false)
  const [showSetup,    setShowSetup]    = useState(false)

  async function load() {
    if (!activeBusiness) return
    setLoading(true)
    try {
      const [accs, exps, jnls] = await Promise.all([
        getAccounts(activeBusiness.id),
        getExpenses(activeBusiness.id),
        getJournalEntries(activeBusiness.id),
      ])
      setAccounts(accs)
      setExpenses(exps)
      setJournals(jnls)
      if (accs.length === 0) setShowSetup(true)
    } catch { toast.error('লোড হয়নি') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [activeBusiness])

  // Financial summary
  const summary = useMemo(() => {
    const totalAssets     = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + a.balance, 0)
    const totalLiabilities= accounts.filter(a => a.type === 'liability').reduce((s, a) => s + a.balance, 0)
    const totalIncome     = accounts.filter(a => a.type === 'income').reduce((s, a) => s + a.balance, 0)
    const totalExpenseAcc = accounts.filter(a => a.type === 'expense').reduce((s, a) => s + a.balance, 0)
    const totalExpenses   = expenses.reduce((s, e) => s + e.amount, 0)
    const netProfit       = totalIncome - totalExpenseAcc - totalExpenses
    return { totalAssets, totalLiabilities, totalIncome, totalExpenses, netProfit }
  }, [accounts, expenses])

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [expenses])

  // Month expenses
  const thisMonthExpenses = useMemo(() => {
    const now = new Date()
    return expenses.filter(e => {
      const d = e.date instanceof Date ? e.date : new Date((e.date as any).seconds * 1000)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((s, e) => s + e.amount, 0)
  }, [expenses])

  async function handleDeleteExpense(id: string) {
    try {
      await deleteExpense(id)
      toast.success('ব্যয় মুছে গেছে')
      load()
    } catch { toast.error('সমস্যা হয়েছে') }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'সারসংক্ষেপ',   icon: <BarChart2 size={15} />  },
    { key: 'expenses', label: 'ব্যয়',          icon: <Receipt size={15} />    },
    { key: 'journal',  label: 'জার্নাল',        icon: <BookOpen size={15} />   },
    { key: 'ledger',   label: 'লেজার',          icon: <Scale size={15} />      },
  ]

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">হিসাব-নিকাশ</h1>
          <p className="text-sm text-gray-400 mt-0.5">Accounting</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowExpense(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors">
            <Plus size={15} /> ব্যয়
          </button>
          <button onClick={() => setShowJournal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 text-sm font-medium hover:bg-indigo-100 transition-colors">
            <Plus size={15} /> জার্নাল
          </button>
          <button onClick={load}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'মোট সম্পদ',      value: summary.totalAssets,      color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950',   icon: <TrendingUp size={16} />   },
          { label: 'মোট দায়',        value: summary.totalLiabilities, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950',     icon: <TrendingDown size={16} /> },
          { label: 'মোট আয়',         value: summary.totalIncome,      color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950', icon: <Wallet size={16} />       },
          { label: 'মোট ব্যয়',        value: summary.totalExpenses,    color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950',icon: <Receipt size={16} />     },
          { label: 'নিট মুনাফা',      value: summary.netProfit,        color: summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: summary.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-red-50 dark:bg-red-950', icon: <Scale size={16} /> },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-2">
            <div className={cn('p-2 rounded-lg shrink-0', s.bg, s.color)}>{s.icon}</div>
            <div className="min-w-0">
              <p className={cn('font-bold leading-tight truncate', s.color)}>
                ৳{Math.abs(s.value).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-5 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
              tab === t.key
                ? 'text-indigo-600 border-indigo-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 dark:hover:text-gray-300',
            )}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* This month expenses */}
              <div className="card">
                <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">এই মাসের ব্যয়</h3>
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-red-600">৳{thisMonthExpenses.toLocaleString()}</p>
                  <p className="text-sm text-gray-400 mt-1">{new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Expense by category */}
              <div className="card">
                <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">ক্যাটাগরি অনুযায়ী ব্যয়</h3>
                {expenseByCategory.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">কোনো ব্যয় নেই</p>
                ) : (
                  <div className="space-y-2">
                    {expenseByCategory.slice(0, 6).map(([cat, amt]) => {
                      const maxAmt = expenseByCategory[0][1]
                      const pct    = (amt / maxAmt) * 100
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 dark:text-gray-300 truncate">{cat}</span>
                            <span className="font-semibold text-red-600 ml-2 shrink-0">৳{amt.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                            <div className="bg-red-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Balance sheet summary */}
              <div className="card lg:col-span-2">
                <h3 className="font-bold mb-4 text-gray-800 dark:text-gray-100">ব্যালেন্স শিট সারসংক্ষেপ</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-2 text-sm">সম্পদ (Assets)</h4>
                    {accounts.filter(a => a.type === 'asset').map(a => (
                      <div key={a.id} className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{a.name}</span>
                        <span className="font-medium">৳{a.balance.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 font-bold text-blue-600">
                      <span>মোট সম্পদ</span>
                      <span>৳{summary.totalAssets.toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-600 mb-2 text-sm">দায় ও মালিকানা</h4>
                    {accounts.filter(a => a.type === 'liability' || a.type === 'equity').map(a => (
                      <div key={a.id} className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{a.name}</span>
                        <span className="font-medium">৳{a.balance.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 font-bold text-red-600">
                      <span>মোট দায়+মালিকানা</span>
                      <span>৳{summary.totalLiabilities.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EXPENSES TAB */}
          {tab === 'expenses' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">মোট {expenses.length}টি ব্যয়</p>
                <button onClick={() => setShowExpense(true)}
                  className="flex items-center gap-1.5 btn-primary px-4 py-2">
                  <Plus size={15} /> নতুন ব্যয়
                </button>
              </div>
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-gray-400">
                  <Receipt size={48} className="mb-3 opacity-30" />
                  <p>কোনো ব্যয় নেই</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map(expense => (
                    <div key={expense.id} className="card flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center shrink-0">
                        <Receipt size={16} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{expense.category}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {expense.description || 'কোনো বিবরণ নেই'} • {expense.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-red-600">৳{expense.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">
                          {expense.date instanceof Date
                            ? expense.date.toLocaleDateString('bn-BD')
                            : new Date((expense.date as any).seconds * 1000).toLocaleDateString('bn-BD')}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteExpense(expense.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* JOURNAL TAB */}
          {tab === 'journal' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">মোট {journals.length}টি এন্ট্রি</p>
                <button onClick={() => setShowJournal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors">
                  <Plus size={15} /> জার্নাল এন্ট্রি
                </button>
              </div>
              {journals.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-gray-400">
                  <BookOpen size={48} className="mb-3 opacity-30" />
                  <p>কোনো জার্নাল এন্ট্রি নেই</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {journals.map(j => (
                    <div key={j.id} className="card">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-sm">{j.description}</p>
                          {j.reference && <p className="text-xs text-gray-400">REF: {j.reference}</p>}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {j.date instanceof Date
                            ? j.date.toLocaleDateString('bn-BD')
                            : new Date((j.date as any).seconds * 1000).toLocaleDateString('bn-BD')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {j.lines.map((line, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                'text-xs font-bold px-1.5 py-0.5 rounded',
                                line.type === 'debit'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                                  : 'bg-green-100 dark:bg-green-950 text-green-600',
                              )}>
                                {line.type === 'debit' ? 'ডে' : 'ক্রে'}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300">{line.accountName}</span>
                            </div>
                            <span className="font-medium">৳{line.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEDGER TAB */}
          {tab === 'ledger' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(accountTypeLabel).map(([type, config]) => {
                  const accs = accounts.filter(a => a.type === type)
                  if (accs.length === 0) return null
                  return (
                    <div key={type} className="card">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', config.color)}>
                          {config.bn}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {accs.map(acc => (
                          <div key={acc.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{acc.name}</span>
                            <span className={cn(
                              'font-bold text-sm',
                              acc.balance > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400',
                            )}>
                              ৳{acc.balance.toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold text-sm pt-1">
                          <span className={config.color.split(' ')[0]}>মোট</span>
                          <span className={config.color.split(' ')[0]}>
                            ৳{accs.reduce((s, a) => s + a.balance, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showSetup  && <AccountSetupModal onDone={() => { setShowSetup(false); load() }} />}
      {showExpense && <ExpenseForm onClose={() => setShowExpense(false)} onSaved={() => { setShowExpense(false); load() }} />}
      {showJournal && <JournalEntryForm onClose={() => setShowJournal(false)} onSaved={() => { setShowJournal(false); load() }} />}
    </MainLayout>
  )
}
