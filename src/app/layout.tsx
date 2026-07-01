import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080c14',
};

export const metadata: Metadata = {
  title: 'Recipe De-Bloater — Clean Recipes Instantly',
  description:
    'Paste any recipe blog URL or YouTube cooking video and get a clean, structured recipe in seconds. No ads, no life stories, just the recipe. Free forever.',
  keywords: 'recipe extractor, recipe cleaner, remove ads from recipes, YouTube recipe, cooking, clean recipe',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DeBloater',
  },
  openGraph: {
    title: 'Recipe De-Bloater — Clean Recipes Instantly',
    description: 'Paste any recipe URL or YouTube link. Get a clean recipe in seconds.',
    type: 'website',
    siteName: 'Recipe De-Bloater',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recipe De-Bloater',
    description: 'Clean recipes from any URL or YouTube video. No ads, no fluff.',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* PWA - iOS splash / standalone */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />

        {/* MS Tiles (Windows Phone) */}
        <meta name="msapplication-TileColor" content="#080c14" />
        <meta name="msapplication-TileImage" content="/icon-144.png" />
      </head>
      <body>
        <div className="mesh-bg" aria-hidden="true" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
