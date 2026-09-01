'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, MoreVertical, Shield } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import TraitAIMessage from './TraitAIMessage'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: Array<{ label: string; page: string }>
}

export default function TraitAIChat() {
  const { goBack, user } = useAppStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const userName = user?.name || user?.pseudo || 'Utilisateur'
  const userRole = user?.role || 'client'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const history = updatedMessages.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/trait-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          userName,
          userRole,
          history,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.message, actions: data.actions },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.message || 'Désolé, une erreur est survenue.' },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Erreur de connexion. Veuillez réessayer.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const quickQuestions = [
    'Comment envoyer de l\'argent ?',
    'Quels sont les frais ?',
    'Comment retirer du cash ?',
    'Payer une facture',
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-[#0a0a1a] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-500/20 bg-[#0d0d20]/95 backdrop-blur-sm">
        <button onClick={goBack} className="p-1.5 rounded-full hover:bg-white/5">
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" fill="white" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-semibold">TRAIT IA</p>
            <p className="text-green-400 text-[10px]">● En ligne</p>
          </div>
        </div>
        <button className="p-1.5 rounded-full hover:bg-white/5">
          <Shield className="w-5 h-5 text-violet-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 blur-lg opacity-50" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center border border-violet-400/30">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="10" r="3" fill="white" />
                  <path d="M7 18.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
                  <circle cx="9" cy="8" r="1" fill="white" />
                  <circle cx="15" cy="8" r="1" fill="white" />
                </svg>
              </div>
            </div>
            <p className="text-white font-semibold text-lg">Bonjour, {userName} 👋</p>
            <p className="text-gray-400 text-sm mt-1 px-4">
              Je suis TRAIT IA, votre assistant personnel. Comment puis-je vous aider ?
            </p>

            <div className="mt-6 space-y-2 px-4">
              {quickQuestions.map((q, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left bg-[#1a1a2e] border border-violet-500/20 text-gray-300 text-sm px-4 py-3 rounded-xl hover:bg-violet-500/10 hover:border-violet-500/40 transition-all"
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <TraitAIMessage
              key={i}
              role={msg.role}
              content={msg.content}
              actions={msg.actions}
            />
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <TraitAIMessage role="assistant" content="" isTyping />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-violet-500/20 bg-[#0d0d20]/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Posez votre question..."
            className="flex-1 bg-[#1a1a2e] border border-violet-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/50 transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center text-white disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-violet-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
