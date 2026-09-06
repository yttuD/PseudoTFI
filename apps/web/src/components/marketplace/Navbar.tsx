import Link from 'next/link';
import Image from 'next/image';
import { buttonVariants } from '@/components/ui/button';

export function Navbar({ locale }: { locale: string }) {
  // const t = useTranslations('Marketplace');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <Image src="/brand/04_RENDA-horizontal-claro.svg" alt="RENDA" width={120} height={32} priority />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href={`/${locale}/auth/login`} className={buttonVariants({ variant: 'ghost' })}>
            Ingresar al Panel
          </Link>
        </nav>
      </div>
    </header>
  );
}
