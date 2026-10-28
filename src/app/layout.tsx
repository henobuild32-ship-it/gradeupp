import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { I18nProviderWrapper } from "@/components/providers/I18nProviderWrapper";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://trait-rho.vercel.app"),
  title: "Trait Fintech — Transferts, portefeuille et paiements Trait",
  description: "Trait Fintech : transferts de portefeuille à portefeuille, paiements QR, marketplace et services numériques en USD et CDF.",
  keywords: ["Trait Fintech", "transfert", "portefeuille", "USD", "CDF", "troc", "marketplace", "QR payment"],
  authors: [{ name: "Trait Fintech" }],
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
    title: "Trait Fintech",
  },
  openGraph: {
    title: "Trait Fintech — Transferts et paiements",
    description: "Portefeuille, transferts Trait, paiements QR, marketplace et troc en USD et CDF.",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var saved = JSON.parse(localStorage.getItem('trait-app-storage') || 'null');
                  var state = saved && (saved.state || saved);
                  var root = document.documentElement;
                  var white = state && state.themeVariant === 'white';
                  var dark = !white && !!(state && state.isDarkMode);
                  root.classList.toggle('theme-white', !!white);
                  root.classList.toggle('dark', !!dark);
                  root.style.colorScheme = white ? 'light' : dark ? 'dark' : 'light';
                } catch (e) {}
              })();
            `,
          }}
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Trait Fintech" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
        <link rel="apple-touch-startup-image" href="/icon-512.png?v=2" />
      </head>
      <body
        className="antialiased bg-background text-foreground font-sans"
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
              (function () {
                if (!('serviceWorker' in navigator)) return;
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function (reg) {
                    function watch(sw) {
                      if (!sw) return;
                      sw.addEventListener('statechange', function () {
                        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                          try { sw.postMessage({ type: 'SW_UPDATE_AVAILABLE' }); } catch (e) {}
                        }
                      });
                    }
                    watch(reg.installing);
                    reg.addEventListener('updatefound', function () { watch(reg.installing); });
                  }).catch(function () {});
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
