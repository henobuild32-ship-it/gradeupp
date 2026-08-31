'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'

export default function TraitAIFloatingButton() {
  const { user, navigateTo } = useAppStore()

  if (!user) return null

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => navigateTo('trait-ai-welcome')}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full shadow-xl shadow-violet-500/30 flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      }}
    >
      {/* Glow ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 blur-md opacity-40 animate-pulse" />

      {/* Avatar icon */}
      <div className="relative z-10">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="10" r="3" fill="white" />
          <path d="M7 18.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
          <circle cx="9" cy="8" r="1" fill="white" />
          <circle cx="15" cy="8" r="1" fill="white" />
        </svg>
      </div>
    </motion.button>
  )
}
