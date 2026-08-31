'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'

interface Action {
  label: string
  page: string
}

interface Props {
  role: 'user' | 'assistant'
  content: string
  actions?: Action[]
  isTyping?: boolean
}

function TraitAIAvatar() {
  return (
    <div className="relative w-8 h-8 flex-shrink-0">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 blur-sm opacity-60" />
      <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center border border-violet-400/30">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="10" r="3" fill="white" />
          <path d="M7 18.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
          <circle cx="9" cy="8" r="1" fill="white" />
          <circle cx="15" cy="8" r="1" fill="white" />
        </svg>
      </div>
    </div>
  )
}

export default function TraitAIMessage({ role, content, actions, isTyping }: Props) {
  const { navigateTo } = useAppStore()

  if (role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex justify-end mb-3"
      >
        <div className="max-w-[80%] bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed shadow-lg shadow-violet-500/20">
          {content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex gap-2.5 mb-3 items-start"
    >
      <TraitAIAvatar />
      <div className="max-w-[80%]">
        {isTyping ? (
          <div className="bg-[#1a1a2e] border border-violet-500/20 px-4 py-3 rounded-2xl rounded-tl-md">
            <div className="flex gap-1.5 items-center">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                className="w-2 h-2 bg-violet-400 rounded-full"
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 bg-violet-400 rounded-full"
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 bg-violet-400 rounded-full"
              />
            </div>
          </div>
        ) : (
          <div className="bg-[#1a1a2e] border border-violet-500/20 px-4 py-3 rounded-2xl rounded-tl-md text-sm text-gray-100 leading-relaxed shadow-lg shadow-black/20">
            {content.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < content.split('\n').length - 1 && <br />}
              </span>
            ))}
          </div>
        )}

        {actions && actions.length > 0 && !isTyping && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {actions.map((action, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                onClick={() => navigateTo(action.page as any)}
                className="bg-gradient-to-r from-violet-600/80 to-indigo-600/80 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-xl border border-violet-400/30 transition-all duration-200 active:scale-95 shadow-md shadow-violet-500/10"
              >
                {action.label} →
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
