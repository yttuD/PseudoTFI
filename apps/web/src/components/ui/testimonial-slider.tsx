"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { publicSpring } from "@/lib/motion-config";

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  location: string;
  avatar?: string;
}

export interface TestimonialSliderProps {
  testimonials: Testimonial[];
  className?: string;
  autoPlay?: boolean;
  prevAriaLabel?: string;
  nextAriaLabel?: string;
}

export const TestimonialSlider: React.FC<TestimonialSliderProps> = ({
  testimonials,
  className,
  prevAriaLabel = "Testimonio anterior",
  nextAriaLabel = "Siguiente testimonio",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!testimonials || testimonials.length === 0) return null;

  const current = testimonials[currentIndex];
  const authorName = current.author || (current as unknown as { name?: string }).name || '';
  const initials = authorName.slice(0, 2).toUpperCase();

  const prev = () => {
    setCurrentIndex((prevIdx) => (prevIdx === 0 ? testimonials.length - 1 : prevIdx - 1));
  };

  const next = () => {
    setCurrentIndex((prevIdx) => (prevIdx === testimonials.length - 1 ? 0 : prevIdx + 1));
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/80 bg-surface/85 backdrop-blur-xl p-6 sm:p-10 shadow-glass max-w-3xl mx-auto",
        className
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={publicSpring}
          className="relative z-10 flex flex-col justify-between min-h-[160px] gap-6"
        >
          <div className="flex items-start gap-3 pr-8">
            <span className="text-primary text-2xl md:text-3xl font-serif font-bold select-none leading-none mt-1">
              “
            </span>
            <p className="text-base sm:text-lg md:text-xl font-normal text-foreground/90 italic leading-relaxed">
              {current.quote}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-mono font-bold text-sm">
                {initials}
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base text-foreground">
                  {authorName}
                </h4>
                <p className="text-xs text-muted-foreground font-mono">
                  {current.role} {current.location ? `• ${current.location}` : ''}
                </p>
              </div>
            </div>

            {/* Controles de navegación */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={prev}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 sm:p-2.5 rounded-full border border-border/80 bg-background/50 hover:bg-accent transition-colors text-foreground shadow-sm"
                aria-label={prevAriaLabel}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={next}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 sm:p-2.5 rounded-full border border-border/80 bg-background/50 hover:bg-accent transition-colors text-foreground shadow-sm"
                aria-label={nextAriaLabel}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TestimonialSlider;
