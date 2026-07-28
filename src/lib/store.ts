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
  | 'ussd'
  | 'marketplace'
  | 'marketplace-detail'
  | 'barter'
  | 'barter-detail'
  | 'barter-create'
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
  | 'international-transfer'
  | 'agent-register'
  | 'agent-pending'
  | 'support'
  | 'kyc-verification'
  | 'card-request'
  | 'card-payment'
  | 'card'
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
  | 'reset-password';

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
  twoFactorEnabled?: boolean;
  referralCode?: string | null;
  createdAt?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: string;
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
  pendingPinAction: (() => void) | null;
  setPendingPinAction: (action: (() => void) | null) => void;
  clearPendingPinAction: () => void;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifs: Notification[]) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
}

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

interface VersionState {
  lastSeenVersion: string | null;
  setLastSeenVersion: (version: string) => void;
}

export interface AppStore extends NavigationState, AuthState, AuthFormState, PinState, NotificationState, ThemeState, LanguageState, VersionState {}

// Store version for migration
const STORE_VERSION = 2;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentPage: 'welcome',
      pageParams: {},
      navigationStack: [],

      navigateTo: (page, params) => {
        const { currentPage, pageParams, navigationStack } = get();
        if (currentPage !== page) {
          set({
            navigationStack: [
              ...navigationStack,
              { page: currentPage, params: pageParams },
            ],
          });
        }
        set({ currentPage: page, pageParams: params ?? {} });
      },

      goBack: () => {
        const { navigationStack } = get();
        if (navigationStack.length === 0) {
          set({ currentPage: 'welcome', pageParams: {} });
          return;
        }
        const previous = navigationStack[navigationStack.length - 1];
        set({
          currentPage: previous.page,
          pageParams: previous.params ?? {},
          navigationStack: navigationStack.slice(0, -1),
        });
      },

      user: null,
      admin: null,
      selectedRole: 'client',
      token: null,

      setUser: (user) => set({ user }),
      setAdmin: (admin) => set({ admin }),
      setSelectedRole: (role) => set({ selectedRole: role }),
      setToken: (token) => set({ token }),

      logout: () =>
        set({
          user: null,
          selectedRole: 'client',
          token: null,
          currentPage: 'welcome',
          pageParams: {},
          navigationStack: [],
          pendingPinAction: null,
        }),

      adminLogout: () =>
        set({
          admin: null,
          currentPage: 'admin-login',
          pageParams: {},
          navigationStack: [],
        }),

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
        set({
          notifications: notifs,
          unreadCount: notifs.filter((n) => !n.read).length,
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
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      language: 'fr' as Language,
      setLanguage: (lang) => set({ language: lang }),

      lastSeenVersion: null,
      setLastSeenVersion: (version) => set({ lastSeenVersion: version }),
    }),
    {
      name: 'trait-app-storage',
      version: STORE_VERSION,
      migrate: (persistedState: any, version: number) => {
        // Migration from v1 (old store with PIN in user object) to v2
        let state = { ...persistedState };

        if (version < 2) {
          // Strip PIN from persisted user data
          if (state.user && state.user.pin) {
            const { pin, ...cleanUser } = state.user;
            state.user = cleanUser;
          }
          state.lastSeenVersion = null;
        }

        return state as AppStore;
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isDarkMode: state.isDarkMode,
        selectedRole: state.selectedRole,
        language: state.language,
        lastSeenVersion: state.lastSeenVersion,
      }),
    },
  ),
);
