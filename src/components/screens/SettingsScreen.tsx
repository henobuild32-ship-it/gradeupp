'use client';

import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Shield,
  Moon,
  Globe,
  Download,
  Info,
  LogOut,
  ChevronRight,
  Bell,
  Lock,
  LayoutDashboard,
  GraduationCap,
  BadgeCheck,
  Check,
  Smartphone,
  Apple,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTranslation, languageNames, languages, type Language } from '@/lib/i18n';
import { useState } from 'react';
import { usePushSubscription } from '@/hooks/usePushSubscription';

function LanguageModal({ onClose }: { onClose: () => void }) {
  const { language, setLanguage } = useTranslation();
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50 }}
        className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground">{t('settings.language')}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang);
                onClose();
                toast.success(t('common.success'));
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all cursor-pointer ${
                language === lang
                  ? 'bg-[#0D5C63] text-white shadow-md'
                  : 'bg-muted/50 hover:bg-muted text-foreground'
              }`}
            >
              <span className="text-lg font-medium">{languageNames[lang]}</span>
              {language === lang && <Check className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AndroidGuideModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14888F] to-[#083A3E] flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{t('install.android_title')}</h3>
            <p className="text-xs text-muted-foreground">{t('install.android_subtitle')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          {[
            { step: '1', title: t('install.step1_android'), desc: t('install.step1_android_desc') },
            { step: '2', title: t('install.step2_android'), desc: t('install.step2_android_desc') },
            { step: '3', title: t('install.step3_android'), desc: t('install.step3_android_desc') },
            { step: '4', title: t('install.step4_android'), desc: t('install.step4_android_desc') },
          ].map((item) => (
            <div key={item.step} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-blue-700">{item.step}</span>
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={onClose}
          className="w-full h-11 bg-[#0D5C63] hover:bg-[#083A3E] text-white font-semibold rounded-xl cursor-pointer"
        >
          {t('install.understood')}
        </Button>
      </motion.div>
    </motion.div>
  );
}

function IOSGuideModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14888F] to-[#083A3E] flex items-center justify-center">
            <Apple className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{t('install.ios_title')}</h3>
            <p className="text-xs text-muted-foreground">{t('install.ios_subtitle')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          {[
            { step: '1', title: t('install.step1_ios'), desc: t('install.step1_ios_desc') },
            { step: '2', title: t('install.step2_ios'), desc: t('install.step2_ios_desc') },
            { step: '3', title: t('install.step3_ios'), desc: t('install.step3_ios_desc') },
            { step: '4', title: t('install.step4_ios'), desc: t('install.step4_ios_desc') },
          ].map((item) => (
            <div key={item.step} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-blue-700">{item.step}</span>
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={onClose}
          className="w-full h-11 bg-[#0D5C63] hover:bg-[#083A3E] text-white font-semibold rounded-xl cursor-pointer"
        >
          {t('install.understood')}
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default function SettingsScreen() {
  const { goBack, user, logout, navigateTo, isDarkMode, toggleTheme } =
    useAppStore();
  const { canInstall, isIOS, isInstalled, isStandalone, installApp } = usePWAInstall();
  const { isSubscribed, permission, subscribe } = usePushSubscription();
  const { t, language, setLanguage } = useTranslation();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const isAgent = user?.role === 'agent';

  const handleLogout = () => {
    logout();
    toast.success(t('settings.logout_success'));
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    setInstalling(true);
    const success = await installApp();
    setInstalling(false);
    if (success) {
      toast.success(t('welcome.install_success'));
    } else {
      setShowAndroidGuide(true);
    }
  };

  const handlePushPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Les notifications ne sont pas prises en charge sur cet appareil.');
      return;
    }

    setPushLoading(true);
    try {
      const success = await subscribe();
      if (success) {
        toast.success('Notifications activées. Vous recevrez désormais les mises à jour et alertes importantes.');
      } else if (permission === 'denied') {
        toast.error('Les notifications sont bloquées dans votre navigateur. Vous pouvez les réactiver dans les paramètres du site.');
      } else {
        toast.info('Autorisation demandée. Confirmez la notification dans la fenêtre du navigateur.');
      }
    } finally {
      setPushLoading(false);
    }
  };

  const checkForUpdates = async () => {
    setUpdateLoading(true);
    try {
      const res = await fetch('/api/app/version?currentVersion=2.0.0');
      if (res.ok) {
        const data = await res.json();
        if (data.hasUpdate) {
          toast.success(t('settings.update_available').replace('{version}', data.latestVersion));
          try {
            const { AppUpdate } = await import('@/plugins/app-update');
            await AppUpdate.downloadAndInstall({ url: data.downloadUrl || '/downloads/trait.apk' });
          } catch {
            const downloadUrl = data.downloadUrl || '/downloads/trait.apk';
            window.open(downloadUrl.startsWith('http') ? downloadUrl : window.location.origin + downloadUrl, '_blank');
          }
        } else {
          toast.success(t('settings.up_to_date'));
        }
      } else {
        toast.error(t('settings.update_error'));
      }
    } catch {
      toast.error(t('settings.connection_error'));
    } finally {
      setUpdateLoading(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.pseudo?.[0].toUpperCase() || '?';

  const settingsItems = [
    {
      section: t('settings.security'),
      items: [
        {
          icon: Lock,
          label: t('settings.change_pin'),
          value: null,
          action: () => navigateTo('change-pin'),
        },
        {
          icon: Shield,
          label: t('settings.enable_2fa'),
          value: user?.twoFactorEnabled ? 'active' : null,
          action: () => navigateTo('two-factor-setup'),
        },
      ],
    },
    {
      section: t('settings.application'),
      items: [
        {
          icon: Moon,
          label: t('settings.dark_mode'),
          value: 'darkMode',
          action: toggleTheme,
        },
        {
          icon: Globe,
          label: t('settings.language'),
          value: languageNames[language],
          action: () => setShowLanguageModal(true),
        },
        {
          icon: GraduationCap,
          label: t('settings.tutorial'),
          value: null,
          action: () => navigateTo('onboarding'),
        },
        {
          icon: Bell,
          label: isSubscribed ? 'Notifications activées' : 'Activer les notifications',
          value: pushLoading ? 'Demande...' : isSubscribed ? 'Activées' : permission === 'denied' ? 'Bloquées' : 'Désactivées',
          action: handlePushPermission,
          badge: !isSubscribed,
        },
        {
          icon: Download,
          label: t('settings.download'),
          value: (isInstalled || isStandalone) ? t('settings.installed') : 'PWA',
          action: handleInstall,
          badge: !(isInstalled || isStandalone),
        },
        {
          icon: Info,
          label: t('settings.about'),
          value: 'v2.0',
          action: () =>
            toast.info('TRAIT Version 2.0 — Paiement par scan, temps réel, hors ligne'),
        },
        {
          icon: RefreshCw,
          label: t('settings.check_updates'),
          value: updateLoading ? t('settings.updating') : null,
          action: checkForUpdates,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t('settings.title')}</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-5 pb-8">
        {/* Profile section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 ${
                  isAgent
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                    : 'bg-gradient-to-br from-blue-400 to-blue-600'
                }`}>
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg truncate">
                      {user?.name || user?.pseudo || t('common.user')}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {user?.phone || 'Non défini'}
                  </p>
                  {user?.pseudo && (
                    <p className="text-sm text-muted-foreground">
                      @{user.pseudo}
                    </p>
                  )}
                </div>
              </div>

              {/* Agent code display */}
              {isAgent && (user?.agentCode || user?.agentNumber) && (
                <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <BadgeCheck className="size-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-amber-700">Code Agent :</span>
                  <span className="text-sm font-bold font-mono text-amber-800 tracking-wider">
                    {(() => { const c = user?.agentCode || user?.agentNumber; return c ? (c.startsWith('AGT-') ? c : `AGT-${c}`) : ''; })()}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full text-[#0D5C63] border-blue-200 hover:bg-blue-50"
                  onClick={() => navigateTo('profile')}
                >
                  {t('settings.edit_profile')}
                  <ChevronRight className="size-4 ml-auto" />
                </Button>
                {isAgent && (
                  <Button
                    variant="outline"
                    className="w-full text-amber-700 border-amber-200 hover:bg-amber-50"
                    onClick={() => navigateTo('agent-dashboard')}
                  >
                    <LayoutDashboard className="size-4 mr-2" />
                    {t('settings.agent_dashboard')}
                    <ChevronRight className="size-4 ml-auto" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings sections */}
        {settingsItems.map((section, sIndex) => (
          <motion.div
            key={section.section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + sIndex * 0.1 }}
          >
            <Card>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {section.section}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {section.items.map((item, iIndex) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label}>
                      {iIndex > 0 && <Separator />}
                      <div
                        onClick={item.action}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action(); } }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left cursor-pointer disabled:opacity-50"
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          item.badge ? 'bg-blue-100' : 'bg-muted'
                        }`}>
                          <Icon className={`size-4 ${item.badge ? 'text-[#0D5C63]' : 'text-muted-foreground'}`} />
                        </div>
                        <span className="flex-1 text-sm">{item.label}</span>

                        {item.value === 'toggle' && (
                          <Switch
                            onCheckedChange={() => item.action()}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {item.value === 'darkMode' && (
                          <Switch
                            checked={isDarkMode}
                            onCheckedChange={() => item.action()}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {item.value &&
                          item.value !== 'toggle' &&
                          item.value !== 'darkMode' && (
                            <span className={`text-sm mr-1 ${
                              item.value === t('settings.installed') ? 'text-[#0D5C63] font-semibold' : 'text-muted-foreground'
                            }`}>
                              {item.value}
                            </span>
                          )}
                        {item.value !== 'toggle' && item.value !== 'darkMode' && (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* Install App Card */}
        {!(isInstalled || isStandalone) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-background overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D5C63] flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">{t('settings.download')}</h3>
                    <p className="text-xs text-muted-foreground">{t('settings.download_desc')}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={handleInstall}
                      disabled={installing}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#0D5C63] text-white rounded-xl py-2.5 px-3 hover:bg-[#083A3E] active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:opacity-50"
                    >
                      {installing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                      <span className="text-xs font-semibold">
                        {installing ? t('welcome.installing') : 'PWA Android'}
                      </span>
                    </button>
                    <button
                      onClick={() => setShowIOSGuide(true)}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-2.5 px-3 hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                    >
                      <Apple className="w-4 h-4" />
                      <span className="text-xs font-semibold">iOS</span>
                    </button>
                  </div>
                  <a
                    href="/downloads/trait.apk"
                    download="TRAIT-v2.0.0.apk"
                    className="flex items-center justify-center gap-2 text-xs text-[#0D5C63] hover:text-[#0a4a50] font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger l'APK directement
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Danger zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-red-200">
            <CardContent className="p-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                {t('settings.logout')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Version */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground"
        >
          {t('settings.version')}
        </motion.p>
      </div>

      {/* Android Installation Guide Modal */}
      {showAndroidGuide && <AndroidGuideModal onClose={() => setShowAndroidGuide(false)} />}

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && <IOSGuideModal onClose={() => setShowIOSGuide(false)} />}

      {/* Language Selector Modal */}
      {showLanguageModal && <LanguageModal onClose={() => setShowLanguageModal(false)} />}
    </div>
  );
}
