'use client'

import { useState } from 'react'
import { X, UserPlus, Trash2, Loader2, Crown, ShieldCheck, Calculator, ShoppingBag } from 'lucide-react'
import { addStaffMember, removeStaffMember, updateStaffRole } from '@/lib/firestore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Business, BusinessMember, UserRole } from '@/lib/types'

interface Props {
  business: Business
  onClose: () => void
  onUpdated: () => void
}

const roles: { value: UserRole; bn: string; icon: React.ReactNode; color: string }[] = [
  { value: 'owner',     bn: 'মালিক',     icon: <Crown size={14} />,       color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950' },
  { value: 'manager',   bn: 'ম্যানেজার', icon: <ShieldCheck size={14} />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950'     },
  { value: 'accountant',bn: 'হিসাবরক্ষক',icon: <Calculator size={14} />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950'},
  { value: 'salesman',  bn: 'বিক্রয়কর্মী',icon:<ShoppingBag size={14} />,color: 'text-green-600 bg-green-50 dark:bg-green-950'  },
]

function RoleBadge({ role }: { role: UserRole }) {
  const r = roles.find((x) => x.value === role) ?? roles[3]
  return (
    <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', r.color)}>
      {r.icon} {r.bn}
    </span>
  )
}

export function StaffModal({ business, onClose, onUpdated }: Props) {
  const [adding, setAdding]   = useState(false)
  const [name, setName]       = useState('')
  const [uid, setUid]         = useState('')
  const [role, setRole]       = useState<UserRole>('salesman')
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!name.trim() || !uid.trim()) {
      toast.error('নাম ও UID দাও')
      return
    }
    setLoading(true)
    try {
      const member: BusinessMember = {
        uid: uid.trim(),
        name: name.trim(),
        role,
        joinedAt: new Date(),
      }
      await addStaffMember(business.id, member)
      toast.success('স্টাফ যোগ হয়েছে')
      setName(''); setUid(''); setAdding(false)
      onUpdated()
    } catch {
      toast.error('সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(memberUid: string) {
    if (memberUid === business.ownerId) {
      toast.error('মালিককে সরানো যাবে না')
      return
    }
    setLoading(true)
    try {
      await removeStaffMember(business.id, memberUid)
      toast.success('স্টাফ সরানো হয়েছে')
      onUpdated()
    } catch {
      toast.error('সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-lg">স্টাফ ম্যানেজমেন্ট</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          <p className="text-sm text-gray-500 mb-3">মোট {business.members.length} জন</p>
          {business.members.map((member) => (
            <div
              key={member.uid}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {member.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{member.name}</p>
                <RoleBadge role={member.role} />
              </div>
              {member.uid !== business.ownerId && (
                <button
                  onClick={() => handleRemove(member.uid)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add staff form */}
        {adding ? (
          <div className="p-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <input
              type="text"
              placeholder="স্টাফের নাম"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Firebase UID (স্টাফের)"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              className="input-field text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              {roles.filter(r => r.value !== 'owner').map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={cn(
                    'flex items-center gap-1.5 p-2 rounded-lg border text-sm transition-all',
                    role === r.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700'
                      : 'border-gray-200 dark:border-gray-700',
                  )}
                >
                  {r.icon} {r.bn}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 btn-secondary py-2">বাতিল</button>
              <button
                onClick={handleAdd}
                disabled={loading}
                className="flex-1 btn-primary py-2 flex items-center justify-center gap-1"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                যোগ করো
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setAdding(true)}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              নতুন স্টাফ যোগ করো
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
