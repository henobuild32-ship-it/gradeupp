'use client';

import '@/lib/api';
import { useEffect, Suspense, lazy, Component, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore, PageName, User } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { PushPermissionBanner } from '@/components/layout/PushPermissionBanner';
import AppLock from '@/components/layout/AppLock';
import { useRealtime } from '@/hooks/useRealtime';
import { useGoogleRedirect } from '@/hooks/useGoogleRedirect';
import { toast } from 'sonner';
import { resetSessionExpiredFlag } from '@/lib/api';
import { isFreshAuth } from '@/lib/session-flag';
import { routeAfterAuth } from '@/lib/route-after-auth';
import { clearRetiredOfflineData } from '@/lib/legacy-offline-cleanup';

// Auth screens
const WelcomeScreen = lazy(() => import('@/components/screens/WelcomeScreen'));
const AuthRoleScreen = lazy(() => import('@/components/screens/AuthRoleScreen'));
const AuthPhoneScreen = lazy(() => import('@/components/screens/AuthPhoneScreen'));
const AuthOtpScreen = lazy(() => import('@/components/screens/AuthOtpScreen'));
const AuthProfileScreen = lazy(() => import('@/components/screens/AuthProfileScreen'));
const PinSetupScreen = lazy(() => import('@/components/screens/PinSetupScreen'));
const PinVerifyScreen = lazy(() => import('@/components/screens/PinVerifyScreen'));
const OnboardingScreen = lazy(() => import('@/components/screens/OnboardingScreen'));

// Main screens
const HomeScreen = lazy(() => import('@/components/screens/HomeScreen'));
const SendScreen = lazy(() => import('@/components/screens/SendScreen'));
const WithdrawScreen = lazy(() => import('@/components/screens/WithdrawScreen'));
const DepositScreen = lazy(() => import('@/components/screens/DepositScreen'));
const HistoryScreen = lazy(() => import('@/components/screens/HistoryScreen'));
const MarketplaceScreen = lazy(() => import('@/components/screens/MarketplaceScreen'));
const MarketplaceDetailScreen = lazy(() => import('@/components/screens/MarketplaceDetailScreen'));
const BarterScreen = lazy(() => import('@/components/screens/BarterScreen'));
const BarterDetailScreen = lazy(() => import('@/components/screens/BarterDetailScreen'));
const BarterCreateScreen = lazy(() => import('@/components/screens/BarterCreateScreen'));
const BarterChatsScreen = lazy(() => import('@/components/screens/BarterChatsScreen'));
const NotificationsScreen = lazy(() => import('@/components/screens/NotificationsScreen'));
const SettingsScreen = lazy(() => import('@/components/screens/SettingsScreen'));
const ProfileScreen = lazy(() => import('@/components/screens/ProfileScreen'));

// Agent screens
const AgentDashboardScreen = lazy(() => import('@/components/screens/AgentDashboardScreen'));
const AgentDepositScreen = lazy(() => import('@/components/screens/AgentDepositScreen'));
const AgentWithdrawValidateScreen = lazy(() => import('@/components/screens/AgentWithdrawValidateScreen'));
const AgentActivityScreen = lazy(() => import('@/components/screens/AgentActivityScreen'));

