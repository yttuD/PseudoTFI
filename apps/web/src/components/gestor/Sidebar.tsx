'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  FolderOpen, 
  FileText, 
  Users, 
  UserCheck, 
  BarChart2, 
  CreditCard, 
  Settings,
  Menu
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Sidebar({ locale, rol = 'gestor' }: { locale: string, rol?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname.includes(href);

  const navigation = [
    { name: 'Dashboard', href: `/${locale}/dashboard`, icon: LayoutDashboard },
    { name: 'Mis Unidades', href: `/${locale}/mis-unidades`, icon: Building2 },
    { name: 'Grupos', href: `/${locale}/grupos`, icon: FolderOpen },
    { name: 'Alquileres', href: `/${locale}/alquileres`, icon: FileText },
    { name: 'Inquilinos', href: `/${locale}/inquilinos`, icon: Users },
    { name: 'Delegados', href: `/${locale}/delegados`, icon: UserCheck, reqGestor: true },
    { name: 'Métricas', href: `/${locale}/metricas`, icon: BarChart2, reqGestor: false },
    { name: 'Facturación', href: `/${locale}/facturacion`, icon: CreditCard, reqGestor: true },
  ];

  const visibleNav = navigation.filter(n => !n.reqGestor || rol === 'gestor');

  const NavLinks = () => (
    <div className="flex flex-col gap-1 w-full p-4">
      {visibleNav.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive(item.href)
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
      
      <div className="my-4 h-px bg-border" />
      
      {rol === 'gestor' && (
        <Link
          href={`/${locale}/configuracion`}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            isActive(`/${locale}/configuracion`)
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          Configuración
        </Link>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-background w-full">
        <Image src="/brand/04_RENDA-horizontal-claro.svg" alt="RENDA" width={100} height={26} priority />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" />}>
            <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
             <div className="p-6 h-16 flex items-center border-b">
                <Image src="/brand/04_RENDA-horizontal-claro.svg" alt="RENDA" width={120} height={32} priority />
             </div>
             <NavLinks />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-background shrink-0">
        <div className="p-6 h-16 flex items-center">
          <Image src="/brand/04_RENDA-horizontal-claro.svg" alt="RENDA" width={120} height={32} priority />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
      </aside>
    </>
  );
}
