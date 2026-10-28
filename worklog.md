---
Task ID: 4
Agent: Main Agent
Task: Create 2 admin screen components (Card Requests + Client Messages)

Work Log:
- Created `src/components/admin/AdminCardRequestsScreen.tsx`: Admin card request management screen
  - Sticky header with back button, title "Demandes de Cartes", and refresh button
  - Fetches all card requests from `/api/cards/admin/requests?status=all`
  - 4-tab filter: Tous / En attente / Approuvées / Rejetées with counts on each tab
  - Each request card displays: client avatar (photoId), name, phone, email, card type badge (USD/FC), date, status badge with color
  - For approved requests: shows card number with status badge (Active/Suspendue)
  - For rejected requests: shows reject reason in red alert box
  - Pending actions: "Approuver" (green) and "Rejeter" (red with dialog for reason input)
  - Approved active card: "Suspendre" button → POST `/api/cards/admin/manage` with suspend action
  - Approved suspended card: "Activer" button → POST `/api/cards/admin/manage` with activate action
  - Per-request loading states on action buttons, refresh data after each action
  - Loading skeleton state and empty state per active tab
  - Framer Motion staggered card animations

- Created `src/components/admin/AdminClientMessagesScreen.tsx`: Admin→Client messaging screen
  - Sticky header with back button, title "Messages Clients", and refresh button
  - Two tabs: Individuel / Diffusion globale (similar pattern to AdminMessagesScreen for agents)
  - Individual mode: client selector (fetches from `/api/admin/users?role=client`), title input, message textarea, "Autoriser la copie" Switch toggle, send button
  - Broadcast mode: title input, message textarea, "Autoriser la copie" Switch toggle, active client count warning, send button with confirmation dialog
  - Confirmation dialog shows title preview, message preview, copy permission indicator, recipient count
  - Message history below: individual + broadcast messages grouped, type badge (Individuel/Diffusion), recipient info, copy permission indicator (Copy icon), date
  - API integration: GET `/api/admin/client-messages?adminId=xxx` for history, POST for sending with `allowCopy` field
  - Loading skeleton, empty state, toast notifications
  - Framer Motion animations on message cards

- Updated `src/app/page.tsx`:
  - Added imports for AdminCardRequestsScreen and AdminClientMessagesScreen
  - Added screenMap entries: 'admin-card-requests' and 'admin-client-messages'
  - Added both to adminPages array (no bottom nav, no PWA banner)

Stage Summary:
- 2 new admin screen components created following existing project patterns
- AdminCardRequestsScreen: full CRUD management of card requests with approve/reject/suspend/activate actions
- AdminClientMessagesScreen: individual + broadcast messaging to clients with allowCopy toggle
- Both screens wired into page.tsx with proper admin page classification
- ESLint passes with 0 errors
- Dev server compiles cleanly

---
Task ID: 3
Agent: Main Agent
Task: Create 3 client-side card screen components

Work Log:
- Created `src/components/screens/CardRequestScreen.tsx`: Client card request screen
  - Header with back button and title "Demander une carte"
  - Two premium card options (USD blue theme, FC red theme) with gradient visuals, world map dots, and light streaks
  - Each card shows: card type name, currency, description, feature tags, selection indicator
  - Info banner explaining the approval process
  - "Confirmer la demande" button with dynamic accent color matching selection
  - POST to `/api/cards/request` with `{ userId, cardType }`
  - Loading state with spinner, success toast + navigate home, error toast with API message
  - Framer Motion animations: staggered fade-up, whileTap scale, spring selection checkmark

- Created `src/components/screens/CardPaymentScreen.tsx`: Card payment screen
  - Header with back button and title "Paiement par carte"
  - Fetches user's active cards from `/api/cards/my-cards?userId=${user.id}`
  - Loading state with spinner, empty state with "Demander une carte" button
  - Currency tab selector (USD/FC) using shadcn Tabs component
  - Displays selected card using TraitCard component with real-time balance from user store
  - Card masked info card showing last 4 digits and currency badge
  - Balance info bar showing available balance
  - Amount input with currency symbol/prefix, insufficient balance warning
  - Optional description input
  - Submit button showing formatted amount, disabled when insufficient funds
  - POST to `/api/cards/pay` with `{ userId, cardId, amount, currency, description }`
  - Updates user balances in store on success, toast + navigate home