// Admin screens
const AdminLoginScreen = lazy(() => import('@/components/admin/AdminLoginScreen'));
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'));
const AdminUsersScreen = lazy(() => import('@/components/admin/AdminUsersScreen'));
const AdminAgentsScreen = lazy(() => import('@/components/admin/AdminAgentsScreen'));
const AdminTransactionsScreen = lazy(() => import('@/components/admin/AdminTransactionsScreen'));
const AdminFeesScreen = lazy(() => import('@/components/admin/AdminFeesScreen'));
const AdminMarketScreen = lazy(() => import('@/components/admin/AdminMarketScreen'));
const AdminBarterScreen = lazy(() => import('@/components/admin/AdminBarterScreen'));
const AdminNotificationsScreen = lazy(() => import('@/components/admin/AdminNotificationsScreen'));
const AdminActivityLogScreen = lazy(() => import('@/components/admin/AdminActivityLogScreen'));
const AdminBonusScreen = lazy(() => import('@/components/admin/AdminBonusScreen'));
const AdminBonusAdjustScreen = lazy(() => import('@/components/admin/AdminBonusAdjustScreen'));
const AdminBonusHistoryScreen = lazy(() => import('@/components/admin/AdminBonusHistoryScreen'));
const AdminBonusCampaignsScreen = lazy(() => import('@/components/admin/AdminBonusCampaignsScreen'));
const AdminAgentValidationScreen = lazy(() => import('@/components/admin/AdminAgentValidationScreen'));
const AdminMessagesScreen = lazy(() => import('@/components/admin/AdminMessagesScreen'));
const AgentMessagesScreen = lazy(() => import('@/components/screens/AgentMessagesScreen'));
const InternationalTransferScreen = lazy(() => import('@/components/screens/InternationalTransferScreen'));
const DeveloperDashboardScreen = lazy(() => import('@/components/screens/DeveloperDashboardScreen'));
const DeveloperRegisterScreen = lazy(() => import('@/components/screens/DeveloperRegisterScreen'));
const AgentRegisterScreen = lazy(() => import('@/components/screens/AgentRegisterScreen'));
const AgentPendingScreen = lazy(() => import('@/components/screens/AgentPendingScreen'));
const SupportScreen = lazy(() => import('@/components/screens/SupportScreen'));
const KYCVerificationScreen = lazy(() => import('@/components/screens/KYCVerificationScreen'));
const CardRequestScreen = lazy(() => import('@/components/screens/CardRequestScreen'));
const CardPaymentScreen = lazy(() => import('@/components/screens/CardPaymentScreen'));
const CardScreen = lazy(() => import('@/components/screens/CardScreen'));
const VirtualCardScreen = lazy(() => import('@/components/screens/VirtualCardScreen'));

// Seller screens
const SellerRegisterScreen = lazy(() => import('@/components/screens/SellerRegisterScreen'));
const SellerPendingScreen = lazy(() => import('@/components/screens/SellerPendingScreen'));
const SellerDashboard = lazy(() => import('@/components/screens/SellerDashboard'));
const SellerProductsScreen = lazy(() => import('@/components/screens/SellerProductsScreen'));
const SellerQRScannerScreen = lazy(() => import('@/components/screens/SellerQRScannerScreen'));

// Admin screens continued
const AdminDevelopersScreen = lazy(() => import('@/components/admin/AdminDevelopersScreen'));
const AdminCardRequestsScreen = lazy(() => import('@/components/admin/AdminCardRequestsScreen'));
const AdminCardsScreen = lazy(() => import('@/components/admin/AdminCardsScreen'));
const AdminClientMessagesScreen = lazy(() => import('@/components/admin/AdminClientMessagesScreen'));
const AdminSellerValidationScreen = lazy(() => import('@/components/admin/AdminSellerValidationScreen'));
const AdminSellersScreen = lazy(() => import('@/components/admin/AdminSellersScreen'));
const AdminChildrenScreen = lazy(() => import('@/components/admin/AdminChildrenScreen'));
const AdminKycScreen = lazy(() => import('@/components/admin/AdminKycScreen'));
const ChildSponsorshipScreen = lazy(() => import('@/components/screens/ChildSponsorshipScreen'));
const TwoFactorScreen = lazy(() => import('@/components/screens/TwoFactorScreen'));
const ChangePinScreen = lazy(() => import('@/components/screens/ChangePinScreen'));
const MyQrCodeScreen = lazy(() => import('@/components/screens/MyQrCodeScreen'));
const IntegrationGuideScreen = lazy(() => import('@/components/screens/IntegrationGuideScreen'));
const AuthScreen = lazy(() => import('@/components/screens/AuthScreen'));
const ForgotPasswordScreen = lazy(() => import('@/components/screens/ForgotPasswordScreen'));
const AdminSupportScreen = lazy(() => import('@/components/admin/AdminSupportScreen'));
const AdminReportsScreen = lazy(() => import('@/components/admin/AdminReportsScreen'));

