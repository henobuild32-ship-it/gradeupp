'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Brain, Users, MessageCircle, Navigation, Lock } from 'lucide-react'
import { useAppStore } from '@/lib/store'

const features = [
  {
    icon: Brain,
    title: 'Expliquer le projet TRAIT',
    desc: 'Je vous explique le fonctionnement de l\'application et ses services.',
  },
  {
    icon: Users,
    title: 'Vous guider selon votre rôle',
    desc: 'Client, Fournisseur, Agent ou Administrateur : je m\'adapte à votre interface.',
  },
  {
    icon: MessageCircle,
    title: 'Répondre à vos questions',
    desc: 'Frais, limites, sécurité, transactions, utilisation de l\'application...',
  },
  {
    icon: Navigation,
    title: 'Vous conduire dans l\'application',
    desc: 'Je vous amène directement vers les interfaces utiles.',
  },
]

export default function TraitAIAbout() {
  const { goBack, navigateTo } = useAppStore()

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-violet-500/20">
        <button onClick={goBack} className="p-1.5 rounded-full hover:bg-white/5">
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>
        <p className="text-white font-semibold text-sm">À propos de TRAIT IA</p>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-6"
        >
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 blur-xl opacity-50 animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center border-2 border-violet-400/30 shadow-lg shadow-violet-500/30">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="10" r="3" fill="white" />
                <path d="M7 18.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
                <circle cx="9" cy="8" r="1" fill="white" />
                <circle cx="15" cy="8" r="1" fill="white" />
              </svg>
            </div>
          </div>
          <h1 className="text-white text-xl font-bold">TRAIT IA</h1>
          <p className="text-gray-400 text-sm mt-1">Votre assistant intelligent intégré à l&apos;application TRAIT.</p>
        </motion.div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-[#1a1a2e] border border-violet-500/15 rounded-xl p-4 flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{f.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-6"
        >
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm font-semibold">Important</p>
              <p className="text-gray-300 text-xs mt-1">
                Je n&apos;effectue aucune opération financière. Je suis là pour vous informer et vous guider en toute sécurité.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={() => navigateTo('trait-ai')}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-violet-500/30 active:scale-[0.98] transition-all"
        >
          Commencer à discuter →
        </motion.button>
      </div>
    </div>
  )
}
