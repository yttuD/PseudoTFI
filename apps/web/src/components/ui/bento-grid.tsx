"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { publicSpring } from "@/lib/motion-config";

export interface BentoGridProps {
  className?: string;
  children?: React.ReactNode;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ className, children }) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto auto-rows-[18rem]",
        className
      )}
    >
      {children}
    </div>
  );
};

export interface BentoGridItemProps {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
}

export const BentoGridItem: React.FC<BentoGridItemProps> = ({
  className,
  title,
  description,
  header,
  icon,
  badge,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={publicSpring}
      onClick={onClick}
      className={cn(
        "row-span-1 rounded-2xl group/bento hover:shadow-lg transition-shadow duration-200 p-5 sm:p-6 bg-surface border border-border/80 justify-between flex flex-col space-y-4 relative overflow-hidden backdrop-blur-sm",
        onClick && "cursor-pointer",
        className
      )}
    >
      {badge && <div className="absolute top-5 sm:top-6 right-5 sm:right-6 z-10">{badge}</div>}
      <div className="w-full flex-1 overflow-hidden rounded-xl">{header}</div>
      <div className="group-hover/bento:translate-x-1 transition duration-200">
        {icon && <div className="text-primary mb-2">{icon}</div>}
        <div className="font-semibold text-foreground mb-1 text-base tracking-tight">{title}</div>
        <div className="font-normal text-muted-foreground text-xs leading-relaxed">{description}</div>
      </div>
    </motion.div>
  );
};

export default BentoGrid;