- Created `src/components/screens/CardScreen.tsx`: Card display/management screen
  - Header with back button and title "Mes Cartes"
  - Fetches cards and pending requests from `/api/cards/my-cards?userId=${user.id}`
  - Loading state with spinner
  - Empty state: icon, description, "Demander une carte" button (navigates to card-request)
  - Active cards section: count badge, "Demander" quick-link button
  - Each active card displayed using TraitCard component with real-time balance (realBalance for USD, realBalanceFC for FC)
  - "Paiement par carte" button below each active card with accent color matching card type
  - Pending requests section: card type, status badge (En attente with amber, Refusée with red), request date, rejection reason
  - "Demander une nouvelle carte" button at bottom
  - Framer Motion: staggered card entry animations, slide-in pending requests, spring empty state

- All components follow existing patterns: useAppStore, toast from sonner, shadcn/ui components, framer-motion, lucide-react icons
- ESLint passes with 0 errors

Stage Summary:
- Produced 3 new screen components: CardRequestScreen.tsx, CardPaymentScreen.tsx, CardScreen.tsx
- All screens integrate with existing API routes (/api/cards/request, /api/cards/my-cards, /api/cards/pay)
- CardScreen and CardPaymentScreen import and use the TraitCard component for card visualization
- Real-time balance display from user store (realBalance, realBalanceFC)
- Proper loading, empty, and error states for all screens
- Responsive design with motion animations

---
Task ID: 1
Agent: Main Agent
Task: Complete Agent Registration & Validation System

Work Log:
- Updated Prisma schema: added `address`, `photoId`, `systemPassword`, `systemPasswordSent` fields to User model; validationStatus now supports 'suspended'
- Created `/api/auth/upload-photo` endpoint for agent photo uploads (max 5MB, image files)
- Updated `/api/auth/register` to accept new fields (address, photoId) and validate email uniqueness for agents
- Updated `/api/auth/login` to block unvalidated agents: pending → "en attente", rejected → "refusée", suspended → "suspendu"
- Created `AgentRegisterScreen.tsx`: 2-step registration form (personal info + password), photo upload, +243 phone formatting, password strength indicator, confirmation match, animated UI
- Created `AgentPendingScreen.tsx`: Post-registration pending screen with validation process steps and restrictions info
- Updated `/api/admin/agent-validation` (GET): Returns all new fields (address, photoId, systemPassword, systemPasswordSent)
- Updated `/api/admin/agent-validation` (POST): Now generates system password (TRX+6 chars), sends credentials email, supports `resend_credentials` and `unsuspend` actions
- Updated `AdminAgentValidationScreen.tsx`: Shows agent photo in cards and detail dialog, displays system password, "Send Email" checkbox on validation, "Resend credentials" button, "suspended" status badge
- Updated `AuthLoginScreen.tsx`: Handles agent validation status errors (pending/rejected/suspended) with specific messages
- Updated `WelcomeScreen.tsx`: "Créer un compte agent" button now navigates to `agent-register` screen
- Updated store.ts: Added `agent-register` and `agent-pending` page types
- Updated page.tsx: Wired new screens into screenMap

Stage Summary:
- Full agent registration flow: dedicated form → pending screen → admin validation → credentials generation
- Security: Unvalidated agents cannot login, separate system password generated on admin approval
- Admin panel: Full agent info (photo, address, all fields), system password display, email sending capability
- All lint checks pass, dev server compiles cleanly

---
Task ID: 1
Agent: Main Agent
Task: Complete homepage redesign with premium UI, Support screen, multilingual translations

