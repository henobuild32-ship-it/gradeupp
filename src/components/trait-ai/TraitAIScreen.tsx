'use client'

import { useAppStore } from '@/lib/store'
import TraitAIWelcome from './TraitAIWelcome'
import TraitAIChat from './TraitAIChat'

export default function TraitAIScreen() {
  const { currentPage } = useAppStore()

  if (currentPage === 'trait-ai') {
    return <TraitAIChat />
  }

  return <TraitAIWelcome />
}
