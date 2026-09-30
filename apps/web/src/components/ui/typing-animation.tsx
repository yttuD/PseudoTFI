"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TypingAnimationProps {
  texts: string[];
  duration?: number;
  pauseDuration?: number;
  className?: string;
  cursorClassName?: string;
}

export const TypingAnimation: React.FC<TypingAnimationProps> = ({
  texts,
  duration = 120,
  pauseDuration = 3000,
  className,
  cursorClassName,
}) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!texts || texts.length === 0) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplayedText(texts[currentTextIndex] || texts[0] || '');
      return;
    }

    const fullText = texts[currentTextIndex];
    let pauseTimer: NodeJS.Timeout | undefined;

    const timer = setTimeout(
      () => {
        if (!isDeleting) {
          if (displayedText.length < fullText.length) {
            setDisplayedText(fullText.slice(0, displayedText.length + 1));
          } else {
            // Pause at end before deleting
            pauseTimer = setTimeout(() => setIsDeleting(true), pauseDuration);
          }
        } else {
          if (displayedText.length > 0) {
            setDisplayedText(fullText.slice(0, displayedText.length - 1));
          } else {
            setIsDeleting(false);
            setCurrentTextIndex((prev) => (prev + 1) % texts.length);
          }
        }
      },
      isDeleting ? Math.round(duration * 0.55) : duration
    );

    return () => {
      clearTimeout(timer);
      if (pauseTimer) clearTimeout(pauseTimer);
    };
  }, [displayedText, isDeleting, currentTextIndex, texts, duration, pauseDuration]);

  return (
    <span className={cn("inline-flex items-center", className)}>
      <span>{displayedText}</span>
      <span
        className={cn(
          "inline-block w-[2px] h-[1.1em] ml-1 bg-primary animate-pulse",
          cursorClassName
        )}
        aria-hidden="true"
      />
    </span>
  );
};

export default TypingAnimation;
