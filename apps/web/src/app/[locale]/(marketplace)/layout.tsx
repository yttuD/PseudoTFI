import { Navbar } from '@/components/marketplace/Navbar';

export default function MarketplaceLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar locale={locale} />
      {children}
    </div>
  );
}
