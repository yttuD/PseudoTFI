"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { SearchWizard } from "@/components/marketplace/SearchWizard";
import { Skiper106Input } from "@/components/ui/skiper106";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Skiper19ScrollPath } from "@/components/ui/skiper19";
import { PixelImage } from "@/components/ui/pixel-image";
import { TestimonialSlider } from "@/components/ui/testimonial-slider";
import { AnimatedList } from "@/components/ui/animated-list";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { CityBackground } from "@/components/marketplace/CityBackground";
import {
  Search,
  Building2,
  DollarSign,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

export default function Home() {
  const tLanding = useTranslations("Landing");
  const locale = useLocale();
  const router = useRouter();
  const [quickQuery, setQuickQuery] = useState("");
  const isClosedBeta = process.env.NEXT_PUBLIC_RENDO_BETA_MODE === 'true';

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const isNative = document.cookie.includes("renda-native-mode=true");
      if (isNative) {
        const isGestor =
          document.cookie.includes("gestor") ||
          localStorage.getItem("user_role") === "gestor";
        if (isGestor) {
          router.replace(`/${locale}/dashboard`);
        } else {
          router.replace(`/${locale}/unidades`);
        }
      }
    }
  }, [locale, router]);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      router.push(`/${locale}/unidades?q=${encodeURIComponent(quickQuery.trim())}`);
    } else {
      router.push(`/${locale}/unidades`);
    }
  };

  const rotatingWords = tLanding.raw("heroRotatingWords") as string[];

  const socialEvents = [
    {
      title: tLanding("socialProof.item1Title"),
      location: tLanding("socialProof.item1Location"),
      time: tLanding("socialProof.item1Time"),
      type: tLanding("socialProof.item1Type"),
      color: "text-secondary",
    },
    {
      title: tLanding("socialProof.item2Title"),
      location: tLanding("socialProof.item2Location"),
      time: tLanding("socialProof.item2Time"),
      type: tLanding("socialProof.item2Type"),
      color: "text-primary",
    },
    {
      title: tLanding("socialProof.item3Title"),
      location: tLanding("socialProof.item3Location"),
      time: tLanding("socialProof.item3Time"),
      type: tLanding("socialProof.item3Type"),
      color: "text-amber-500",
    },
    {
      title: tLanding("socialProof.item4Title"),
      location: tLanding("socialProof.item4Location"),
      time: tLanding("socialProof.item4Time"),
      type: tLanding("socialProof.item4Type"),
      color: "text-secondary",
    },
  ];

  const testimonials = [
    {
      quote: tLanding("testimonials.item1Quote"),
      author: tLanding("testimonials.item1Author"),
      role: tLanding("testimonials.item1Role"),
      location: tLanding("testimonials.item1Location"),
    },
    {
      quote: tLanding("testimonials.item2Quote"),
      author: tLanding("testimonials.item2Author"),
      role: tLanding("testimonials.item2Role"),
      location: tLanding("testimonials.item2Location"),
    },
    {
      quote: tLanding("testimonials.item3Quote"),
      author: tLanding("testimonials.item3Author"),
      role: tLanding("testimonials.item3Role"),
      location: tLanding("testimonials.item3Location"),
    },
  ];

  const featuredUnits = [
    {
      title: tLanding("featuredUnits.unit1Title"),
      zone: tLanding("featuredUnits.unit1Zone"),
      price: tLanding("featuredUnits.unit1Price"),
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: tLanding("featuredUnits.unit2Title"),
      zone: tLanding("featuredUnits.unit2Zone"),
      price: tLanding("featuredUnits.unit2Price"),
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: tLanding("featuredUnits.unit3Title"),
      zone: tLanding("featuredUnits.unit3Zone"),
      price: tLanding("featuredUnits.unit3Price"),
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-background">
      {/* 1. HERO SECTION WITH PROCEDURAL ANIMATED CITY SKYLINE */}
      <section className="relative w-full min-h-[92vh] flex flex-col justify-center items-center pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Procedural Animated City Skyline & Stars Background */}
        <CityBackground />

        {/* Ambient Glows */}
        <div className="absolute top-10 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center space-y-8">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-azul-900/20 bg-azul-900/5 text-azul-900 dark:border-white/15 dark:bg-white/5 dark:text-crema/90 text-xs font-medium backdrop-blur-md shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-azul-800 dark:text-dorado-300 animate-pulse" />
            <span>{isClosedBeta ? tLanding("betaBadge") : tLanding("heroBadge")}</span>
          </div>

          {/* Dynamic Typographic H1 */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.15] max-w-4xl">
            <span className="text-azul-900 dark:text-crema">{tLanding("heroTitle")}</span> <br />
            <span className="text-azul-900 dark:text-dorado-500 font-extrabold">
              {isClosedBeta ? tLanding("betaHeroLine") : <TypingAnimation
                texts={rotatingWords}
                duration={120}
                pauseDuration={3000}
                cursorClassName="bg-azul-900 dark:bg-dorado-500"
              />}
            </span>
          </h1>

          <p className="text-base sm:text-xl text-azul-900/80 dark:text-crema/75 max-w-2xl font-normal leading-relaxed">
            {isClosedBeta ? tLanding("betaSubtitle") : tLanding("heroSubtitle")}
          </p>

          {/* Pre-Search Bar with Skiper106 Smooth Input */}
          <form
            onSubmit={handleQuickSearch}
            className="w-full max-w-xl flex flex-col sm:flex-row items-center gap-3 pt-2"
          >
            <div className="flex-1 w-full">
              <Skiper106Input
                icon={<Search className="h-4 w-4 text-azul-800 dark:text-dorado-300" />}
                placeholder={tLanding("quickSearchPlaceholder")}
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                containerClassName="bg-white/95 dark:bg-azul-800/90 border-azul-900/15 dark:border-azul-700/60 shadow-md shadow-azul-900/5"
                className="text-azul-900 dark:text-crema placeholder:text-azul-900/50 dark:placeholder:text-neutro-400 font-medium"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] h-11 rounded-xl bg-azul-900 text-crema hover:bg-azul-800 dark:bg-dorado-500 dark:text-azul-900 dark:hover:bg-dorado-600 font-semibold text-sm transition-all shadow-md flex items-center justify-center"
            >
              {tLanding("quickSearchButton")}
            </button>
          </form>

          {/* Call To Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href={`/${locale}/auth/registro?portal=gestor`}>
              <InteractiveHoverButton text={tLanding("ctaGestor")} variant="primary" />
            </Link>
            <Link
              href={`/${locale}/unidades`}
              className="px-6 py-2.5 min-h-[44px] h-11 rounded-full border border-azul-900/30 bg-white/90 backdrop-blur-md text-sm font-semibold text-azul-900 hover:bg-azul-900/5 dark:border-dorado-500/30 dark:bg-azul-800/80 dark:text-dorado-300 dark:hover:bg-dorado-500/10 transition-all shadow-sm flex items-center gap-2"
            >
              <span>{tLanding("ctaBuscador")}</span>
              <ArrowRight className="h-4 w-4 text-azul-900 dark:text-dorado-300" />
            </Link>
          </div>

          {/* Search Wizard Container */}
          {!isClosedBeta && <div className="w-full max-w-5xl mx-auto mt-8">
            <SearchWizard />
          </div>}
        </div>
      </section>

      {isClosedBeta && <section className="w-full border-y border-border/60 bg-surface/70 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-3 text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{tLanding("betaSectionTitle")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{tLanding("betaSectionDescription")}</p>
        </div>
      </section>}

      {/* 2. SOCIAL PROOF FLOTANTE (ELDORA UI ANIMATED LIST) */}
      {!isClosedBeta && <section className="w-full py-16 px-4 sm:px-6 lg:px-8 border-y border-border/60 bg-muted/30">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary">
              <CheckCircle2 className="h-4 w-4" />
              <span>{tLanding("socialProof.tag")}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              {tLanding("socialProof.title")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {tLanding("socialProof.subtitle")}
            </p>
            <div className="flex items-center gap-6 pt-2 text-xs text-muted-foreground">
              <div>
                <span className="block font-bold text-foreground text-xl">
                  {tLanding("socialProof.stat1")}
                </span>
                <span>{tLanding("socialProof.stat1Label")}</span>
              </div>
              <div className="h-8 w-[1px] bg-border" />
              <div>
                <span className="block font-bold text-foreground text-xl">
                  {tLanding("socialProof.stat2")}
                </span>
                <span>{tLanding("socialProof.stat2Label")}</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto">
            <AnimatedList delay={2800}>
              {socialEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface border border-border/80 shadow-sm backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{event.title}</div>
                      <div className="text-[11px] text-muted-foreground">{event.location}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-semibold uppercase ${event.color}`}>
                      {event.type}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">{event.time}</span>
                  </div>
                </div>
              ))}
            </AnimatedList>
          </div>
        </div>
      </section>}

      {/* 3. PROPUESTA DE VALOR (ACETERNITY BENTO GRID) */}
      {!isClosedBeta && <section className="w-full py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {tLanding("bento.commissionTitle")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {tLanding("bento.commissionDesc")}
            </p>
          </div>

          <BentoGrid>
            {/* 1. CERO COMISIONES */}
            <BentoGridItem
              title={tLanding("bento.commissionTitle")}
              description={tLanding("bento.commissionDesc")}
              badge={
                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-full">
                  {tLanding("bento.commissionBadge")}
                </span>
              }
              icon={<DollarSign className="h-6 w-6 text-secondary" />}
              header={
                <div className="w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-secondary/10 via-primary/5 to-transparent flex items-center justify-center p-4">
                  <div className="text-center">
                    <span className="text-3xl font-black text-secondary">
                      {tLanding("bento.commissionZero")}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {tLanding("bento.commissionSub")}
                    </span>
                  </div>
                </div>
              }
            />

            {/* 2. CONTACTO DIRECTO POR WHATSAPP */}
            <BentoGridItem
              title={tLanding("bento.whatsappTitle")}
              description={tLanding("bento.whatsappDesc")}
              badge={
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  {tLanding("bento.whatsappBadge")}
                </span>
              }
              icon={<MessageCircle className="h-6 w-6 text-emerald-500" />}
              header={
                <div className="w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-emerald-500/10 via-background to-secondary/10 flex flex-col justify-center p-3.5 space-y-2">
                  <div className="bg-surface border border-border/70 rounded-xl px-3 py-1.5 text-xs text-foreground shadow-xs max-w-[85%] self-start">
                    💬 &quot;Hola, me interesa la unidad publicada...&quot;
                  </div>
                  <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200 rounded-xl px-3 py-1.5 text-xs shadow-xs max-w-[85%] self-end">
                    ✅ Trato directo gestor e inquilino
                  </div>
                </div>
              }
            />

            {/* 3. UBICACIÓN CLARA Y SEGURA */}
            <BentoGridItem
              title={tLanding("bento.osmTitle")}
              description={tLanding("bento.osmDesc")}
              badge={
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {tLanding("bento.osmBadge")}
                </span>
              }
              icon={<ShieldCheck className="h-6 w-6 text-primary" />}
              header={
                <div className="w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent flex items-center justify-center p-4">
                  <div className="text-center">
                    <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-1" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {tLanding("bento.osmSession")}
                    </span>
                  </div>
                </div>
              }
            />

            {/* 4. GESTIÓN INTEGRAL Y CONTROL */}
            <BentoGridItem
              title={tLanding("bento.terminalTitle")}
              description={tLanding("bento.terminalDesc")}
              badge={
                <span className="text-[10px] font-bold text-dorado-700 dark:text-dorado-300 bg-dorado-500/15 px-2.5 py-0.5 rounded-full">
                  {tLanding("bento.terminalBadge")}
                </span>
              }
              icon={<SlidersHorizontal className="h-6 w-6 text-dorado-600 dark:text-dorado-300" />}
              header={
                <div className="w-full h-full min-h-[6rem] rounded-xl bg-surface border border-border/60 flex flex-col justify-center p-3.5 text-xs text-muted-foreground space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-foreground font-medium">
                    <span>Disponibilidad y Cupo</span>
                    <span className="text-secondary font-bold font-mono">100% Activo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Gestión de Señas y Pagos</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Directo</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Inquilinos y Contratos</span>
                    <span className="text-primary font-medium">Organizados</span>
                  </div>
                </div>
              }
            />
          </BentoGrid>
        </div>
      </section>}

      {/* 4. STORYTELLING INTERACTIVO (SKIPER19 SCROLL PATH) */}
      {!isClosedBeta && <section className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-surface/50 border-t border-border/60">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {tLanding("howItWorks.title")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              {tLanding("howItWorks.subtitle")}
            </p>
          </div>

          <Skiper19ScrollPath height={380} strokeColor="#1A56DB">
            <div className="space-y-12">
              <div className="bg-surface rounded-2xl p-6 border border-border/80 shadow-sm">
                <h3 className="text-base font-bold text-foreground mb-1">
                  {tLanding("howItWorks.step1Title")}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {tLanding("howItWorks.step1Desc")}
                </p>
              </div>

              <div className="bg-surface rounded-2xl p-6 border border-border/80 shadow-sm">
                <h3 className="text-base font-bold text-foreground mb-1">
                  {tLanding("howItWorks.step2Title")}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {tLanding("howItWorks.step2Desc")}
                </p>
              </div>

              <div className="bg-surface rounded-2xl p-6 border border-border/80 shadow-sm">
                <h3 className="text-base font-bold text-foreground mb-1">
                  {tLanding("howItWorks.step3Title")}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {tLanding("howItWorks.step3Desc")}
                </p>
              </div>
            </div>
          </Skiper19ScrollPath>
        </div>
      </section>}

      {/* 5. SHOWCASE VISUAL (MAGIC UI PIXEL IMAGE) */}
      {!isClosedBeta && <section className="w-full py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {tLanding("featuredUnits.title")}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {tLanding("featuredUnits.subtitle")}
              </p>
            </div>
            <Link
              href={`/${locale}/unidades`}
              className="text-xs font-semibold text-primary hover:underline min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5"
            >
              <span>{tLanding("featuredUnits.viewAll")}</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredUnits.map((unit, idx) => (
              <div key={idx} className="group flex flex-col space-y-3">
                <PixelImage
                  src={unit.image}
                  alt={unit.title}
                  aspectRatio="aspect-[16/10]"
                  gridSize={8}
                />
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {unit.title}
                    </h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-primary" />
                      <span>{unit.zone}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-foreground font-mono">
                      {unit.price}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {/* 6. TESTIMONIOS (ELDORA UI TESTIMONIAL SLIDER) */}
      {!isClosedBeta && <section className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-muted/40 border-t border-border/60">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {tLanding("testimonials.title")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {tLanding("testimonials.subtitle")}
            </p>
          </div>

          <TestimonialSlider
            testimonials={testimonials}
            prevAriaLabel={tLanding("testimonials.prevAria")}
            nextAriaLabel={tLanding("testimonials.nextAria")}
          />
        </div>
      </section>}
    </main>
  );
}
