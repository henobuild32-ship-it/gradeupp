import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/lib/i18n';

export type PageName =
  | 'welcome'
  | 'auth-role'
  | 'auth-phone'
  | 'auth-otp'
  | 'auth-profile'
  | 'pin-setup'
  | 'auth-login'
  | 'admin-login'
  | 'pin-verify'
  | 'onboarding'
  | 'home'
  | 'send'
  | 'withdraw'
  | 'deposit'
  | 'history'
  | 'marketplace'
  | 'marketplace-detail'
  | 'marketplace-sell'
  | 'orders'
  | 'barter'
  | 'barter-detail'
  | 'barter-create'
  | 'barter-chats'
  | 'notifications'
  | 'settings'
  | 'profile'
  | 'agent-dashboard'
  | 'agent-deposit'
  | 'agent-withdraw-validate'
  | 'agent-activity'
  | 'agent-messages'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-agents'
  | 'admin-transactions'
  | 'admin-fees'
  | 'admin-market'
  | 'admin-barter'
  | 'admin-notifications'
  | 'admin-activity-log'
  | 'admin-seller-validation'
  | 'admin-sellers'
  | 'admin-bonus'
  | 'admin-bonus-adjust'
  | 'admin-bonus-history'
  | 'admin-bonus-campaigns'
  | 'admin-agent-validation'
  | 'admin-messages'
  | 'admin-developers'
  | 'developer-register'
  | 'developer-dashboard'
  | 'international-transfer'
  | 'agent-register'
  | 'agent-pending'
  | 'support'
  | 'kyc-verification'
  | 'card-request'
  | 'card-payment'
  | 'card'
  | 'virtual-card'
  | 'admin-card-requests'
  | 'admin-cards'
  | 'admin-client-messages'
  | 'admin-children'
  | 'admin-kyc'
  | 'seller-register'
  | 'seller-pending'
  | 'seller-dashboard'
  | 'seller-products'
  | 'seller-qr-scanner'
  | 'child-sponsorship'
  | 'two-factor-setup'
  | 'change-pin'
  | 'my-qr-code'
  | 'integration-guide'
  | 'admin-support'
  | 'admin-reports'
  | 'payment-links'
  | 'payment-requests'
  | 'recurring-payments'
  | 'bundle-catalog'
  | 'bills'
  | 'micro-credit'
  | 'savings-goals'
  | 'referral'
  | 'analytics'
  | 'receipt'
  | 'contact-pay'
  | 'forgot-password'
  | 'auth'
  | 'reset-password'
  | 'trait-ai'
  | 'trait-ai-welcome';

export type UserRole = 'client' | 'agent' | 'seller';

export interface User {
  id: string;
  phone: string;
  name: string;
  pseudo: string;
  email: string | null;
  gender: string | null;
  city: string | null;
  country: string;
  role: UserRole;
  agentCode: string | null;
  agentNumber: string | null;
  validationStatus: string;
  validationRejectReason: string | null;
  businessName?: string | null;
  businessType?: string | null;
  location?: string | null;
  suspensionReason?: string | null;
  realBalance: number;
  realBalanceFC: number;
  bonusBalance: number;
  bonusBalanceFC: number;
  parentId?: string | null;
  isVerified: boolean;
  suspended: boolean;
  hasCompletedOnboarding: boolean;
  pinSet?: boolean;
  biometricEnabled?: boolean;
  unlockMethod?: 'none' | 'pin' | 'biometric';
  twoFactorEnabled?: boolean;
  referralCode?: string | null;
  createdAt?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: string;
  token?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'transfer_received' | 'transfer_sent' | 'withdrawal_validated' | 'purchase' | 'barter_accepted' | 'general' | 'security' | 'promo' | 'system' | 'announcement' | 'alert' | 'maintenance';
  read: boolean;
  createdAt: string;
}

interface NavigationState {
  currentPage: PageName;
  pageParams: Record<string, any>;
  navigationStack: Array<{ page: PageName; params?: Record<string, any> }>;
  navigateTo: (page: PageName, params?: Record<string, any>) => void;
  goBack: () => void;
  goBackTo: (fallbackPage?: PageName) => void;
}

interface AuthState {
  user: User | null;
  admin: AdminUser | null;
  selectedRole: UserRole;
  token: string | null;
  setUser: (user: User | null) => void;
  setAdmin: (admin: AdminUser | null) => void;
  setSelectedRole: (role: UserRole) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  adminLogout: () => void;
}

