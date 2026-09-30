"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  variant?: "primary" | "whatsapp" | "secondary";
}

export const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", className, variant = "primary", children, ...props }, ref) => {
  const displayText = children || text;

  const variantStyles = {
    primary: "border-azul-900/30 text-azul-900 hover:border-azul-900 dark:border-dorado-500/30 dark:text-dorado-300 dark:hover:border-dorado-500",
    whatsapp: "border-[#047857]/40 hover:border-[#047857] text-[#047857] dark:text-[#34D399] dark:border-[#34D399]/40 hover:text-white dark:hover:text-white",
    secondary: "border-border hover:border-foreground text-foreground hover:text-background",
  };

  const dotBgStyles = {
    primary: "bg-azul-900 dark:bg-dorado-500",
    whatsapp: "bg-[#047857] dark:bg-[#34D399]",
    secondary: "bg-foreground",
  };

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "group relative w-auto cursor-pointer overflow-hidden rounded-full border bg-white/90 dark:bg-azul-800/90 backdrop-blur-md px-6 py-2.5 min-h-[44px] inline-flex items-center justify-center text-center font-semibold transition-all duration-300 shadow-sm hover:shadow-md",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-[100.8]",
            dotBgStyles[variant]
          )}
        />
        <span className="inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0 text-sm">
          {displayText}
        </span>
      </div>

      <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-crema dark:text-azul-900 opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100">
        <span className="text-sm font-semibold">{displayText}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";
export default InteractiveHoverButton;
