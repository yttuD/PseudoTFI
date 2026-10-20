"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PixelImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  gridSize?: number;
  aspectRatio?: string;
}

export const PixelImage: React.FC<PixelImageProps> = ({
  src,
  alt,
  className,
  gridSize = 6,
  aspectRatio = "aspect-[4/3]",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Generate grid items
  const totalCells = gridSize * gridSize;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl group cursor-pointer border border-border/60 bg-muted",
        aspectRatio,
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />

      {/* Interactive Pixel Overlay Matrix */}
      <div
        className="absolute inset-0 grid pointer-events-none"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: totalCells }).map((_, index) => {
          const delay = (index % gridSize) * 0.02 + Math.floor(index / gridSize) * 0.02;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{
                opacity: isHovered ? [0, 0.4, 0] : 0,
              }}
              transition={{
                duration: 0.4,
                delay,
                ease: "easeInOut",
              }}
              className="bg-primary/20 backdrop-blur-[1px] border-[0.5px] border-white/20"
            />
          );
        })}
      </div>

      {/* Subtle vignette border */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
    </div>
  );
};

export default PixelImage;
