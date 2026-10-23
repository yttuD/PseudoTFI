import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/marketplace/Navbar';
import { NativeHeader } from '@/components/marketplace/NativeHeader';
import { NativeBottomNav } from '@/components/marketplace/NativeBottomNav';
import { Footer } from '@/components/ui/footer';

export default async function MarketplaceLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const tNav = await getTranslations('Nav');
  return (
    <div className="flex flex-col min-h-screen relative bg-background overflow-x-hidden w-full max-w-full">
      <a href="#main-content"
        className="sr-only focus:not-sr-only fixed left-3 top-3 z-[200] rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md focus-visible:ring-2 focus-visible:ring-ring">
        {tNav('skipToContent')}
      </a>

      {/* Web Navbar: Desktop only */}
      <div className="hidden md:block">
        <Navbar locale={locale} />
      </div>

      {/* Native App Header: Mobile only */}
      <NativeHeader locale={locale} />

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col pb-20 md:pb-0 focus:outline-none">
        {children}
      </main>

      {/* Native App Bottom Navigation: Mobile only */}
      <NativeBottomNav locale={locale} />

      {/* Web Footer: Desktop only */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
