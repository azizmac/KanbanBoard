import type { Metadata, Viewport } from "next";
import { Geist_Mono, Onest } from "next/font/google";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Поток",
  description: "Канбан-доски, задачи и команда — в одном потоке. С интеграцией Telegram.",
  applicationName: "Поток",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Поток" },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Draw under the notch / home indicator so env(safe-area-inset-*) is non-zero
  // and the installed app goes edge-to-edge (no letterboxing on iPhone).
  viewportFit: "cover",
  // Tints the status bar (Android) and the window title bar (desktop PWA on
  // macOS/Windows). Match the app surface per colour-scheme instead of a flat
  // accent so it blends in both themes.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#161412" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${onest.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* Apply the saved theme before paint to avoid a light→dark flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}

const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('theme-pref')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;
