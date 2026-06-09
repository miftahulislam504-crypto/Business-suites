'use client'

import { Sparkles } from 'lucide-react'

interface Props {
  onSelect: (q: string) => void
}

const questions = [
  'এই মাসে আমার মোট লাভ কত?',
  'সবচেয়ে বেশি বিক্রিত পণ্য কোনটি?',
  'কোন কাস্টমারের পাওনা সবচেয়ে বেশি?',
  'কোন পণ্যের স্টক কম আছে?',
  'এই মাসে সবচেয়ে বেশি ব্যয় হয়েছে কোন খাতে?',
  'আমার ব্যবসার এখন কী অবস্থা?',
  'কোন পণ্যে সবচেয়ে বেশি লাভ?',
  'কাল কতটি বিক্রয় হয়েছে?',
  'উচ্চ ঝুঁকির কাস্টমার কারা?',
  'মুনাফা মার্জিন কত?',
  'বিক্রয় বাড়ানোর পরামর্শ দাও',
  'ব্যয় কমানোর উপায় কী?',
]

export function SuggestedQuestions({ onSelect }: Props) {
  return (
    <div className="py-4 px-2">
      <div className="flex items-center gap-1.5 mb-3 justify-center">
        <Sparkles size={14} className="text-indigo-500" />
        <p className="text-xs font-medium text-gray-500">কিছু প্রশ্ন করতে পারো</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {questions.map(q => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
