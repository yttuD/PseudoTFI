"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { terminalSpring } from "@/lib/motion-config";

export interface AnimatedCircularProgressBarProps {
  max?: number;
  value: number;
  min?: number;
  gaugePrimaryColor?: string;
  gaugeSecondaryColor?: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
}

export const AnimatedCircularProgressBar: React.FC<
  AnimatedCircularProgressBarProps
> = ({
  max = 100,
  min = 0,
  value = 0,
  gaugePrimaryColor,
  gaugeSecondaryColor = "#E5E7EB",
  className,
  size = 120,
  strokeWidth = 10,
  showText = true,
}) => {
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = Math.round(((normalizedValue - min) / (max - min)) * 100);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Auto color coding if gaugePrimaryColor is not provided
  const activeColor =
    gaugePrimaryColor ||
    (percentage >= 100
      ? "#F05252" // Red (full or over-capacity)
      : percentage >= 80
      ? "#F59E0B" // Amber warning
      : "#0E9F6E"); // Emerald safe

  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Secondary track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gaugeSecondaryColor}
          strokeWidth={strokeWidth}
        />
        {/* Animated Progress Gauge */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={terminalSpring}
        />
      </svg>

      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono text-center">
          <span className="text-xl font-bold tracking-tight text-foreground">
            {percentage}%
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {normalizedValue}/{max}
          </span>
        </div>
      )}
    </div>
  );
};

export default AnimatedCircularProgressBar;
