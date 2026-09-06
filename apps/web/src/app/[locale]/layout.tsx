import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope'
});

export const metadata: Metadata = {
  title: { default: 'RENDA', template: '%s | RENDA' },
  description: 'Encontrá tu alquiler ideal en Goya, Corrientes.',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'RENDA',
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
    <html lang={locale}>
      <body className={`${inter.variable} ${manrope.variable} font-sans antialiased min-h-screen bg-muted/40`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
