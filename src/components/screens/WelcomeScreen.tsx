'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Globe2,
  Headphones,
  LockKeyhole,
  Menu,
  QrCode,
  ShieldCheck,
  Smartphone,
  Store,
  Wallet,
  X,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'

export default function WelcomeScreen() {
  const navigateTo = useAppStore((s) => s.navigateTo)
  const { language, setLanguage } = useTranslation()
  const { canInstall, isInstalled, isStandalone, installApp } = usePWAInstall()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const isFrench = language === 'fr'

  const copy = isFrench
    ? {
        nav: ['Services', 'Sécurité', 'Pour les professionnels'],
        login: 'Connexion',
        signup: 'Créer un compte',
        eyebrow: 'Votre argent, vos services, un seul espace',
        title: 'Gérez votre argent avec plus de simplicité.',
        intro: 'Envoyez et recevez de l’argent, payez par QR code et accédez aux services Trait Fintech depuis un espace pensé pour le quotidien.',
        cta: 'Commencer',
        explore: 'Découvrir les services',
        previewLabel: 'Un espace clair pour agir',
        previewTitle: 'Vos opérations essentielles, à portée de main.',
        previewCopy: 'Retrouvez les fonctions principales dans une interface simple, avec une confirmation avant les opérations sensibles.',
        previewTag: 'APERÇU DE L’APPLICATION',
        previewWelcome: 'Bienvenue sur Trait Fintech',
        previewSubtitle: 'Que souhaitez-vous faire ?',
        send: 'Envoyer',
        receive: 'Recevoir',
        qr: 'Payer par QR',
        services: 'Explorer les services',
        currencies: 'USD et CDF',
        serviceEyebrow: 'Les services Trait Fintech',
        serviceTitle: 'Les outils utiles, réunis au même endroit.',
        serviceIntro: 'Accédez aux services disponibles selon votre compte et votre profil.',
        featureTitles: ['Transferts Trait', 'Paiements par QR', 'Cartes Trait', 'Wallet Trait', 'Marketplace', 'Troc numérique'],
        featureDescs: [
          'Envoyez et recevez de l’argent avec les étapes de confirmation prévues dans l’application.',
          'Scannez un code QR pour accéder au parcours de paiement d’un commerçant.',
          'Consultez les services liés aux cartes physiques et virtuelles disponibles dans Trait Fintech.',
          'Retrouvez les parcours de dépôt et de retrait selon les services activés pour votre compte.',
          'Découvrez des produits et gérez vos annonces depuis votre espace.',
          'Publiez une proposition et échangez avec la communauté Trait Fintech.',
        ],
        howEyebrow: 'Un parcours guidé',
        howTitle: 'Commencez à votre rythme.',
        howIntro: 'Les étapes dépendent de votre profil et des services auxquels vous souhaitez accéder.',
        steps: [
          ['01', 'Créez votre compte', 'Choisissez votre profil et renseignez les informations demandées.'],
          ['02', 'Sécurisez votre accès', 'Configurez votre code PIN et terminez les vérifications requises pour votre compte.'],
          ['03', 'Utilisez vos services', 'Accédez aux opérations disponibles et vérifiez les détails avant confirmation.'],
        ],
        securityEyebrow: 'La sécurité au quotidien',
        securityTitle: 'Des contrôles intégrés à vos parcours.',
        securityIntro: 'Trait Fintech propose des outils de protection et des étapes de confirmation. Les options disponibles dépendent de votre appareil et de la configuration de votre compte.',
        securityItems: [
          ['Code PIN', 'Confirmation dans les parcours concernés'],
          ['Biométrie', 'Déverrouillage sur les appareils compatibles'],
          ['Vérification en deux étapes', 'Option activable dans les paramètres'],
          ['Confidentialité', 'Ne partagez jamais vos codes ou mots de passe'],
        ],
        professionalEyebrow: 'Vous souhaitez contribuer ?',
        professionalTitle: 'Un espace adapté à votre activité.',
        agent: 'Devenir agent',
        agentDesc: 'Proposez vos services de dépôt et de retrait. Les comptes agents sont soumis à validation.',
        merchant: 'Espace commerçant',
        merchantDesc: 'Gérez vos produits et utilisez les outils de paiement destinés aux commerçants.',
        developer: 'Développeurs',
        developerDesc: 'Consultez le parcours d’inscription et les ressources d’intégration Trait Fintech.',
        support: 'Besoin d’aide ?',
        supportDesc: 'Accédez à l’assistance Trait Fintech pour poser une question ou signaler un problème.',
        faqEyebrow: 'Questions fréquentes',
        faqTitle: 'Avant de commencer',
        faqs: [
          ['Quels frais s’appliquent ?', 'Les frais applicables sont affichés dans le parcours concerné avant la confirmation de l’opération.'],
          ['La vérification est-elle nécessaire ?', 'Certaines fonctions peuvent nécessiter une vérification de votre profil. L’application vous guidera selon le service choisi.'],
          ['Quelles devises sont disponibles ?', 'Trait Fintech utilise uniquement USD et CDF.'],
          ['Comment contacter l’assistance ?', 'Ouvrez la rubrique Assistance depuis votre compte ou utilisez le lien Assistance ci-dessous.'],
        ],
        finalTitle: 'Prêt à découvrir Trait Fintech ?',
        finalCopy: 'Créez votre espace et explorez les services disponibles pour votre profil.',
        finalCta: 'Créer mon compte',
        installTitle: 'Trait Fintech sur votre téléphone',
        installCopy: 'Installez l’application depuis votre navigateur pour la retrouver facilement.',
        install: 'Installer Trait Fintech',
        installHint: 'Ouvrez le menu de votre navigateur et choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
        footerLine: 'Trait Fintech • USD • CDF • Services internationaux',
        terms: 'Conditions d’utilisation',
        footerSupport: 'Assistance',
        languageLabel: 'Langue',
      }
    : {
        nav: ['Services', 'Security', 'For professionals'],
        login: 'Log in',
        signup: 'Create an account',
        eyebrow: 'Your money and services, in one place',
        title: 'Manage your money more simply.',
        intro: 'Send and receive money, pay by QR code, and access Trait Fintech services from a space designed for everyday use.',
        cta: 'Get started',
        explore: 'Explore services',
        previewLabel: 'A clear space to take action',
        previewTitle: 'Your essential transactions, close at hand.',
        previewCopy: 'Find key tools in a simple interface, with a confirmation step before sensitive transactions.',
        previewTag: 'APP PREVIEW',
        previewWelcome: 'Welcome to Trait Fintech',
        previewSubtitle: 'What would you like to do?',
        send: 'Send',
        receive: 'Receive',
        qr: 'Pay by QR',
        services: 'Explore services',
        currencies: 'USD and CDF',
        serviceEyebrow: 'Trait Fintech services',
        serviceTitle: 'Useful tools, together in one place.',
        serviceIntro: 'Access available services based on your account and profile.',
        featureTitles: ['Trait transfers', 'QR payments', 'Trait cards', 'Trait wallet', 'Marketplace', 'Digital barter'],
        featureDescs: [
          'Send and receive money with the confirmation steps provided in the app.',
          'Scan a QR code to open a merchant payment flow.',
          'Explore physical and virtual card services available in Trait Fintech.',
          'Find deposit and withdrawal flows available for your account.',
          'Discover products and manage your listings from your account.',
          'Post an offer and connect with the Trait Fintech community.',
        ],
        howEyebrow: 'A guided journey',
        howTitle: 'Get started at your own pace.',
        howIntro: 'Steps depend on your profile and the services you want to access.',
        steps: [
          ['01', 'Create your account', 'Choose a profile and provide the requested information.'],
          ['02', 'Secure your access', 'Set up a PIN and complete the checks required for your account.'],
          ['03', 'Use your services', 'Access available transactions and review the details before confirming.'],
        ],
        securityEyebrow: 'Everyday security',
        securityTitle: 'Controls built into your journey.',
        securityIntro: 'Trait Fintech provides security tools and confirmation steps. Available options depend on your device and account settings.',
        securityItems: [
          ['PIN', 'Confirmation in relevant flows'],
          ['Biometrics', 'Unlock on compatible devices'],
          ['Two-step verification', 'Can be enabled in settings'],
          ['Privacy', 'Never share your codes or passwords'],
        ],
        professionalEyebrow: 'Looking to get involved?',
        professionalTitle: 'A space for your business.',
        agent: 'Become an agent',
        agentDesc: 'Offer deposit and withdrawal services. Agent accounts require approval.',
        merchant: 'Merchant space',
        merchantDesc: 'Manage products and use payment tools for merchants.',
        developer: 'Developers',
        developerDesc: 'Explore registration and Trait Fintech integration resources.',
        support: 'Need help?',
        supportDesc: 'Contact Trait Fintech support with a question or to report an issue.',
        faqEyebrow: 'Frequently asked questions',
        faqTitle: 'Before you get started',
        faqs: [
          ['What fees apply?', 'Applicable fees are shown in the relevant flow before you confirm a transaction.'],
          ['Is verification required?', 'Some features may require profile verification. The app guides you based on the service you select.'],
          ['Which currencies are supported?', 'Trait Fintech uses USD and CDF only.'],
          ['How do I contact support?', 'Open Support from your account or use the Support link below.'],
        ],
        finalTitle: 'Ready to explore Trait Fintech?',
        finalCopy: 'Create your account and explore services available for your profile.',
        finalCta: 'Create my account',
        installTitle: 'Trait Fintech on your phone',
        installCopy: 'Install the app from your browser to find it easily.',
        install: 'Install Trait Fintech',
        installHint: 'Open your browser menu and choose “Install app” or “Add to home screen”.',
        footerLine: 'Digital financial services by Trait Fintech',
        terms: 'Terms of use',
        footerSupport: 'Support',
        languageLabel: 'Language',
      }

  const features = [
    { icon: ArrowLeftRight, title: copy.featureTitles[0], description: copy.featureDescs[0] },
    { icon: QrCode, title: copy.featureTitles[1], description: copy.featureDescs[1] },
    { icon: CreditCard, title: copy.featureTitles[2], description: copy.featureDescs[2] },
    { icon: Smartphone, title: copy.featureTitles[3], description: copy.featureDescs[3] },
    { icon: Store, title: copy.featureTitles[4], description: copy.featureDescs[4] },
    { icon: Globe2, title: copy.featureTitles[5], description: copy.featureDescs[5] },
  ]

  const closeMenu = () => setMenuOpen(false)
  const startSignup = () => navigateTo('auth', { mode: 'register' })
  const startLogin = () => navigateTo('auth', { mode: 'login' })

  const handleInstall = async () => {
    if (!canInstall) {
      toast.info(copy.installHint)
      return
    }
    const installed = await installApp()
    if (!installed) toast.info(copy.installHint)
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f9f7] text-[#132a28]">
      <header className="sticky top-0 z-40 border-b border-[#e4ebe6] bg-[#f7f9f7]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="#top" aria-label="Trait Fintech — accueil" className="flex shrink-0 items-center gap-2.5">
            <Image src="/trait-mark.png" alt="Logo Trait Fintech" width={52} height={34} priority className="h-9 w-12 object-contain" />
            <span className="text-[21px] font-extrabold tracking-[-0.06em] text-[#143f3d]">Trait Fintech</span>
          </a>

          <nav aria-label={isFrench ? 'Navigation principale' : 'Main navigation'} className="hidden items-center gap-8 lg:flex">
            <a className="text-sm font-medium text-[#5b6e68] transition hover:text-[#0d5c63]" href="#services">{copy.nav[0]}</a>
            <a className="text-sm font-medium text-[#5b6e68] transition hover:text-[#0d5c63]" href="#security">{copy.nav[1]}</a>
            <a className="text-sm font-medium text-[#5b6e68] transition hover:text-[#0d5c63]" href="#professionals">{copy.nav[2]}</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label={`${copy.languageLabel}: ${isFrench ? 'Français' : 'English'}`}
              onClick={() => setLanguage(isFrench ? 'en' : 'fr')}
              className="rounded-full border border-[#dfe8e2] bg-white px-3 py-2 text-xs font-bold text-[#365c55] transition hover:border-[#0d5c63]/35"
            >
              {isFrench ? 'FR' : 'EN'}
            </button>
            <button type="button" onClick={startLogin} className="hidden rounded-full px-3 py-2 text-sm font-semibold text-[#365c55] transition hover:bg-white sm:inline-flex">{copy.login}</button>
            <button type="button" onClick={startSignup} className="hidden rounded-full bg-[#0d5c63] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#094c52] sm:inline-flex">{copy.signup}</button>
            <button
              type="button"
              aria-label={menuOpen ? (isFrench ? 'Fermer le menu' : 'Close menu') : (isFrench ? 'Ouvrir le menu' : 'Open menu')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dfe8e2] bg-white text-[#315b55] lg:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-[#e4ebe6] bg-white px-5 py-4 lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1">
              {copy.nav.map((label, index) => (
                <a key={label} onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-medium text-[#365c55] hover:bg-[#f2f7f3]" href={['#services', '#security', '#professionals'][index]}>{label}</a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#eaf0eb] pt-3">
                <button type="button" onClick={() => { closeMenu(); startLogin() }} className="rounded-full border border-[#dfe8e2] px-4 py-2.5 text-sm font-semibold">{copy.login}</button>
                <button type="button" onClick={() => { closeMenu(); startSignup() }} className="rounded-full bg-[#0d5c63] px-4 py-2.5 text-sm font-semibold text-white">{copy.signup}</button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative isolate mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-8 lg:pb-28 lg:pt-24">
          <div aria-hidden="true" className="absolute -left-52 -top-24 -z-10 h-[520px] w-[520px] rounded-full bg-[#dff0e8]/70 blur-3xl" />
          <div className="max-w-[690px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cfe2d8] bg-white/80 px-3.5 py-2 text-xs font-semibold text-[#34665b] shadow-sm sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-[#1a9a75]" />
              {copy.eyebrow}
            </div>
            <h1 className="max-w-[780px] text-[clamp(2.75rem,6vw,5.1rem)] font-semibold leading-[1.02] tracking-[-0.065em] text-[#163a36]">
              {copy.title.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="text-[#16856f]">{copy.title.split(' ').slice(-1)}</span>
            </h1>
            <p className="mt-6 max-w-[570px] text-base leading-7 text-[#5d7069] sm:text-lg sm:leading-8">{copy.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={startSignup} className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#0d5c63] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(13,92,99,.18)] transition hover:-translate-y-0.5 hover:bg-[#094c52]">
                {copy.cta}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a href="#services" className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-[#315a53] transition hover:bg-white">{copy.explore}</a>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-medium text-[#63756f] sm:text-sm">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#16856f]" />USD · CDF</span>
              <span className="h-1 w-1 rounded-full bg-[#b5c7be]" />
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#16856f]" />{isFrench ? 'Parcours mobile et web' : 'Mobile and web flows'}</span>
              <span className="h-1 w-1 rounded-full bg-[#b5c7be]" />
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#16856f]" />{isFrench ? 'Client et professionnel' : 'Personal and professional'}</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[530px] lg:ml-auto">
            <div aria-hidden="true" className="absolute -right-8 top-8 h-[82%] w-[88%] rounded-[36px] bg-[#dcece4] sm:-right-10" />
            <div className="relative overflow-hidden rounded-[30px] bg-[#0e514e] p-5 shadow-[0_32px_80px_rgba(23,69,60,.2)] sm:rounded-[36px] sm:p-7">
              <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
              <div aria-hidden="true" className="absolute -right-2 -top-5 h-44 w-44 rounded-full border border-white/10" />
              <div className="relative rounded-[24px] border border-white/10 bg-[#f9fcfa] p-5 sm:rounded-[28px] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Image src="/trait-mark.png" alt="" width={48} height={31} className="h-8 w-10 object-contain" />
                    <div>
                      <p className="text-sm font-bold text-[#163a36]">{copy.previewWelcome}</p>
                      <p className="mt-0.5 text-xs text-[#71817b]">Trait Fintech · USD · CDF</p>
                    </div>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf5f0] text-[#247b69]"><Wallet className="h-4 w-4" /></span>
                </div>
                <div className="mt-6 rounded-2xl bg-[#edf5f0] p-4 sm:p-5">
                  <p className="text-xs font-medium text-[#687c74]">{copy.previewLabel}</p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-[#193d37] sm:text-xl">{copy.previewSubtitle}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      { icon: ArrowDownLeft, label: copy.send },
                      { icon: ArrowLeftRight, label: copy.receive },
                      { icon: QrCode, label: copy.qr },
                    ].map((action) => (
                      <div key={action.label} className="flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-xl border border-[#e3ece6] bg-white px-2 text-center text-[11px] font-semibold text-[#355b52] sm:min-h-[90px] sm:text-xs">
                        <action.icon className="h-5 w-5 text-[#16856f]" />{action.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#e8efea] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f3ee] text-[#16856f]"><Globe2 className="h-5 w-5" /></span>
                    <div><p className="text-xs font-semibold text-[#23453e]">{copy.services}</p><p className="mt-1 text-[11px] text-[#75857f]">{copy.currencies}</p></div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#608178]" />
                </div>
              </div>
              <div className="relative mt-4 flex items-center justify-between gap-3 px-1 text-xs font-medium text-white/75 sm:px-2">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#a7e1bd]" />{isFrench ? 'Vos vérifications, étape par étape' : 'Checks, step by step'}</span>
                <span className="hidden rounded-full border border-white/15 px-3 py-1.5 text-[10px] tracking-[0.12em] sm:inline-flex">{copy.previewTag}</span>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="scroll-mt-24 border-y border-[#e6ede8] bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16856f]">{copy.serviceEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-[#183a35] sm:text-4xl">{copy.serviceTitle}</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#687a73] sm:text-base">{copy.serviceIntro}</p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-4">
              {features.map((feature) => (
                <article key={feature.title} className="group rounded-2xl border border-[#e7eee9] bg-[#fbfcfb] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#c9e0d4] hover:bg-white hover:shadow-[0_16px_36px_rgba(35,80,64,.08)] sm:p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8f3ed] text-[#167765] transition group-hover:bg-[#0d5c63] group-hover:text-white"><feature.icon className="h-5 w-5" /></span>
                  <h3 className="mt-5 text-base font-semibold text-[#213f39]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#687a73]">{feature.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#16856f]">{isFrench ? 'Disponible selon votre profil' : 'Available for your profile'}<ArrowRight className="h-3.5 w-3.5" /></span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16856f]">{copy.howEyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-[#183a35] sm:text-4xl">{copy.howTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-[#687a73] sm:text-base">{copy.howIntro}</p>
          </div>
          <div className="divide-y divide-[#e5ece7] rounded-2xl border border-[#e5ece7] bg-white px-5 sm:px-7">
            {copy.steps.map(([number, title, description]) => (
              <div key={number} className="grid gap-3 py-5 sm:grid-cols-[52px_1fr] sm:gap-4 sm:py-6">
                <span className="text-sm font-bold tracking-wide text-[#16856f]">{number}</span>
                <div><h3 className="text-base font-semibold text-[#24443d]">{title}</h3><p className="mt-1.5 text-sm leading-6 text-[#718079]">{description}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section id="security" className="scroll-mt-24 bg-[#123f3d] py-16 text-white sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a7dfc4]">{copy.securityEyebrow}</p>
              <h2 className="mt-4 max-w-lg text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{copy.securityTitle}</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/70 sm:text-base">{copy.securityIntro}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {copy.securityItems.map(([title, description], index) => {
                const Icon = [LockKeyhole, Smartphone, ShieldCheck, CircleHelp][index]
                return <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                  <Icon className="h-5 w-5 text-[#a7dfc4]" />
                  <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-white/65">{description}</p>
                </div>
              })}
            </div>
          </div>
        </section>

        <section id="professionals" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16856f]">{copy.professionalEyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-[#183a35] sm:text-4xl">{copy.professionalTitle}</h2>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Wallet, title: copy.agent, description: copy.agentDesc, action: () => navigateTo('auth', { mode: 'register', role: 'agent' }) },
              { icon: Store, title: copy.merchant, description: copy.featureDescs[4], action: () => navigateTo('seller-register') },
              { icon: Globe2, title: copy.developer, description: copy.developerDesc, action: () => navigateTo('developer-register') },
              { icon: Headphones, title: copy.support, description: copy.supportDesc, action: () => navigateTo('support') },
            ].map((item) => <button key={item.title} type="button" onClick={item.action} className="group flex min-h-[205px] flex-col items-start rounded-2xl border border-[#e4ece6] bg-white p-5 text-left transition hover:-translate-y-1 hover:border-[#bdd8c9] hover:shadow-[0_16px_36px_rgba(35,80,64,.08)]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf4ee] text-[#167765]"><item.icon className="h-5 w-5" /></span>
              <span className="mt-4 text-sm font-semibold text-[#24443d]">{item.title}</span>
              <span className="mt-2 flex-1 text-xs leading-5 text-[#718079]">{item.description}</span>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#16856f]">{isFrench ? 'En savoir plus' : 'Learn more'}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </button>)}
          </div>
        </section>

        <section className="border-y border-[#e6ede8] bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16856f]">{copy.faqEyebrow}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#183a35]">{copy.faqTitle}</h2>
            </div>
            <div className="mt-8 divide-y divide-[#e9efeb] border-y border-[#e9efeb]">
              {copy.faqs.map(([question, answer], index) => (
                <div key={question}>
                  <button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold text-[#294840]">
                    {question}<ChevronDown className={`h-4 w-4 shrink-0 text-[#608178] transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === index && <p className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-[#6d7d76]">{answer}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {!isStandalone && !isInstalled && (
          <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8 lg:pt-20">
            <div className="flex flex-col gap-6 rounded-3xl border border-[#dce9df] bg-[#eff6f0] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#16856f] shadow-sm"><Smartphone className="h-5 w-5" /></span>
                <div><h2 className="text-lg font-semibold text-[#21433b]">{copy.installTitle}</h2><p className="mt-1 max-w-xl text-sm leading-6 text-[#6a7b73]">{copy.installCopy}</p></div>
              </div>
              <button type="button" onClick={handleInstall} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#c5dbcf] bg-white px-5 text-sm font-semibold text-[#286354] transition hover:border-[#79b39b] hover:bg-[#fbfdfb]">{copy.install}<ArrowRight className="h-4 w-4" /></button>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="relative overflow-hidden rounded-[28px] bg-[#0d5c63] px-6 py-10 text-center sm:rounded-[34px] sm:px-12 sm:py-14">
            <div aria-hidden="true" className="absolute -right-20 -top-36 h-80 w-80 rounded-full border border-white/10" />
            <div aria-hidden="true" className="absolute -bottom-52 -left-20 h-96 w-96 rounded-full border border-white/10" />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b6e2ce]">Trait Fintech</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{copy.finalTitle}</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/75 sm:text-base">{copy.finalCopy}</p>
              <button type="button" onClick={startSignup} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#14534f] transition hover:-translate-y-0.5 hover:bg-[#edf8f1]">{copy.finalCta}<ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e4ebe6] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <Image src="/trait-mark.png" alt="Logo Trait Fintech" width={44} height={29} className="h-8 w-10 object-contain" />
            <div><p className="text-sm font-bold tracking-[-0.04em] text-[#173e38]">Trait Fintech</p><p className="mt-1 text-xs text-[#7a8982]">{copy.footerLine}</p></div>
          </div>
          <nav aria-label={isFrench ? 'Liens utiles' : 'Useful links'} className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#64766e]">
            <a className="hover:text-[#0d5c63]" href="/terms">{copy.terms}</a>
            <button type="button" onClick={() => navigateTo('support')} className="hover:text-[#0d5c63]">{copy.footerSupport}</button>
          </nav>
        </div>
      </footer>
    </div>
  )
}