interface AuthFormState {
  phoneNumber: string;
  registrationPassword: string;
  otpCode: string;
  otpVerified: boolean;
  setPhoneNumber: (phone: string) => void;
  setRegistrationPassword: (password: string) => void;
  setOtpCode: (code: string) => void;
  setOtpVerified: (verified: boolean) => void;
}

interface PinState {
  pendingPinAction: ((pin?: string) => void | Promise<void>) | null;
  setPendingPinAction: (action: ((pin?: string) => void | Promise<void>) | null) => void;
  clearPendingPinAction: () => void;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifs: Notification[] | ((prev: Notification[]) => Notification[])) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
}

interface ThemeState {
  isDarkMode: boolean;
  themeVariant: 'original' | 'white';
  toggleTheme: () => void;
  setThemeVariant: (variant: 'original' | 'white') => void;
}

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

interface CurrencyState {
  preferredCurrency: 'USD' | 'FC';
  setPreferredCurrency: (currency: 'USD' | 'FC') => void;
}

interface VersionState {
  lastSeenVersion: string | null;
  lastSeenDeployId: string | null;
  lastAuthenticatedPage: PageName | null;
  lastAuthenticatedPageParams: Record<string, string | number | boolean>;
  lastAuthenticatedAccountId: string | null;
  setLastSeenVersion: (version: string) => void;
  setLastSeenDeployId: (deployId: string) => void;
}

export interface AppStore extends NavigationState, AuthState, AuthFormState, PinState, NotificationState, ThemeState, LanguageState, CurrencyState, VersionState {}

const nonRestorablePages = new Set<PageName>([
  'welcome', 'auth-role', 'auth-phone', 'auth-otp', 'auth-profile', 'pin-setup', 'pin-verify',
  'admin-login', 'onboarding', 'forgot-password', 'reset-password', 'auth',
]);

const safeRouteParamKeys = new Set([
  'transactionId', 'productId', 'orderId', 'chatId', 'conversationId', 'barterId',
  'requestId', 'payRecipientId', 'reference', 'type',
]);