// TRAIT IA
const TraitAIScreen = lazy(() => import('@/components/trait-ai/TraitAIScreen'));

// New fintech screens
const PaymentLinksScreen = lazy(() => import('@/components/screens/PaymentLinksScreen'));
const PaymentRequestScreen = lazy(() => import('@/components/screens/PaymentRequestScreen'));
const RecurringPaymentsScreen = lazy(() => import('@/components/screens/RecurringPaymentsScreen'));
const BundleCatalogScreen = lazy(() => import('@/components/screens/BundleCatalogScreen'));
const BillsScreen = lazy(() => import('@/components/screens/BillsScreen'));
const MicroCreditScreen = lazy(() => import('@/components/screens/MicroCreditScreen'));
const SavingsGoalsScreen = lazy(() => import('@/components/screens/SavingsGoalsScreen'));
const ReferralScreen = lazy(() => import('@/components/screens/ReferralScreen'));
const AnalyticsScreen = lazy(() => import('@/components/screens/AnalyticsScreen'));
const ReceiptScreen = lazy(() => import('@/components/screens/ReceiptScreen'));
const ContactPayScreen = lazy(() => import('@/components/screens/ContactPayScreen'));
const OrdersScreen = lazy(() => import('@/components/screens/OrdersScreen'));

const BottomNavigation = lazy(() => import('@/components/layout/BottomNavigation'));
const PWAInstallBanner = lazy(() => import('@/components/layout/PWAInstallBanner').then(m => ({ default: m.PWAInstallBanner })));
const UpdateNotice = lazy(() => import('@/components/layout/UpdateNotice').then(m => ({ default: m.UpdateNotice })));
const TraitAIFloatingButton = lazy(() => import('@/components/trait-ai/TraitAIFloatingButton'));

function ScreenLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Skeleton className="h-12 w-12 rounded-full mx-auto mb-3" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

class ScreenErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Screen render failure', {
      name: error.name,
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center bg-background px-6">
          <div className="text-center">
            <p className="mb-2 text-2xl">⚠️</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Une erreur est survenue. Vérifiez votre connexion puis réessayez.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const screenMap: Record<PageName, React.LazyExoticComponent<React.ComponentType>> = {
  welcome: WelcomeScreen,
  'auth-role': AuthRoleScreen,
  'auth-phone': AuthPhoneScreen,
  'auth-login': AuthScreen,
  'admin-login': AdminLoginScreen,
  'auth-otp': AuthOtpScreen,
  'auth-profile': AuthProfileScreen,
  'pin-setup': PinSetupScreen,
  'pin-verify': PinVerifyScreen,
  onboarding: OnboardingScreen,
  home: HomeScreen,
  send: SendScreen,
  withdraw: WithdrawScreen,
  deposit: DepositScreen,
  history: HistoryScreen,
  marketplace: MarketplaceScreen,
  'marketplace-detail': MarketplaceDetailScreen,
  'marketplace-sell': SellerProductsScreen,
  orders: OrdersScreen,
  barter: BarterScreen,
  'barter-detail': BarterDetailScreen,
  'barter-create': BarterCreateScreen,
  'barter-chats': BarterChatsScreen,
  notifications: NotificationsScreen,
  settings: SettingsScreen,
  profile: ProfileScreen,
  'agent-dashboard': AgentDashboardScreen,
  'agent-deposit': AgentDepositScreen,
  'agent-withdraw-validate': AgentWithdrawValidateScreen,
  'agent-activity': AgentActivityScreen,
  'admin-dashboard': AdminDashboard,
  'admin-users': AdminUsersScreen,
  'admin-agents': AdminAgentsScreen,
  'admin-transactions': AdminTransactionsScreen,
  'admin-fees': AdminFeesScreen,
  'admin-market': AdminMarketScreen,
  'admin-barter': AdminBarterScreen,
  'admin-notifications': AdminNotificationsScreen,
  'admin-activity-log': AdminActivityLogScreen,
  'admin-bonus': AdminBonusScreen,
  'admin-bonus-adjust': AdminBonusAdjustScreen,
  'admin-bonus-history': AdminBonusHistoryScreen,
  'admin-bonus-campaigns': AdminBonusCampaignsScreen,
  'admin-agent-validation': AdminAgentValidationScreen,
  'admin-messages': AdminMessagesScreen,
  'admin-developers': AdminDevelopersScreen,
  'agent-messages': AgentMessagesScreen,
  'international-transfer': InternationalTransferScreen,
  'developer-dashboard': DeveloperDashboardScreen,
  'developer-register': DeveloperRegisterScreen,
  'agent-register': AgentRegisterScreen,
  'agent-pending': AgentPendingScreen,
  support: SupportScreen,
  'kyc-verification': KYCVerificationScreen,
  'card-request': CardRequestScreen,
  'card-payment': CardPaymentScreen,
  card: CardScreen,
  'virtual-card': VirtualCardScreen,
  'admin-card-requests': AdminCardRequestsScreen,
  'admin-cards': AdminCardsScreen,
  'admin-client-messages': AdminClientMessagesScreen,
  'admin-seller-validation': AdminSellerValidationScreen,
  'admin-sellers': AdminSellersScreen,
  'admin-children': AdminChildrenScreen,
  'admin-kyc': AdminKycScreen,
  'child-sponsorship': ChildSponsorshipScreen,
  'two-factor-setup': TwoFactorScreen,
  'change-pin': ChangePinScreen,
  'my-qr-code': MyQrCodeScreen,
  'integration-guide': IntegrationGuideScreen,
  'admin-support': AdminSupportScreen,
  'admin-reports': AdminReportsScreen,
  'seller-register': SellerRegisterScreen,
  'seller-pending': SellerPendingScreen,
  'seller-dashboard': SellerDashboard,
  'seller-products': SellerProductsScreen,
  'seller-qr-scanner': SellerQRScannerScreen,

  // New fintech screens
  'payment-links': PaymentLinksScreen,
  'payment-requests': PaymentRequestScreen,
  'recurring-payments': RecurringPaymentsScreen,
  'bundle-catalog': BundleCatalogScreen,
  'bills': BillsScreen,
  'micro-credit': MicroCreditScreen,
  'savings-goals': SavingsGoalsScreen,
  'referral': ReferralScreen,
  'analytics': AnalyticsScreen,
  'receipt': ReceiptScreen,
  'contact-pay': ContactPayScreen,
  'auth': AuthScreen,
  'forgot-password': ForgotPasswordScreen,
  'reset-password': ForgotPasswordScreen,
  'trait-ai': TraitAIScreen,
  'trait-ai-welcome': TraitAIScreen,
};

const pagesWithNav: PageName[] = ['home', 'send', 'withdraw', 'deposit', 'history', 'marketplace', 'marketplace-detail', 'marketplace-sell', 'orders', 'barter', 'barter-detail', 'barter-create', 'barter-chats', 'notifications', 'settings', 'profile', 'agent-dashboard', 'agent-deposit', 'agent-withdraw-validate', 'agent-activity', 'agent-messages', 'card-request', 'card-payment', 'card', 'virtual-card', 'kyc-verification', 'seller-dashboard', 'seller-products', 'child-sponsorship'];

