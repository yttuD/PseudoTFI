'use client';

import { usePathname } from 'next/navigation';
import { FloatingDock } from '@/components/ui/floating-dock';

export function QuickActionsDock({ items, mobileAriaLabel }: {
  items: { title: string; icon: React.ReactNode; href: string }[];
  mobileAriaLabel: string;
}) {
  const pathname = usePathname();
  if (/\/mis-unidades\/(nueva|[^/]+\/editar)(?:\/|$)/.test(pathname)) return null;
  return <div className="hidden md:flex justify-end mt-8"><FloatingDock items={items} mobileAriaLabel={mobileAriaLabel} /></div>;
}
