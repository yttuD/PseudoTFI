"use client";

import React, { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Skiper19ScrollPathProps {
  className?: string;
  pathClassName?: string;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export const Skiper19ScrollPath: React.FC<Skiper19ScrollPathProps> = ({
  className,
  pathClassName,
  height = 400,
  strokeColor = "#1A56DB",
  strokeWidth = 2,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const pathLength = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 20,
  });

  const glowOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.2, 1, 1, 0.2]);

  return (
    <div ref={containerRef} className={cn("relative flex gap-6 items-start", className)}>
      <div className="relative shrink-0 flex flex-col items-center">
        <svg
          width="40"
          height={height}
          viewBox={`0 0 40 ${height}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("overflow-visible", pathClassName)}
        >
          {/* Background guide line */}
          <line
            x1="20"
            y1="0"
            x2="20"
            y2={height}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            strokeDasharray="4 4"
          />

          {/* Animated tracing path */}
          <motion.line
            x1="20"
            y1="0"
            x2="20"
            y2={height}
            stroke={strokeColor}
            strokeWidth={strokeWidth + 1}
            strokeLinecap="round"
            style={{ pathLength }}
          />

          {/* Glowing head indicator */}
          <motion.circle
            cx="20"
            cy="20"
            r="5"
            fill={strokeColor}
            style={{
              opacity: glowOpacity,
              y: useTransform(scrollYProgress, (v) => v * (height - 40)),
            }}
          />
        </svg>
      </div>

      <div className="flex-1 pb-8">{children}</div>
    </div>
  );
};

export default Skiper19ScrollPath;
