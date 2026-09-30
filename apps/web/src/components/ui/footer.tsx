"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className }) => {
  const currentLocale = useLocale();
  const tFooter = useTranslations("Footer");
  const isClosedBeta = process.env.NEXT_PUBLIC_RENDO_BETA_MODE === 'true';
  const router = useRouter();
  const pathname = usePathname();

  const changeLocale = (newLocale: string) => {
    const segments = pathname.split("/");
    if (segments[1] === "es" || segments[1] === "en" || segments[1] === "pt") {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    router.push(segments.join("/") || `/${newLocale}`);
  };

  return (
    <footer
      className={cn(
        "w-full border-t border-border/80 bg-surface/70 backdrop-blur-lg mt-auto text-foreground",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <Link href={`/${currentLocale}`} className="flex items-center gap-2 min-h-[44px] min-w-[44px]">
              <div className="h-9 w-9 rounded-xl bg-transparent flex items-center justify-center shrink-0">
                <Image
                  src="/brand/rendo-mark-light.svg"
                  alt="Rendo"
                  width={36}
                  height={36}
                  className="h-8 w-auto dark:hidden object-contain"
                />
                <Image
                  src="/brand/rendo-mark-dark.svg"
                  alt="Rendo"
                  width={36}
                  height={36}
                  className="h-8 w-auto hidden dark:block object-contain"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground font-mono">Rendo</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {tFooter("description")}
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              {tFooter("marketplaceTitle")}
            </h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <Link href={`/${currentLocale}/unidades`} className="hover:text-primary transition-colors min-h-[44px] flex items-center">
                  {tFooter("exploreUnits")}
                </Link>
              </li>
              <li>
                <Link href={`/${currentLocale}/unidades?categoria=departamento`} className="hover:text-primary transition-colors min-h-[44px] flex items-center">
                  {tFooter("departments")}
                </Link>
              </li>
              <li>
                <Link href={`/${currentLocale}/unidades?categoria=casa`} className="hover:text-primary transition-colors min-h-[44px] flex items-center">
                  {tFooter("housesCabins")}
                </Link>
              </li>
              <li>
                <Link href={`/${currentLocale}/unidades?categoria=comercial`} className="hover:text-primary transition-colors min-h-[44px] flex items-center">
                  {tFooter("commercial")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              {tFooter("forManagersTitle")}
            </h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <Link href={`/${currentLocale}/auth/registro?portal=gestor`} className="hover:text-primary transition-colors min-h-[44px] flex items-center">
                  {tFooter("publishInventory")}
                </Link>
              </li>
              <li>
                <Link href={`/${currentLocale}/auth/login?next=/${currentLocale}/dashboard`} className="hover:text-primary transition-colors min-h-[44px] flex items-center">
                  {tFooter("managementTerminal")}
                </Link>
              </li>
              {!isClosedBeta && <li>
                <Link href={`/${currentLocale}/auth/registro?intent=gestor`} className="hover:text-primary transition-colors min-h-[44px] flex items-center">
                  {tFooter("quotaPlans")}
                </Link>
              </li>}
            </ul>
          </div>

          {/* Locale Selector & Legal */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">
              {tFooter("languageTitle")}
            </h4>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <select
                value={currentLocale}
                onChange={(e) => changeLocale(e.target.value)}
                className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary min-h-[44px]"
                aria-label={tFooter("selectLanguageAria")}
              >
                <option value="es">Español (Argentina)</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isClosedBeta ? tFooter("betaCurrencyNote") : tFooter("currencyNote")}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <p>&copy; {new Date().getFullYear()} Rendo. {tFooter("allRightsReserved")}</p>
          <div className="flex gap-6">
            <Link href={`/${currentLocale}/terminos`} className="hover:text-foreground transition-colors cursor-pointer min-h-[44px] flex items-center">
              {tFooter("terms")}
            </Link>
            <Link href={`/${currentLocale}/privacidad`} className="hover:text-foreground transition-colors cursor-pointer min-h-[44px] flex items-center">
              {tFooter("privacy")}
            </Link>
            <span className="text-muted-foreground/70 flex items-center">{tFooter("location")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
