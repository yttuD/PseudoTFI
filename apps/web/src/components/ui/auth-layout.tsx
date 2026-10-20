"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  locale?: string;
  trustBadgeText?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  className,
  locale = "es",
  trustBadgeText,
}) => {
  const tAuth = useTranslations("Auth");
  const displayBadge = trustBadgeText || tAuth("trustBadge");

  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-background relative overflow-hidden",
        className
      )}
    >
      {/* Background ambient light halos */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="relative z-10 flex flex-col items-center mb-8">
        <Link href={`/${locale}`} className="flex items-center gap-2 mb-3 min-h-[44px] min-w-[44px]">
          <Image
            src="/brand/rendo-logo-horizontal-light.svg"
            alt="Rendo"
            width={140}
            height={46}
            priority
            className="h-10 w-auto dark:hidden"
          />
          <Image
            src="/brand/rendo-logo-horizontal-dark.svg"
            alt="Rendo"
            width={140}
            height={46}
            priority
            className="h-10 w-auto hidden dark:block"
          />
        </Link>

        {title && (
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center tracking-tight">
            {title}
          </h1>
        )}

        {subtitle && (
          <p className="text-sm text-muted-foreground text-center mt-1.5 max-w-sm">
            {subtitle}
          </p>
        )}
      </div>

      {/* Main Form Content */}
      <div className="relative z-10 w-full max-w-md">{children}</div>

      {/* Trust pill */}
      <div className="relative z-10 flex items-center gap-2 mt-8 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-secondary" />
        <span>{displayBadge}</span>
      </div>
    </div>
  );
};

export default AuthLayout;