const adminPages: PageName[] = ['admin-login', 'admin-dashboard', 'admin-users', 'admin-agents', 'admin-transactions', 'admin-fees', 'admin-market', 'admin-barter', 'admin-notifications', 'admin-activity-log', 'admin-bonus', 'admin-bonus-adjust', 'admin-bonus-history', 'admin-bonus-campaigns', 'admin-agent-validation', 'admin-messages', 'admin-developers', 'admin-card-requests', 'admin-cards', 'admin-client-messages', 'admin-seller-validation', 'admin-sellers', 'admin-children', 'admin-kyc', 'admin-support', 'admin-reports'];

const sellerPendingPages: PageName[] = [
  'seller-pending', 'settings', 'support', 'notifications', 'profile',
  'change-pin', 'two-factor-setup',
  'barter', 'barter-detail', 'barter-create', 'barter-chats',
  'welcome', 'auth', 'auth-role', 'auth-phone', 'auth-login', 'auth-otp', 'auth-profile',
  'forgot-password', 'reset-password', 'pin-setup', 'pin-verify', 'onboarding',
  'trait-ai', 'trait-ai-welcome',
];

const sellerValidatedPages: PageName[] = [
  ...sellerPendingPages,
  'seller-dashboard', 'seller-products', 'seller-qr-scanner',
  'marketplace', 'marketplace-detail', 'marketplace-sell', 'orders', 'receipt',
];

const agentPages: PageName[] = [
  'agent-dashboard', 'agent-deposit', 'agent-withdraw-validate', 'agent-activity', 'agent-messages',
  'marketplace', 'marketplace-detail', 'marketplace-sell', 'orders', 'receipt',
  'barter', 'barter-detail', 'barter-create', 'barter-chats',
  'settings', 'support', 'notifications', 'profile',
  'change-pin', 'two-factor-setup',
  'welcome', 'auth', 'auth-role', 'auth-phone', 'auth-login', 'auth-otp', 'auth-profile',
  'forgot-password', 'reset-password', 'pin-setup', 'pin-verify', 'onboarding',
  'trait-ai', 'trait-ai-welcome',
];

function routeAuthenticatedUser(
  navigateTo: (page: PageName, params?: Record<string, any>) => void,
  authenticatedUser: User,
  restoreLastPage: boolean,
) {
  if (!authenticatedUser.isVerified && authenticatedUser.role !== 'agent') {
    navigateTo('auth-otp', authenticatedUser.email ? { email: authenticatedUser.email, mode: 'verify' } : undefined);
    return;
  }
  if (authenticatedUser.pinSet === false || (!authenticatedUser.hasCompletedOnboarding && authenticatedUser.role !== 'seller')) {
    routeAfterAuth(navigateTo, authenticatedUser);
    return;
  }

  const saved = useAppStore.getState();
  const page = saved.lastAuthenticatedPage;
  const sellerOnlyPages: PageName[] = ['seller-dashboard', 'seller-products', 'seller-qr-scanner', 'seller-pending', 'seller-register'];
  const agentOnlyPages: PageName[] = ['agent-dashboard', 'agent-deposit', 'agent-withdraw-validate', 'agent-activity', 'agent-messages', 'agent-pending', 'agent-register'];
  const roleAllowsPage = authenticatedUser.role === 'seller'
    ? !!page && !adminPages.includes(page) && (!sellerOnlyPages.includes(page) || sellerPendingPages.includes(page) || authenticatedUser.validationStatus === 'validated') && !agentOnlyPages.includes(page)
    : authenticatedUser.role === 'agent'
      ? !!page && !adminPages.includes(page) && (!sellerOnlyPages.includes(page))
      : authenticatedUser.role === 'client'
        ? !!page && !adminPages.includes(page) && !sellerOnlyPages.includes(page) && !agentOnlyPages.includes(page)
        : false;

  if (restoreLastPage && saved.lastAuthenticatedAccountId === authenticatedUser.id && page && roleAllowsPage) {
    navigateTo(page, saved.lastAuthenticatedPageParams);
    return;
  }
  routeAfterAuth(navigateTo, authenticatedUser);
}

