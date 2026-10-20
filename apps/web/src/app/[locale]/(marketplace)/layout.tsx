import React from 'react';
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
  return (
    <div className="flex flex-col min-h-screen relative bg-background overflow-x-hidden w-full max-w-full">
      {/* Web Navbar: Desktop only */}
      <div className="hidden md:block">
        <Navbar locale={locale} />
      </div>

      {/* Native App Header: Mobile only */}
      <NativeHeader locale={locale} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        {children}
      </div>

      {/* Native App Bottom Navigation: Mobile only */}
      <NativeBottomNav locale={locale} />

      {/* Web Footer: Desktop only */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
