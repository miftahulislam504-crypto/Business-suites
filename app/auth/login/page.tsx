'use client'

import { useState, useRef, useEffect } from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Loader2, Phone, Shield } from 'lucide-react'

type Step = 'choose' | 'phone' | 'otp'

export default function LoginPage() {
  const [step, setStep]               = useState<Step>('choose')
  const [phone, setPhone]             = useState('+880')
  const [otp, setOtp]                 = useState('')
  const [loading, setLoading]         = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const recaptchaRef                  = useRef<HTMLDivElement>(null)
  const { language, toggleLanguage }  = useAppStore()

  // Google login
  async function handleGoogleLogin() {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      toast.success('লগইন সফল হয়েছে!')
    } catch (err: any) {
      toast.error('Google লগইন ব্যর্থ হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  // Send OTP
  async function handleSendOtp() {
    if (phone.length < 13) {
      toast.error('সঠিক ফোন নম্বর দাও')
      return
    }
    setLoading(true)
    try {
      const recaptcha = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      })
      const result = await signInWithPhoneNumber(auth, phone, recaptcha)
      setConfirmation(result)
      setStep('otp')
      toast.success('OTP পাঠানো হয়েছে')
    } catch (err: any) {
      toast.error('OTP পাঠাতে সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP
  async function handleVerifyOtp() {
    if (!confirmation || otp.length < 6) return
    setLoading(true)
    try {
      await confirmation.confirm(otp)
      toast.success('লগইন সফল হয়েছে!')
    } catch {
      toast.error('ভুল OTP কোড')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 flex items-center justify-center p-4">

      {/* Language toggle */}
      <button
        onClick={toggleLanguage}
        className="fixed top-4 right-4 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium shadow-sm"
      >
        {language === 'bn' ? 'English' : 'বাংলা'}
      </button>

      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {language === 'bn' ? 'Business Suites-এ স্বাগতম' : 'Welcome to Business Suites'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {language === 'bn'
              ? 'আপনার ব্যবসা স্মার্টভাবে পরিচালনা করুন'
              : 'Manage your business smartly'}
          </p>
        </div>

        <div className="card shadow-xl dark:shadow-gray-900/50">

          {/* Step: Choose */}
          {step === 'choose' && (
            <div className="space-y-3">
              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 font-medium transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <svg viewBox="0 0 48 48" className="w-5 h-5">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.3 30.2 0 24 0 14.8 0 7 5.4 3.2 13.3l7.8 6C12.9 13.3 18 9.5 24 9.5z"/>
                    <path fill="#4A90D9" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.6h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.2z"/>
                    <path fill="#34A853" d="M10.9 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 4 1 7.7 2.7 11l8.2-6.3z"/>
                    <path fill="#FBBC05" d="M24 48c6.1 0 11.2-2 14.9-5.5l-7.6-5.9c-2 1.4-4.6 2.2-7.3 2.2-5.9 0-10.9-4-12.7-9.4l-8.2 6.3C7.2 43 15 48 24 48z"/>
                  </svg>
                )}
                {language === 'bn' ? 'Google দিয়ে লগইন' : 'Login with Google'}
              </button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400">
                  {language === 'bn' ? 'অথবা' : 'or'}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Phone */}
              <button
                onClick={() => setStep('phone')}
                className="w-full flex items-center justify-center gap-2 btn-primary py-3"
              >
                <Phone size={16} />
                {language === 'bn' ? 'ফোন নম্বর দিয়ে লগইন' : 'Login with Phone'}
              </button>
            </div>
          )}

          {/* Step: Phone */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {language === 'bn' ? 'ফোন নম্বর' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                  placeholder="+8801XXXXXXXXX"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {language === 'bn' ? 'উদাহরণ: +8801712345678' : 'Example: +8801712345678'}
                </p>
              </div>
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {language === 'bn' ? 'OTP পাঠাও' : 'Send OTP'}
              </button>
              <button onClick={() => setStep('choose')} className="w-full btn-secondary py-2.5 text-sm">
                {language === 'bn' ? '← পেছনে যাও' : '← Go Back'}
              </button>
            </div>
          )}

          {/* Step: OTP */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Shield size={22} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-center text-sm text-gray-500">
                {language === 'bn'
                  ? `${phone} নম্বরে OTP পাঠানো হয়েছে`
                  : `OTP sent to ${phone}`}
              </p>
              <input
                type="number"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="input-field text-center text-2xl tracking-widest"
                placeholder="------"
                maxLength={6}
              />
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {language === 'bn' ? 'যাচাই করো' : 'Verify'}
              </button>
              <button onClick={() => setStep('phone')} className="w-full btn-secondary py-2.5 text-sm">
                {language === 'bn' ? 'নতুন OTP পাঠাও' : 'Resend OTP'}
              </button>
            </div>
          )}
        </div>

        {/* Recaptcha container (invisible) */}
        <div id="recaptcha-container" ref={recaptchaRef} />
      </div>
    </div>
  )
}