export default function TraitApp() {
  const router = useRouter();
  const { currentPage, user, admin, navigateTo } = useAppStore();
  const Screen = screenMap[currentPage];
  const [appLocked, setAppLocked] = useState(false);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [sessionRestoreError, setSessionRestoreError] = useState(false);
  const [sessionRestoreAttempt, setSessionRestoreAttempt] = useState(0);
  const needsRestoreUnlock = !!user && !isFreshAuth();
  const handleAppUnlock = (verifiedUser?: User) => {
    if (verifiedUser) {
      useAppStore.getState().setUser(verifiedUser);
      if (currentPage === 'welcome') routeAuthenticatedUser(navigateTo, verifiedUser, true);
    }
    setAppLocked(false);
  };

  // Enable real-time WebSocket for notifications and balance updates
  useRealtime();

  // Google redirect return (mobile / popup blocked) is handled at app level:
  // the user may come back on any screen, not only the auth screen.
  useGoogleRedirect();

  useEffect(() => {
    clearRetiredOfflineData();
  }, []);

  useEffect(() => {
    const markStoreHydrated = () => setStoreHydrated(true);
    try {
      const persistence = useAppStore.persist;
      if (!persistence) {
        markStoreHydrated();
        return;
      }
      if (persistence.hasHydrated()) markStoreHydrated();
      return persistence.onFinishHydration(markStoreHydrated);
    } catch {
      markStoreHydrated();
    }
  }, []);

  // Verrouillage à la réouverture de l'app (rechargement / cold start APK) :
  // toute session restaurée depuis le stockage local passe par l'écran de
  // verrouillage (biométrie ou PIN) sauf si l'auth vient d'avoir lieu.
  useEffect(() => {
    if (user && !isFreshAuth()) {
      setAppLocked(true);
    }
  }, [user?.id]);

  // Retour au premier plan après inactivité → reverrouiller
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && useAppStore.getState().user) setAppLocked(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Restauration de session : procédure normale (vérification → PIN →
  // onboarding) AVANT d'atteindre l'interface, avec la vérité serveur.
  useEffect(() => {
    if (!user || currentPage !== 'welcome') return;
    let cancelled = false;
    setSessionRestoreError(false);
    (async () => {
      try {
        const res = await fetch('/api/auth/profile', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success && data.user) {
            useAppStore.getState().setUser(data.user);
            routeAuthenticatedUser(navigateTo, data.user, true);
            return;
          }
          if (!cancelled && (res.status === 401 || res.status === 403 || res.status === 404)) {
            useAppStore.getState().logout();
            return;
          }
          if (!cancelled) {
            setSessionRestoreError(true);
            toast.error('Session non vérifiée. Votre espace reste verrouillé; réessayez quand le réseau sera disponible.');
          }
          return;
        }
        if (!cancelled) {
          setSessionRestoreError(true);
          toast.error('Impossible de vérifier la session. Votre espace reste verrouillé.');
        }
      } catch {
        if (!cancelled) {
          setSessionRestoreError(true);
          toast.error('Connexion indisponible. Réessayez pour restaurer votre session.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
     
  }, [user?.id, currentPage, sessionRestoreAttempt, navigateTo]);

  // Un profil administrateur local n'est jamais une preuve de session.
  useEffect(() => {
    if (!admin) return;
    if (currentPage === 'welcome') {
      navigateTo('admin-login');
      return;
    }
    if (currentPage !== 'admin-login') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/profile', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.success && data.admin) {
          useAppStore.getState().setAdmin(data.admin);
          const saved = useAppStore.getState();
          const savedAdminPage = saved.lastAuthenticatedAccountId === data.admin.id &&
            saved.lastAuthenticatedPage && adminPages.includes(saved.lastAuthenticatedPage) && saved.lastAuthenticatedPage !== 'admin-login'
            ? saved.lastAuthenticatedPage
            : 'admin-dashboard';
          navigateTo(savedAdminPage, saved.lastAuthenticatedPageParams);
        } else if (res.status === 401 || res.status === 403 || res.status === 404) {
          useAppStore.getState().setAdmin(null);
        }
      } catch {
        // Keep the user on the public admin-login screen until the server can
        // validate the cookie; never render an admin workspace from local data.
      }
    })();
    return () => { cancelled = true; };
  }, [admin, currentPage, navigateTo]);

  useEffect(() => {
    if (!admin && adminPages.includes(currentPage) && currentPage !== 'admin-login') {
      navigateTo('admin-login');
    }
  }, [admin, currentPage, navigateTo]);

  useEffect(() => {
    if (!user || admin) return;
    if (adminPages.includes(currentPage)) return;
    if (user.role === 'seller') {
      const validated = user.validationStatus === 'validated' && !user.suspended;
      const allowed = validated ? sellerValidatedPages : sellerPendingPages;
      if (!allowed.includes(currentPage)) {
        navigateTo(validated ? 'seller-dashboard' : 'seller-pending');
      }
      return;
    }
    if (user.role === 'agent') {
      if (!agentPages.includes(currentPage)) {
        navigateTo('agent-dashboard');
      }
      return;
    }
    const clientOnlyPages: PageName[] = ['child-sponsorship'];
    if (clientOnlyPages.includes(currentPage) && user.role !== 'client') {
      navigateTo('home');
      return;
    }
  }, [user, admin, currentPage, navigateTo]);

  // Session expired → friendly message + re-auth (not raw "Non authentifié")
  useEffect(() => {
    const onSessionExpired = () => {
      toast.error('Session expirée. Veuillez vous reconnecter.');
      navigateTo('welcome');
    };
    window.addEventListener('trait:session-expired', onSessionExpired);
    return () => window.removeEventListener('trait:session-expired', onSessionExpired);
  }, [navigateTo]);

  // Re-sync user profile when session is restored after reload
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const syncProfile = async () => {
      try {
        const res = await fetch('/api/auth/profile', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.success && data.user) {
          // The API is authoritative for role, KYC, balances and account state.
          useAppStore.getState().setUser(data.user);
          // Procédure normale : un compte sans PIN configuré ne peut pas
          // rester sur un écran de transaction — retour forcé à la config.
          if (data.user.pinSet === false) {
            const cur = useAppStore.getState().currentPage;
            const transactable: PageName[] = ['home', 'send', 'withdraw', 'deposit', 'history', 'marketplace', 'marketplace-detail', 'marketplace-sell', 'orders', 'barter', 'barter-detail', 'barter-create', 'barter-chats', 'bills', 'bundle-catalog', 'micro-credit', 'savings-goals', 'payment-links', 'payment-requests', 'recurring-payments', 'international-transfer', 'card', 'virtual-card', 'card-payment', 'card-request', 'contact-pay', 'agent-dashboard', 'agent-deposit', 'agent-withdraw-validate', 'seller-dashboard', 'seller-products'];
            if (transactable.includes(cur)) {
              toast.info('Configurez votre code PIN pour effectuer des transactions');
              useAppStore.getState().navigateTo('pin-setup');
            }
          }
        }
      } catch {}
    };
    const t = setTimeout(syncProfile, 500);
    return () => { cancelled = true; clearTimeout(t); };
     
  }, [user?.id]);

  useEffect(() => {
    resetSessionExpiredFlag();
  }, [user?.id]);

  // Handle ?pay=userId from QR code scan
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const payUserId = params.get('pay')
    if (payUserId && user && currentPage === 'home') {
      // Clean URL
      window.history.replaceState({}, '', '/')
      navigateTo('send', { payRecipientId: payUserId })
    }
  }, [user, currentPage, navigateTo])

  // Handle ?pay_link=CODE to redirect user to checkout
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const payLinkCode = params.get('pay_link')
    if (payLinkCode) {
      if (user) {
        // Clean URL and go to checkout page
        window.history.replaceState({}, '', '/')
        router.push(`/pay/link/${encodeURIComponent(payLinkCode)}`)
      } else {
        // Force user to welcome screen to authenticate
        navigateTo('welcome')
      }
    }
  }, [user, navigateTo, router])

  // Open the confirmed payment receipt after a public payment link returns to the app.
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return
    const params = new URLSearchParams(window.location.search)
    const transactionId = params.get('receipt')
    if (!transactionId) return
    window.history.replaceState({}, '', '/')
    navigateTo('receipt', { transactionId })
  }, [user, navigateTo])

  // Synchronize Push Notifications subscription (re-sync existing, don't auto-request)
  useEffect(() => {
    if (!user) return

    const syncPushSubscription = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

        let reg: ServiceWorkerRegistration
        try {
          reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        } catch { return }

        await navigator.serviceWorker.ready

        // Only re-sync if permission already granted AND subscription exists
        if (Notification.permission !== 'granted') return

        const sub = await reg.pushManager.getSubscription()
        if (!sub) return

        const p256dhKey = sub.getKey('p256dh')
        const authKey = sub.getKey('auth')
        if (!p256dhKey || !authKey) return

        const keys = {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dhKey))),
          auth: btoa(String.fromCharCode(...new Uint8Array(authKey))),
        }

        await fetch('/api/notifications/push', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth }),
        })
      } catch { /* silent */ }
    }

    const timer = setTimeout(syncPushSubscription, 2000)
    return () => clearTimeout(timer)
  }, [user])

  if (!storeHydrated || (user && currentPage === 'welcome' && !sessionRestoreError)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Restauration de votre espace…</p>
        </div>
      </main>
    );
  }

  if (user && currentPage === 'welcome' && sessionRestoreError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-lg font-semibold">Votre espace est temporairement inaccessible</h1>
          <p className="text-sm text-muted-foreground">La session n’a pas pu être vérifiée. Réessayez quand la connexion sera disponible.</p>
          <button
            type="button"
            onClick={() => setSessionRestoreAttempt((attempt) => attempt + 1)}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={() => { setSessionRestoreError(false); useAppStore.getState().logout(); }}
            className="w-full rounded-xl px-5 py-3 text-sm font-medium text-muted-foreground"
          >
            Se reconnecter
          </button>
        </div>
      </main>
    );
  }

  if (!Screen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-2xl mb-2">🚧</p>
          <p className="text-sm text-muted-foreground">Page &quot;{currentPage}&quot; en construction</p>
        </div>
      </div>
    );
  }

  const showNav = user && pagesWithNav.includes(currentPage);
  const isAdminPage = adminPages.includes(currentPage);
  const showPwaInstallBanner = !!user && !isAdminPage &&
    ['home', 'agent-dashboard', 'seller-dashboard'].includes(currentPage);

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      {user && <PushPermissionBanner />}
      <div className={`flex-1 ${showNav ? 'pb-16' : ''}`}>
        <Suspense fallback={<ScreenLoader />}>
          <ScreenErrorBoundary key={currentPage}>
            <Screen />
          </ScreenErrorBoundary>
        </Suspense>
      </div>
      {showNav && (
        <Suspense fallback={null}>
          <BottomNavigation />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <PWAInstallBanner visible={showPwaInstallBanner} />
      </Suspense>
      <Suspense fallback={null}>
        <UpdateNotice />
      </Suspense>
      {user && !adminPages.includes(currentPage) && currentPage !== 'trait-ai' && currentPage !== 'trait-ai-welcome' && (
        <Suspense fallback={null}>
          <TraitAIFloatingButton />
        </Suspense>
      )}
      <OfflineBanner />
      {user && (appLocked || needsRestoreUnlock) && (
        <AppLock onUnlock={handleAppUnlock} />
      )}
    </div>
  );
}
