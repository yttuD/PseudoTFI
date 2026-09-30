import type { Metadata } from "next";
import localFont from 'next/font/local';
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import CapacitorProvider from '@/components/providers/CapacitorProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

const inter = localFont({
  src: '../../fonts/inter-latin.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = localFont({
  src: '../../fonts/jetbrains-mono-latin.woff2',
  weight: '100 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.WEB_PUBLIC_URL || 'http://localhost:3000'),
  title: { default: 'Rendo', template: '%s | Rendo' },
  description: 'Encontrá tu alquiler ideal en Goya, Corrientes.',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Rendo',
    description: 'Encontrá tu alquiler ideal en Goya, Corrientes.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'es_AR', type: 'website',
  },
  twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
};

export default async function RootLayout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  if (!routing.locales.includes(locale as "es" | "pt" | "en")) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen bg-muted/40 pt-safe pb-safe`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <CapacitorProvider>
              {children}
            </CapacitorProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
