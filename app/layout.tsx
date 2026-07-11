import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Workout Tracker',
  description: 'Track your workouts, routines, and progress',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Workout Tracker',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-180.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Workout Tracker" />
        <meta name="theme-color" content="#0d1420" />
      </head>
      <body className="bg-gray-900 text-white">
        <div className="max-w-md mx-auto min-h-screen relative bg-gray-900">
          {/* Main content with padding for bottom nav */}
          <div className="pb-24">
            {children}
          </div>

          {/* Bottom navigation */}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