function safeRouteParams(params?: Record<string, any>): Record<string, string | number | boolean> {
  if (!params) return {};
  return Object.fromEntries(Object.entries(params).filter(([key, value]) => (
    safeRouteParamKeys.has(key) &&
    (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
    String(value).length <= 200
  ))) as Record<string, string | number | boolean>;
}

// Store version for migration
const STORE_VERSION = 8;
type PersistedAppState = Pick<
  AppStore,
  'isDarkMode' | 'themeVariant' | 'selectedRole' | 'language' | 'preferredCurrency' | 'lastSeenVersion' | 'lastSeenDeployId' |
  'lastAuthenticatedPage' | 'lastAuthenticatedPageParams' | 'lastAuthenticatedAccountId'
> & {
  user: (Pick<User, 'id' | 'name' | 'pseudo' | 'phone'> & Pick<User, 'biometricEnabled' | 'pinSet'>) | null;
  admin: Pick<AdminUser, 'id' | 'username' | 'name' | 'role'> | null;
};

export const useAppStore = create<AppStore>()(
  persist<AppStore, [], [], PersistedAppState>(
    (set, get) => ({
      currentPage: 'welcome',
      pageParams: {},
      navigationStack: [],
      lastAuthenticatedPage: null,
      lastAuthenticatedPageParams: {},
      lastAuthenticatedAccountId: null,

      navigateTo: (page, params) => {
        const { currentPage, pageParams, navigationStack, user, admin } = get();
        const activeAccountId = admin?.id || user?.id || null;
        const shouldRestore = !!activeAccountId && !nonRestorablePages.has(page) && page !== 'admin-login';
        if (currentPage !== page) {
          set({
            navigationStack: [
              ...navigationStack,
              { page: currentPage, params: pageParams },
            ],
          });
        }
        set({
          currentPage: page,
          pageParams: params ?? {},
          ...(shouldRestore ? {
            lastAuthenticatedPage: page,
            lastAuthenticatedPageParams: safeRouteParams(params),
            lastAuthenticatedAccountId: activeAccountId,
          } : {}),
        });
      },

      goBack: () => get().goBackTo(),

      goBackTo: (fallbackPage) => {
        const { navigationStack, user, admin } = get();
        const previous = navigationStack[navigationStack.length - 1];
        const target = previous && !nonRestorablePages.has(previous.page)
          ? previous
          : fallbackPage
            ? { page: fallbackPage, params: {} }
            : null;

        if (!target) {
          set({ currentPage: 'welcome', pageParams: {} });
          return;
        }
        const activeAccountId = admin?.id || user?.id || null;
        const shouldRestore = !!activeAccountId && !nonRestorablePages.has(target.page) && target.page !== 'admin-login';
        set({
          currentPage: target.page,
          pageParams: target.params ?? {},
          navigationStack: navigationStack.slice(0, -1),
          ...(shouldRestore ? {
            lastAuthenticatedPage: target.page,
            lastAuthenticatedPageParams: safeRouteParams(target.params),
            lastAuthenticatedAccountId: activeAccountId,
          } : {}),
        });
      },

      user: null,
      admin: null,
      selectedRole: 'client',
      token: null,
      preferredCurrency: 'USD' as const,

      setUser: (user) => {
        const state = get();
        const accountChanged = state.user?.id !== user?.id;
        if (user && state.admin) {
          // The client and admin sessions use separate cookies. A role switch
          // must close the previous credential as well as replace UI state.
          void fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        }
        set({
          user,
          ...(user ? { admin: null } : {}),
          ...(user ? { phoneNumber: '', registrationPassword: '', otpCode: '', otpVerified: false } : {}),
          ...(accountChanged ? {
            notifications: [],
            unreadCount: 0,
            pendingPinAction: null,
            navigationStack: [],
            lastAuthenticatedPage: null,
            lastAuthenticatedPageParams: {},
            lastAuthenticatedAccountId: null,
          } : {}),
        });
      },
      setAdmin: (admin) => {
        const current = get();
        if (!admin) {
          return set({
            admin: null,
            phoneNumber: '',
            registrationPassword: '',
            otpCode: '',
            otpVerified: false,
            ...(current.admin ? {
              notifications: [], unreadCount: 0, navigationStack: [],
              lastAuthenticatedPage: null, lastAuthenticatedPageParams: {}, lastAuthenticatedAccountId: null,
            } : {}),
          });
        }
        const { token: _token, ...safeAdmin } = admin;
        const accountChanged = current.admin?.id !== admin.id;
        if (current.user) {
          void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        }
        set({
          admin: safeAdmin,
          user: null,
          phoneNumber: '',
          registrationPassword: '',
          otpCode: '',
          otpVerified: false,
          ...(accountChanged || current.user ? {
            notifications: [],
            unreadCount: 0,
            pendingPinAction: null,
            navigationStack: [],
            lastAuthenticatedPage: null,
            lastAuthenticatedPageParams: {},
            lastAuthenticatedAccountId: null,
          } : {}),
        });
      },
      setSelectedRole: (role) => set({ selectedRole: role }),
      setToken: () => set({ token: null }),
      setPreferredCurrency: (currency) => set({ preferredCurrency: currency }),

      logout: () => {
        if (typeof document !== 'undefined') {
          void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
          void fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
          document.cookie = 'trait_token=; Path=/; Max-Age=0; SameSite=Lax';
        }
        set({
          user: null,
          admin: null,
          selectedRole: 'client',
          token: null,
          currentPage: 'welcome',
          pageParams: {},
          navigationStack: [],
          pendingPinAction: null,
          notifications: [],
          unreadCount: 0,
          phoneNumber: '',
          registrationPassword: '',
          otpCode: '',
          otpVerified: false,
          lastAuthenticatedPage: null,
          lastAuthenticatedPageParams: {},
          lastAuthenticatedAccountId: null,
        });
      },

      adminLogout: () => {
        if (typeof document !== 'undefined') {
          void fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
          void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
          document.cookie = 'trait_admin_token=; Path=/; Max-Age=0; SameSite=Lax';
        }
        set({
          admin: null,
          user: null,
          token: null,
          phoneNumber: '',
          registrationPassword: '',
          otpCode: '',
          otpVerified: false,
          currentPage: 'admin-login',
          pageParams: {},
          navigationStack: [],
          pendingPinAction: null,
          notifications: [],
          unreadCount: 0,
          lastAuthenticatedPage: null,
          lastAuthenticatedPageParams: {},
          lastAuthenticatedAccountId: null,
        });
      },

      phoneNumber: '',
      registrationPassword: '',
      otpCode: '',
      otpVerified: false,

      setPhoneNumber: (phone) => set({ phoneNumber: phone }),
      setRegistrationPassword: (password) => set({ registrationPassword: password }),
      setOtpCode: (code) => set({ otpCode: code }),
      setOtpVerified: (verified) => set({ otpVerified: verified }),

      pendingPinAction: null,
      setPendingPinAction: (action) => set({ pendingPinAction: action }),
      clearPendingPinAction: () => set({ pendingPinAction: null }),

      notifications: [],
      unreadCount: 0,

      setNotifications: (notifs) =>
        set((state) => {
          const next = typeof notifs === 'function' ? notifs(state.notifications) : notifs;
          return {
            notifications: next,
            unreadCount: next.filter((n) => !n.read).length,
          };
        }),

      markAsRead: (id) => {
        const { notifications } = get();
        const updated = notifications.map((n) =>
          n.id === id ? { ...n, read: true as const } : n,
        );
        set({
          notifications: updated,
          unreadCount: updated.filter((n) => !n.read).length,
        });
      },

      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

      isDarkMode: false,
      themeVariant: 'original',
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode, themeVariant: 'original' })),
      setThemeVariant: (themeVariant) => set((state) => ({
        themeVariant,
        ...(themeVariant === 'white' ? { isDarkMode: false } : {}),
      })),

      language: 'fr' as Language,
      setLanguage: (lang) => set({ language: lang }),

      lastSeenVersion: null,
      lastSeenDeployId: null,
      setLastSeenVersion: (version) => set({ lastSeenVersion: version }),
      setLastSeenDeployId: (deployId) => set({ lastSeenDeployId: deployId }),
    }),
    {
      name: 'trait-app-storage',
      version: STORE_VERSION,
      migrate: (persistedState: any, version: number) => {
        // Migration from v1 (old store with PIN in user object) to v2
        let state = { ...persistedState };

        // Session credentials are held in HttpOnly cookies, never in browser storage.
        state.token = null;
        if (state.admin) {
          const { token: _adminToken, ...safeAdmin } = state.admin;
          state.admin = safeAdmin;
        }

        if (version < 2) {
          // Strip PIN from persisted user data
          if (state.user && state.user.pin) {
            const { pin, ...cleanUser } = state.user;
            state.user = cleanUser;
          }
          state.lastSeenVersion = null;
          state.lastSeenDeployId = null;
        }

        if (version < 4) state.themeVariant = state.themeVariant ?? 'original';

        if (version < 5) {
          // Local storage is only a lock-screen hint, never the account source
          // of truth. Remove balances, permissions and profile/KYC details.
          if (state.user) {
            const { id, name, pseudo, phone, biometricEnabled, pinSet } = state.user;
            state.user = { id, name, pseudo, phone, biometricEnabled, pinSet };
          }
          if (state.admin) {
            const { id, username, name, role } = state.admin;
            state.admin = { id, username, name, role };
          }
          if (state.user && state.admin) {
            state.user = null;
            state.admin = null;
            state.notifications = [];
            state.unreadCount = 0;
          }
        }

        if (version < 6) {
          state.lastAuthenticatedPage = null;
          state.lastAuthenticatedPageParams = {};
          state.lastAuthenticatedAccountId = null;
        }

        if (version < 7) {
          // Routes removed from the application must never leave persisted users
          // on a page that no longer has a screen implementation.
          if (state.currentPage === 'ussd') {
            state.currentPage = 'home';
            state.pageParams = {};
          }
          if (state.lastAuthenticatedPage === 'ussd') {
            state.lastAuthenticatedPage = 'home';
            state.lastAuthenticatedPageParams = {};
          }
          if (Array.isArray(state.navigationStack)) {
            state.navigationStack = state.navigationStack.filter((entry: any) => entry?.page !== 'ussd');
          }
        }

        if (version < 8 && state.user) {
          state.user.unlockMethod = state.user.biometricEnabled ? 'biometric' : state.user.pinSet ? 'pin' : 'none';
        }

        return state as PersistedAppState;
      },
      partialize: (state) => ({
        // Keep only enough information to identify the locked session. The
        // server profile must be fetched before any private workspace is shown.
        user: state.user ? {
          id: state.user.id,
          name: state.user.name,
          pseudo: state.user.pseudo,
          phone: state.user.phone,
          biometricEnabled: state.user.biometricEnabled,
          unlockMethod: state.user.unlockMethod,
          pinSet: state.user.pinSet,
        } : null,
        admin: state.admin ? {
          id: state.admin.id,
          username: state.admin.username,
          name: state.admin.name,
          role: state.admin.role,
        } : null,
        isDarkMode: state.isDarkMode,
        themeVariant: state.themeVariant,
        selectedRole: state.selectedRole,
        language: state.language,
        preferredCurrency: state.preferredCurrency,
        lastSeenVersion: state.lastSeenVersion,
        lastSeenDeployId: state.lastSeenDeployId,
        lastAuthenticatedPage: state.lastAuthenticatedPage,
        lastAuthenticatedPageParams: safeRouteParams(state.lastAuthenticatedPageParams),
        lastAuthenticatedAccountId: state.lastAuthenticatedAccountId,
      }),
    },
  ),
);
