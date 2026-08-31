'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Sparkles, MessageCircle, Compass, BookOpen, HelpCircle, DollarSign, Lock, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/lib/store'

const quickActions = [
  { icon: BookOpen, label: 'Comprendre TRAIT', question: 'Qu\'est-ce que TRAIT et comment ça marche ?' },
  { icon: Compass, label: 'Utiliser l\'application', question: 'Comment utiliser l\'application TRAIT ?' },
  { icon: HelpCircle, label: 'Aide & Support', question: 'J\'ai besoin d\'aide avec TRAIT' },
  { icon: DollarSign, label: 'Frais & Limites', question: 'Quels sont les frais et limites sur TRAIT ?' },
  { icon: Lock, label: 'Sécurité', question: 'Comment fonctionne la sécurité sur TRAIT ?' },
  { icon: MessageCircle, label: 'Autres questions', question: 'Quels services TRAIT offre-t-il ?' },
]

export default function TraitAIWelcome() {
  const { goBack, user, navigateTo } = useAppStore()
  const userName = user?.name || user?.pseudo || 'Utilisateur'
  const userRole = user?.role || 'client'

  const roleLabel = userRole === 'agent' ? 'Agent' : userRole === 'seller' ? 'Fournisseur de service' : 'Client'

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-500/20">
        <button onClick={goBack} className="p-1.5 rounded-full hover:bg-white/5">
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>
        <p className="text-white font-semibold text-sm">TRAIT IA</p>
        <button className="p-1.5 rounded-full hover:bg-white/5">
          <Shield className="w-5 h-5 text-violet-400" />
        </button>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 blur-xl opacity-50 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center border-2 border-violet-400/30 shadow-lg shadow-violet-500/30">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="10" r="3" fill="white" />
                <path d="M7 18.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
                <circle cx="9" cy="8" r="1" fill="white" />
                <circle cx="15" cy="8" r="1" fill="white" />
              </svg>
            </div>
          </div>
          <h1 className="text-white text-xl font-bold">TRAIT IA</h1>
          <p className="text-violet-300 text-sm mt-1">Votre assistant intelligent</p>
        </motion.div>

        {/* Welcome Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1a1a2e] border border-violet-500/20 rounded-2xl p-5 mb-6 shadow-lg shadow-violet-500/5"
        >
          <p className="text-white text-sm leading-relaxed">
            Bonjour, <span className="font-bold text-violet-300">{userName}</span> 👋
          </p>
          <p className="text-gray-300 text-sm mt-2 leading-relaxed">
            Je suis TRAIT IA, votre assistant personnel. Je connais votre rôle (<span className="text-violet-300">{roleLabel}</span>) et je peux vous guider dans l&apos;application selon vos besoins.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3 font-medium">Questions rapides</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                onClick={() => navigateTo('trait-ai', { startMessage: action.question })}
                className="bg-[#1a1a2e] border border-violet-500/15 rounded-xl p-3 text-left hover:bg-violet-500/10 hover:border-violet-500/30 transition-all group"
              >
                <action.icon className="w-5 h-5 text-violet-400 mb-2 group-hover:text-violet-300 transition-colors" />
                <p className="text-white text-xs font-medium">{action.label}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Main CTA */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          onClick={() => navigateTo('trait-ai')}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-violet-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Discuter avec TRAIT IA
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  )
}