Work Log:
- Added 'support' page type to store.ts (PageName union type)
- Added SupportScreen import and screenMap entry in page.tsx
- Added comprehensive i18n translations (FR + EN) for Support screen (20+ keys) and enhanced Welcome sections (15+ keys)
- Created SupportScreen component (/src/components/screens/SupportScreen.tsx, 484 lines):
  - Premium header with gradient icon and back button
  - Support info card with availability badge and response time
  - Contact form with 4 validated fields (Name, Email, Subject, Message)
  - Gmail integration via mailto: link to trait137@gmail.com
  - FAQ section with 3 collapsible questions
  - Bottom action buttons (direct email + back to home)
- Redesigned WelcomeScreen (/src/components/screens/WelcomeScreen.tsx):
  - Preserved all existing buttons and functionality
  - Support button now navigates to support page instead of toast
  - Added "Nous contacter" button navigating to support page
  - Added "Pourquoi TRAIT?" 2x2 features grid (Security, Speed, Bonus, Multi-currency)
  - Added "Nouveautés" news section with 3 items
  - Added enhanced "Télécharger l'application" download section
  - Added premium animations (spring logo, pulsing glow, staggered fade-up, hover effects)
  - Premium gradient background (slate-50 via white)
- All changes pass ESLint with zero errors
- App compiles and renders successfully

Stage Summary:
- Produced artifacts: SupportScreen.tsx, updated WelcomeScreen.tsx, updated i18n.tsx, updated store.ts, updated page.tsx
- All existing functionality preserved
- New Support screen with Gmail integration to trait137@gmail.com
- Premium modern homepage with features grid, news section, enhanced animations
---
Task ID: 1
Agent: Main
Task: Complete application audit and fix all errors across TRAIT PWA

Work Log:
- Launched 6 parallel audit agents to review all 60+ files (auth screens, main screens, agent screens, admin screens, API routes, hooks/utils)
- Identified 34 issues across severity levels: 10 Critical, 3 High, 10 Medium, 11 Low
- Fixed 9 Critical API route bugs (currency handling, balance deduction, FK violations, race conditions)
- Fixed 13 Critical/High frontend bugs (legacy navigation, null safety, password strength, PIN validation)
- Cleaned up 12 unused imports/variables across 10 files
- Fixed lint error in transfer/history route (missing `}` in template literal)

Stage Summary:
- All CRITICAL and HIGH priority bugs resolved
- ESLint passes with 0 errors
- Dev server compiles successfully (no errors)
- Total: 34 issues identified, 34 issues fixed

---
Task ID: 2
Agent: Main Agent
Task: Create API routes for TRAIT Card system and Admin-Client messaging

Work Log:
- Created `src/app/api/cards/request/route.ts` (POST): Client card request endpoint
  - Validates userId, cardType (USD/FC)
  - Checks for existing card of same type and duplicate pending requests
  - Creates CardRequest with status 'pending'
  - Returns success/error with proper validation messages

- Created `src/app/api/cards/my-cards/route.ts` (GET): User's cards overview
  - Returns all TraitCards for user with card details (number, CVV, QR, expiry, status)
  - Returns pending CardRequests
  - Returns recent CardPayments (last 20) with card type info

- Created `src/app/api/cards/admin/requests/route.ts` (GET & POST): Admin card request management
  - GET: Returns all CardRequests with user info (name, phone, email, photoId), admin info, and associated card
  - POST: Approve/Reject/Suspend card requests
    - On approve: Generates 16-digit card number (4927 prefix), 3-digit CVV, QR code, MM/YY expiry (3 years)
    - Creates TraitCard record, updates CardRequest status, creates notification
    - On reject: Requires reason, updates status, creates notification
    - On suspend: Updates status, creates notification
    - All actions create AdminActivityLog entries

- Created `src/app/api/cards/pay/route.ts` (POST): Card payment processing
  - Validates card ownership, active status, currency match
  - Verifies sufficient real balance (realBalance for USD, realBalanceFC for FC)
  - Deducts from user balance atomically
  - Creates CardPayment and Transaction records (both status 'completed')
  - Creates notification for user
  - Returns updated balances

