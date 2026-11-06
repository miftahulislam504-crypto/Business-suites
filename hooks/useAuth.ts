'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { saveUserProfile } from '@/lib/firestore'
import { useAppStore } from '@/store/useAppStore'
import type { User } from '@/lib/types'

// প্রতি লগইনে একবারই প্রোফাইল সেভ হবে
let savedUid: string | null = null

export function useAuth() {
  const { user, setUser, activeBusiness } = useAppStore()
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const appUser: User = {
          uid:         firebaseUser.uid,
          email:       firebaseUser.email,
          phone:       firebaseUser.phoneNumber,
          displayName: firebaseUser.displayName,
          photoURL:    firebaseUser.photoURL,
          createdAt:   new Date(),
        }
        setUser(appUser)

        // ইমেইল দিয়ে মালিক/স্টাফ খোঁজার জন্য প্রোফাইল সেভ (ব্যর্থ হলে লগইন আটকায় না)
        if (savedUid !== firebaseUser.uid) {
          savedUid = firebaseUser.uid
          saveUserProfile({
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName,
            phone:       firebaseUser.phoneNumber,
          }).catch(() => { savedUid = null })
        }
      } else {
        setUser(null)
      }
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [setUser])

  return { user, activeBusiness, authLoading }
}
