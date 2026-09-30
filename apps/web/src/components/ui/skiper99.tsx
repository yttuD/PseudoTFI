"use client";

import React from "react";
import { motion, type TargetAndTransition } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { publicSpring } from "@/lib/motion-config";

export type AnimationType = "bounce" | "rotate" | "pulse" | "shake" | "lift";

export interface Skiper99Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  animation?: AnimationType;
  iconSize?: number;
  iconClassName?: string;
  active?: boolean;
}

const animationVariants: Record<AnimationType, { hover: TargetAndTransition; tap: TargetAndTransition }> = {
  bounce: {
    hover: { y: -4, transition: publicSpring },
    tap: { y: 1, scale: 0.95 },
  },
  rotate: {
    hover: { rotate: 20, scale: 1.1, transition: publicSpring },
    tap: { rotate: -10, scale: 0.95 },
  },
  pulse: {
    hover: { scale: 1.15, transition: publicSpring },
    tap: { scale: 0.9 },
  },
  shake: {
    hover: {
      rotate: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 },
    },
    tap: { scale: 0.9 },
  },
  lift: {
    hover: { y: -2, scale: 1.05, transition: publicSpring },
    tap: { y: 0, scale: 0.95 },
  },
};

export const Skiper99AnimatedIcon: React.FC<Skiper99Props> = ({
  icon: Icon,
  animation = "bounce",
  iconSize = 20,
  iconClassName,
  className,
  active = false,
  children,
  onClick,
  ...props
}) => {
  const currentVariant = animationVariants[animation];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] rounded-xl text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active && "text-primary font-medium",
        className
      )}
      {...props}
    >
      <motion.div
        className="inline-flex items-center justify-center"
        whileHover={currentVariant.hover}
        whileTap={currentVariant.tap}
      >
        <Icon size={iconSize} className={cn("transition-colors", iconClassName)} />
      </motion.div>
      {children && <span className="ml-1.5 text-xs">{children}</span>}
    </button>
  );
};

export default Skiper99AnimatedIcon;
