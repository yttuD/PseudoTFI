"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { publicSpring } from "@/lib/motion-config";

export interface Skiper4ThemeToggleProps {
  className?: string;
  initialTheme?: "light" | "dark";
  onThemeChange?: (theme: "light" | "dark") => void;
}

export const Skiper4ThemeToggle: React.FC<Skiper4ThemeToggleProps> = ({
  className,
  onThemeChange,
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme || theme || "light") : "light";
  const isDark = currentTheme === "dark";

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    onThemeChange?.(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      className={cn(
        "relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border/80 bg-surface/80 backdrop-blur-md text-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shadow-sm",
        className
      )}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: isDark ? 180 : 0,
          scale: isDark ? 0 : 1,
          opacity: isDark ? 0 : 1,
        }}
        transition={publicSpring}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <Sun className="h-5 w-5 text-amber-500" />
      </motion.div>

      <motion.div
        initial={false}
        animate={{
          rotate: isDark ? 0 : -180,
          scale: isDark ? 1 : 0,
          opacity: isDark ? 1 : 0,
        }}
        transition={publicSpring}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <Moon className="h-5 w-5 text-primary" />
      </motion.div>
    </button>
  );
};

export default Skiper4ThemeToggle;