- Created `src/app/api/cards/admin/manage/route.ts` (POST): Admin card management
  - Suspend/Activate card actions
  - Validates admin exists and card state transitions (only active→suspended, suspended/blocked→active)
  - Creates AdminActivityLog and Notification for each action

- Created `src/app/api/admin/client-messages/route.ts` (GET & POST): Admin→Client messaging
  - GET: Returns all sent messages with recipient info
  - POST: Individual message (to specific client) or broadcast (to all non-suspended clients)
    - Supports allowCopy flag for each message
    - Creates AdminClientMessage record(s) and Notification(s) for each recipient
    - Creates AdminActivityLog entry

- Created `src/app/api/client-messages/route.ts` (GET & POST): Client-side messaging
  - GET: Returns all AdminClientMessage for user ordered by createdAt desc, with admin info
  - POST: Mark message as read (validates ownership before updating)

Stage Summary:
- 7 new API route files created for TRAIT Card system and Admin-Client messaging
- All routes follow existing project patterns (French error messages, NextResponse.json, proper status codes)
- ESLint passes with 0 errors
- Notification types used: card_approved, card_rejected, card_suspended, admin_message, card_payment
---
Task ID: 5
Agent: Main Agent
Task: Full integration of TRAIT Card System and Admin-Client Messaging into the application

Work Log:
- Updated Prisma schema: Added CardRequest, TraitCard, CardPayment, AdminClientMessage models
  - User model: added cardRequests, cards, cardPayments, receivedClientMessages relations
  - Admin model: added sentClientMessages, cardValidations relations
- Updated store.ts: Added 'card-request', 'card-payment', 'card', 'admin-card-requests', 'admin-client-messages' page types
- Created TraitCard component (src/components/trait/TraitCard.tsx): Premium card with 3D flip animation
  - Front: Logo, card number, holder name, QR code placeholder, real-time balance, security badge
  - Back: Signature strip, CCV, security features grid, expiry date
  - USD = dark blue gradient, FC = dark red gradient
  - World map dots pattern, light streaks, suspended overlay
  - Tap to flip with smooth framer-motion animation
- Updated HomeScreen.tsx: Added "Mes Cartes TRAIT" section for clients
  - Shows active cards using TraitCard component with real-time balance
  - Shows pending request status
  - "Demander une carte" button (premium dark gradient, only when no cards/pending)
  - "Voir tout" link to full card management screen
- Updated AdminDashboard.tsx: Added card management quick access
  - "Demandes de Cartes" button (CreditCard icon, sky theme)
  - "Messages Clients" button (Mail icon, indigo theme)
  - Renamed "Messagerie" to "Messages Agents" for clarity
- Updated NotificationsScreen.tsx: Added Admin messages with copy support
  - New section "Messages de l'Admin" at top of notifications
  - Individual and broadcast messages with different icons
  - Copy button appears only when admin allows (allowCopy field)
  - Standard notifications below in "Activité" section
  - New notification type icons/colors: card_approved, card_rejected, card_suspended, admin_message, card_payment
- Updated page.tsx: Registered all new screens
  - CardRequestScreen, CardPaymentScreen, CardScreen for client
  - AdminCardRequestsScreen, AdminClientMessagesScreen for admin
  - All card pages show bottom navigation, admin pages do not
- Fixed broken template literal in HomeScreen.tsx quick actions grid
- ESLint passes with 0 errors, dev server compiles cleanly

Stage Summary:
- Complete TRAIT Card System: request → admin approval → card generation → real-time balance display → card payments
- Premium card design with 3D flip animation matching the uploaded reference card
- Admin-Client messaging system with copy permission control
- All screens integrated into the app navigation system
- 7 API routes, 6 screen components, 1 trait card component created/updated

---
Task ID: 5
Agent: Main Agent
Task: Build Admin "Cartes" tab - professional card management system

