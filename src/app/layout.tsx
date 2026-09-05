import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { I18nProviderWrapper } from "@/components/providers/I18nProviderWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRAIT v2.0 - Transfert, Paiement QR, Marketplace & Troc",
  description: "Plateforme numérique innovante combinant transfert d'argent, paiement par QR, troc digital et marketplace. Version 2.0 — Accessible avec ou sans internet via USSD.",
  keywords: ["Trait", "transfert", "argent", "troc", "marketplace", "USSD", "fintech", "mobile money", "RDC", "Congo", "QR payment"],
  authors: [{ name: "Trait Team" }],
  icons: {
    icon: [
      { url: "/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png?v=2",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TRAIT v2.0",
  },
  openGraph: {
    title: "TRAIT v2.0 - Transfert, Paiement QR, Marketplace & Troc",
    description: "Plateforme numérique innovante combinant transfert d'argent, paiement par QR, troc digital et marketplace. Version 2.0.",
    type: "website",
    images: ["/icon-512.png?v=2"],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0D5C63",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TRAIT" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
        <link rel="apple-touch-startup-image" href="/icon-512.png?v=2" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <ThemeProvider>
          <I18nProviderWrapper>
            {children}
          </I18nProviderWrapper>
        </ThemeProvider>
        <Toaster position="top-center" richColors closeButton />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', async function() {
                  try {
                    const reg = await navigator.serviceWorker.register('/sw.js?v=' + Date.now());
                    console.log('SW registered:', reg.scope);

                    // Check for update on every page load
                    reg.update();

                    // Listen for new SW installing
                    reg.addEventListener('updatefound', () => {
                      const newSW = reg.installing;
                      if (!newSW) return;
                      newSW.addEventListener('statechange', () => {
                        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                          // Force activate new SW immediately
                          newSW.postMessage({ type: 'SKIP_WAITING' });
                          // Clear all caches
                          if ('caches' in window) {
                            caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
                          }
                          // Hard reload
                          window.location.href = window.location.pathname + '?v=' + Date.now();
                        }
                      });
                    });

                    // Check if SW changed (deploy detection)
                    let lastSWHash = '';
                    setInterval(async () => {
                      try {
                        const r = await navigator.serviceWorker.getRegistration();
                        if (r?.active) {
                          const resp = await fetch('/api/app/version?t=' + Date.now(), { cache: 'no-store' });
                          const data = await resp.json();
                          const currentDeploy = localStorage.getItem('trait_deploy_id') || '';
                          if (data.deployId && data.deployId !== currentDeploy) {
                            localStorage.setItem('trait_deploy_id', data.deployId);
                            // Clear caches and reload
                            if ('caches' in window) {
                              await Promise.all((await caches.keys()).map(k => caches.delete(k)));
                            }
                            r.active.postMessage({ type: 'SKIP_WAITING' });
                            window.location.href = window.location.pathname + '?v=' + Date.now();
                          }
                        }
                      } catch(e) {}
                    }, 10000);

                    // Auto-sync pending transactions every 30s
                    setInterval(() => {
                      if (navigator.onLine && reg.active) {
                        reg.active.postMessage({ type: 'SYNC_NOW' });
                      }
                    }, 30000);

                    window.addEventListener('online', () => {
                      if (reg.active) reg.active.postMessage({ type: 'SYNC_NOW' });
                    });
                  } catch(e) { console.warn('SW registration failed:', e); }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
