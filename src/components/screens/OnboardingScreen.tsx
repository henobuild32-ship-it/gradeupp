'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { routeAfterAuth } from '@/lib/route-after-auth';

const slides = [
  {
    emoji: '👋',
    title: 'Bienvenue sur Trait',
    description: 'Votre solution financière digitale pour envoyer, recevoir et échanger facilement.',
    bg: 'from-emerald-50 to-emerald-100/50',
  },
  {
    emoji: '💸',
    title: 'Envoyez de l\'argent',
    description: 'Les frais applicables sont toujours affichés clairement avant la confirmation.',
    bg: 'from-amber-50 to-amber-100/50',
  },
  {
    emoji: '🤝',
    title: 'Troc Digital',
    description: 'Échangez des biens et services sans argent grâce au système de troc.',
    bg: 'from-violet-50 to-violet-100/50',
  },
  {
    emoji: '🏪',
    title: 'Marketplace',
    description: 'Achetez et vendez sur la marketplace intégrée à Trait.',
    bg: 'from-rose-50 to-rose-100/50',
  },
  {
    emoji: '🎁',
    title: 'Bonus de bienvenue',
    description: 'Recevez 10 USD de bonus lors de la création de votre compte !',
    bg: 'from-emerald-50 to-emerald-100/50',
  },
];

export default function OnboardingScreen() {
  const { navigateTo, user, setUser } = useAppStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLast = currentSlide === slides.length - 1;

  // Persiste hasCompletedOnboarding en base (sinon repose à chaque session)
  const finishOnboarding = () => {
    if (user) {
      setUser({ ...user, hasCompletedOnboarding: true });
      fetch('/api/auth/complete-onboarding', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {});
    }
    routeAfterAuth(navigateTo, user);
  };

  const handleNext = () => {
    if (isLast) {
      finishOnboarding();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-4">
            {!isLast && (
              <Button
                variant="ghost"
                className="text-muted-foreground cursor-pointer"
                onClick={handleSkip}
              >
                Passer
              </Button>
            )}
            {isLast && <div />}
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentSlide
                      ? 'w-6 bg-emerald-500'
                      : 'w-1.5 bg-border'
                  }`}
                />
              ))}
            </div>
            <div className="w-16" />
          </div>

          {/* Content */}
          <div className={`flex-1 flex flex-col items-center justify-center px-6 py-8`}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1, type: 'spring' }}
              className={`w-40 h-40 rounded-3xl bg-gradient-to-br ${slide.bg} flex items-center justify-center mb-8`}
            >
              <span className="text-6xl">{slide.emoji}</span>
            </motion.div>

            <h2 className="text-2xl font-bold text-foreground text-center mb-3">
              {slide.title}
            </h2>
            <p className="text-muted-foreground text-center text-base max-w-xs leading-relaxed">
              {slide.description}
            </p>
          </div>

          {/* Bottom action */}
          <div className="px-6 pb-10">
            <Button
              onClick={handleNext}
              className="w-full h-13 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200 cursor-pointer"
              size="lg"
            >
              {isLast ? 'Commencer' : 'Suivant'}
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