Work Log:
- Updated store.ts: Added 'admin-cards' to PageName union type
- Created `src/app/api/cards/admin/cards/route.ts`: Full card management API
  - GET: List all TraitCards with filters (status, cardType, search), includes user balances, payment counts
  - GET: Returns aggregate stats (total, active, suspended, blocked, usd, fc)
  - POST generate: Creates CardRequest + TraitCard for selected client, validates client-only role, prevents duplicate active cards per type
  - POST send-info: Sends card info reminder via Notification + AdminClientMessage with allowCopy=true
  - POST block: Blocks card with notification to client
  - All actions create AdminActivityLog entries
- Created `src/app/api/admin/clients/route.ts`: Client-only listing API
  - GET: Returns only role='client' users with search, includes card count and balances
- Created `src/components/admin/AdminCardsScreen.tsx` (690+ lines): Premium card management interface
  - Header with back button, title, refresh, and "Générer" button
  - Stats grid (6 cards): Total, Active, Suspended, Blocked, USD, FC
  - Search bar for filtering by name, phone, or card number
  - 4-tab filter: Tous, Actives, Suspendues, Bloquées
  - Card list items: user avatar, name, card number, type badge, status badge, phone, email, expiry, balance, payment count
  - Action buttons per card: Voir, Imprimer, Envoyer, Suspendre/Bloquer/Réactiver
  - Generate dialog: card type selection (USD/FC), client search, client list with details, confirmation
  - After generation: premium TraitCard preview, card details summary, auto-sent notification confirmation
  - Card detail dialog: TraitCard with 3D flip, owner info, card info grid, history timeline
  - Print function: Opens new window with HD printable card design (front + security info), auto-triggers print
- Updated AdminDashboard.tsx: Added "Cartes" quick action (CreditCard icon, sky theme) + renamed "Demandes de Cartes" with Clock icon
- Updated page.tsx: Added AdminCardsScreen import, screenMap entry, and adminPages entry

Stage Summary:
- Professional banking-grade card management interface for admin
- Complete card lifecycle: generate → view → print → suspend/activate/block → send info
- Client selection restricted to clients only (no agents/admins)
- Auto-notification to clients on generation with full card details
- Print-ready HD card design with front face and security information
- All lint checks pass, dev server compiles cleanly

---
Task ID: 6
Agent: Main Agent
Task: Professional redesign of TRAIT card - premium banking design

Work Log:
- Installed `qrcode.react@4.2.0` for professional QR code generation
- Completely redesigned `src/components/trait/TraitCard.tsx`:
  - New premium dark gradient backgrounds (navy for USD, dark red for FC)
  - New accent colors: USD = #00C9A7 (teal), FC = #FF6B6B (coral)
  - Real QR Code using QRCodeSVG from qrcode.react with TRAIT logo in center
  - QR Code encodes JSON: {card, type, holder, id} for intelligent scanning
  - Official TRAIT logo (trait-logo.png) integrated on both front and back
  - Replaced "NUMÉRO CRYPTÉ" with "NUMÉRO DE CARTE"
  - Removed balance display entirely - replaced with currency label (USD/FC)
  - Currency displayed as accent-colored pill badge (top-right)
  - Ownership text updated: "Cette carte est la propriété de [Nom du client]"
  - Subtle grid pattern instead of dot pattern for modern look
  - Rounded light blooms (not square gradients) for premium effect
  - Holographic streak across middle of card
  - Larger QR Code (72x72 with 56x56 actual QR, white rounded container with shadow)
  - Back: gradient signature strip, security features with proper icons (Lock, Shield, Globe)
  - Smooth 0.7s 3D flip animation with custom easing
  - 1200px perspective for more dramatic 3D effect
- Updated AdminCardsScreen print function:
  - Matching new premium design (same colors, gradients, layout)
  - QR Code generated via external API for print compatibility
  - Client name in ownership text on printed version
  - No balance on printed card, currency label only
  - Logo integrated via trait-logo.png image

Stage Summary:
- TraitCard component completely redesigned to banking-grade premium standard
- Real scannable QR codes linked to client account, card type, and holder
- Official TRAIT logo properly integrated on front and back
- Balance removed from card face, replaced with currency label (USD/FC)
- All text updated per requirements (NUMÉRO DE CARTE, ownership with client name)
- Print function updated to match new design
- ESLint passes with 0 errors, dev server compiles and runs cleanly

