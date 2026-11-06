'use client'

import { useState } from 'react'
import { X, UserPlus, Trash2, Loader2, Crown, ShieldCheck, Calculator, ShoppingBag } from 'lucide-react'
import {
  addStaffMember, removeStaffMember, updateStaffRole,
  findUserByEmail, getBusiness, userMessage,
} from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
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
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', r.color)}>
      {r.icon} {r.bn}
    </span>
  )
}

export function StaffModal({ business, onClose, onUpdated }: Props) {
  const { user } = useAppStore()

  const [members, setMembers]       = useState<BusinessMember[]>(business.members)
  const [adding, setAdding]         = useState(false)
  const [identifier, setIdentifier] = useState('')   // ইমেইল অথবা UID
  const [name, setName]             = useState('')
  const [role, setRole]             = useState<UserRole>('salesman')
  const [loading, setLoading]       = useState(false)

  const isOwner =
    !!user &&
    (business.ownerId === user.uid ||
      members.some((m) => m.uid === user.uid && m.role === 'owner'))

  // বদলের পর সার্ভার থেকে নতুন তালিকা আনো
  async function refresh() {
    const fresh = await getBusiness(business.id)
    if (fresh) setMembers(fresh.members)
    onUpdated()
  }

  async function handleAdd() {
    const input = identifier.trim()
    if (!input) { toast.error('ইমেইল বা UID দাও'); return }
    if (!user)  return

    setLoading(true)
    try {
      let uid        = input
      let memberName = name.trim()

      if (input.includes('@')) {
        const found = await findUserByEmail(input)
        if (!found) {
          toast.error('এই ইমেইলে কেউ এখনো লগইন করেননি। তাকে একবার লগইন করতে বলো, অথবা UID দাও')
          return
        }
        uid        = found.uid
        memberName = memberName || found.displayName || input
      }
      if (!memberName) { toast.error('নাম দাও'); return }

      await addStaffMember(
        business.id,
        { uid, name: memberName, role, joinedAt: new Date() },
        user.uid,
      )
      toast.success(role === 'owner' ? 'নতুন মালিক যোগ হয়েছে' : 'স্টাফ যোগ হয়েছে')
      setIdentifier(''); setName(''); setRole('salesman'); setAdding(false)
      await refresh()
    } catch (e) {
      toast.error(userMessage(e, 'সমস্যা হয়েছে'))
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(member: BusinessMember) {
    if (!user) return
    if (!window.confirm(`"${member.name}"-কে সরাবে?`)) return
    setLoading(true)
    try {
      await removeStaffMember(business.id, member.uid, user.uid)
      toast.success('সরানো হয়েছে')
      await refresh()
    } catch (e) {
      toast.error(userMessage(e, 'সমস্যা হয়েছে'))
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(member: BusinessMember, newRole: UserRole) {
    if (!user || newRole === member.role) return
    setLoading(true)
    try {
      await updateStaffRole(business.id, member.uid, newRole, user.uid)
      toast.success('ভূমিকা বদলানো হয়েছে')
      await refresh()
    } catch (e) {
      toast.error(userMessage(e, 'সমস্যা হয়েছে'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-lg">স্টাফ ও মালিক</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          <p className="text-sm text-gray-500 mb-3">
            মোট {members.length} জন • মালিক {members.filter((m) => m.role === 'owner').length} জন
          </p>
          {members.map((member) => {
            const isCreator = member.uid === business.ownerId
            return (
              <div
                key={member.uid}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
              >
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {member.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <RoleBadge role={member.role} />
                    {isCreator && <span className="text-xs text-gray-400">প্রতিষ্ঠাতা</span>}
                  </div>
                </div>

                {isOwner && !isCreator && (
                  <>
                    <select
                      value={member.role}
                      disabled={loading}
                      onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                      className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1.5 py-1"
                      aria-label="ভূমিকা বদলাও"
                    >
                      {roles.map((r) => (
                        <option key={r.value} value={r.value}>{r.bn}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemove(member)}
                      disabled={loading}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition-colors"
                      aria-label="সরাও"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Add form (শুধু মালিকের জন্য) */}
        {!isOwner ? (
          <p className="p-5 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 text-center">
            শুধু মালিক স্টাফ ও মালিক যোগ বা বদলাতে পারেন
          </p>
        ) : adding ? (
          <div className="p-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <input
              type="text"
              placeholder="ইমেইল অথবা Firebase UID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="input-field text-sm"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <input
              type="text"
              placeholder={identifier.includes('@') ? 'নাম (ঐচ্ছিক)' : 'নাম'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => (
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
            {role === 'owner' && (
              <p className="text-xs text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-500 rounded-lg px-3 py-2">
                মালিক ব্যবসার সব ডেটা দেখতে এবং স্টাফ ও অন্য মালিক বদলাতে পারবেন।
              </p>
            )}
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
              নতুন মালিক বা স্টাফ যোগ করো
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
