'use client'

import { cn } from '@/lib/utils'
import { Bot, User, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export interface Message {
  id:      string
  role:    'user' | 'assistant'
  content: string
  time:    Date
}

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isUser  = message.role === 'user'
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
        isUser
          ? 'bg-blue-600 text-white'
          : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
      )}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      {/* Bubble */}
      <div className={cn(
        'max-w-[85%] relative',
        isUser ? 'items-end' : 'items-start',
      )}>
        <div className={cn(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-sm shadow-sm',
        )}>
          {/* Render with line breaks */}
          {message.content.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < message.content.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>

        {/* Time + copy */}
        <div className={cn(
          'flex items-center gap-2 mt-1',
          isUser ? 'justify-end' : 'justify-start',
        )}>
          <span className="text-xs text-gray-400">
            {message.time.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && (
            <button
              onClick={copy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
            >
              {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