---
Task ID: 8
Agent: Main Agent
Task: Ultra-premium homepage redesign inspired by Stripe/Revolut/Flutterwave

Work Log:
- Added 15+ new premium CSS animations to globals.css:
  - shimmer, meshFloat, orbitSpin, pulseRing, gradientOrb, slideUpBlur, borderGlow, countUp, ripple, textShine, particleFloat
  - Utility classes: premium-shimmer, premium-mesh-float, premium-gradient-text, glass-card, premium-border-glow
- Added 25+ new translation keys to i18n.tsx (French + English):
  - hero_headline, hero_headline2, hero_desc, get_started, stats_users/transactions/countries/agents/uptime
  - trust_title, trust_desc, cta_title, cta_desc, cta_button, partners_title, feature_cards_title/desc
  - instant_desc, worldwide_desc, low_fees_desc, cards_title, cards_desc, barter_desc
- Completely rewrote WelcomeScreen.tsx (~550 lines) with premium fintech design:
  - FloatingParticles component: 20 animated particles with staggered delays
  - MeshGradient component: 4 animated gradient orbs with blur effects
  - AnimatedSection: scroll-triggered fade-up with blur animation
  - AnimatedCounter: animated number counting (spring physics, in-view trigger)
  - PremiumFeatureCard: hover-activated gradient overlays, scale animations, shimmer borders

  Sections:
  1. Header: Language selector pills with scale effect
  2. Hero: Spinning dashed ring around logo, gradient text headline, animated badges, dual CTA buttons with arrow animations
  3. Stats: 4 animated counter cards (15K+ users, 50K+ transactions, 50+ countries, 500+ agents)
  4. Services: Horizontal snap-scrolling carousel with hover scale effects
  5. Features: 2x2 premium grid with animated gradient overlays
  6. Trust Banner: Dark gradient with mesh patterns, grid dots, shimmer sweep, security badges (SSL/TLS, JWT, E2E)
  7. Account Buttons: Agent, Developer, Support, Contact Us - all with hover/tap animations
  8. News: 3 items with slide-in animations and hover effects
  9. PWA Install: 2 premium platform cards (Android/iOS) with hover float
  10. Info Banner: Gradient background with blur effect
  11. CTA Section: Full gradient background with decorative orbs and shimmer sweep
  12. Footer: Blur backdrop, subtle border

  All existing buttons preserved:
  - Connexion (Se connecter) → auth-login
  - Inscription (Créer un compte) → auth-phone with setSelectedRole('client')
  - Compte Agent (Créer un compte Agent) → agent-register
  - Espace Développeur → developer-register
  - Support → support
  - Nous contacter → support
  - Télécharger Android → PWA install
  - Télécharger iOS → PWA install guide

Stage Summary:
- Ultra-premium homepage matching Stripe/Revolut/PayPal design standards
- Smooth Framer Motion animations throughout (spring physics, stagger, in-view triggers)
- Fully responsive: mobile-first with sm/lg breakpoints for tablets/desktop
- Glass morphism, mesh gradients, floating particles, shimmer effects
- Animated stats counters with scroll-triggered counting
- All existing buttons and navigation preserved exactly
- Multilingual system continues to work normally
- ESLint: 0 errors, dev server: compiles and runs cleanly

---
Task ID: 7
Agent: Main Agent
Task: Implement KYC system, security middleware, admin login fix, daily limits

Work Log:
- Updated Prisma schema: Added KYC fields to User model (kycStatus, kycSubmittedAt, kycVerifiedAt, kycRejectReason, kycDocumentType, kycDocumentUrl, kycSelfieUrl, kycData). Added SecurityLog model (id, userId, adminId, action, details, ipAddress, userAgent, riskLevel). Added User→InternationalTransfer relation.
- Created `src/lib/security.ts`: Security middleware module
  - `logSecurityEvent()`: Logs security events to SecurityLog table
  - `checkDailyLimit()`: Counts daily outbound transactions (sent + withdrawals + international), limit 10/day
  - `checkKYC()`: Checks user KYC verification status
  - `detectSuspiciousActivity()`: Detects rapid transactions (5+/30min), high-value (>$500), near-limit, new account + high value
