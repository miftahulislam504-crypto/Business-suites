'use client'

import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAppStore } from '@/store/useAppStore'
import type { User } from '@/lib/types'

export function useAuth() {
  const { user, setUser, activeBusiness } = useAppStore()

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
      } else {
        setUser(null)
      }
    })

    return () => unsubscribe()
  }, [setUser])

  return { user, activeBusiness }
}