- Created `src/app/api/kyc/route.ts`: KYC verification API
  - GET: Returns KYC status + daily transaction count/limit for user
  - POST: Submits KYC verification (documentType, documentUrl, selfieUrl) — validates types, prevents duplicates, creates security log + notification
- Created `src/app/api/auth/upload-kyc/route.ts`: KYC document upload endpoint
  - Accepts image files (JPG/PNG/WebP, max 5MB), saves to public/uploads/kyc/
- Updated `src/app/api/transfers/international/route.ts`: Added security checks
  - Account suspension check with security log
  - KYC verification required — returns KYC_REQUIRED (403) with status info
  - Daily transaction limit (10/day) — returns DAILY_LIMIT_REACHED (429)
  - Suspicious activity detection — blocks if 2+ red flags, logs all detections
- Updated `src/app/api/admin/login/route.ts`: Added security logging (login success + login failed)
- Updated `src/app/api/auth/login/route.ts`: Added login_failed security log for wrong passwords
- Updated `src/lib/store.ts`: Removed `admin` from persistence (password required every login), added 'kyc-verification' PageName
- Created `src/components/screens/KYCVerificationScreen.tsx`: Complete KYC verification UI
  - Status display: none/pending/verified/rejected with appropriate colors and icons
  - Security info card showing daily transaction count and remaining
  - "What is KYC?" explanation section with 5 verification items
  - Document upload form: type selection (ID card, passport, driver's license), document upload, selfie upload
  - Confirmation dialog before submission
  - Security notice about data encryption
  - Verified state shows "Effectuer un transfert international" button
- Updated `src/components/screens/InternationalTransferScreen.tsx`: Added KYC + security warnings
  - KYC warning banner when not verified (with "Vérifier" button linking to kyc-verification)
  - Daily limit warning banner when ≤3 transactions remaining
  - Checks run on mount via useEffect
- Updated `src/app/page.tsx`: Added KYCVerificationScreen import, screenMap entry, pagesWithNav entry

Stage Summary:
- Complete KYC verification system: submit → pending → verified/rejected flow
- Security middleware: daily limits (10/day), anti-fraud detection, security logging
- Admin login: no longer persisted in localStorage, password required every session
- International transfers blocked without KYC, respect daily limits, detect suspicious activity
- All security events logged to SecurityLog table with risk levels
- ESLint passes with 0 errors, dev server compiles cleanly
---
Task ID: 1
Agent: main
Task: Fix WelcomeScreen stats, hydration error, and make download buttons functional

Work Log:
- Confirmed FloatingParticles hydration mismatch was already fixed (deterministic values replacing Math.random())
- Confirmed stats array was already reduced to single "50+ pays couverts" item
- Updated stats to 3 items: "50+ pays couverts", "0.7% frais minimum", "$10 bonus inscription" with grid-cols-3
- Added StepItem component for install guide modal
- Replaced handleAndroidInstall to use beforeinstallprompt when available, fallback to modal with Chrome instructions
- Replaced handleIOSInstall to open install guide modal with Safari instructions instead of toast
- Added full Install Guide Modal with step-by-step instructions for both Android (Chrome) and iOS (Safari)
- Modal includes app badge preview with TRAIT logo
- Updated manifest.json: theme_color → #1E40AF, background_color → #ffffff
- Added 26 new translation keys (French + English) for install modal steps, stats, and PWA note
- Lint passes clean, no hydration errors in dev log

Stage Summary:
- Download buttons are now fully functional: Android uses native PWA install prompt (Chrome), iOS shows detailed Safari instructions modal
- Both platforms have 4-step visual guides with numbered steps, icons, and clear instructions
- Stats section now shows 3 relevant data points: 50+ countries, 0.7% fees, $10 bonus
- Files modified: WelcomeScreen.tsx, i18n.tsx, manifest.json
