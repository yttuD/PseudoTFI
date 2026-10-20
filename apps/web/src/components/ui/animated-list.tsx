"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { publicSpring } from "@/lib/motion-config";

export interface AnimatedListProps {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedList = React.memo(
  ({ className, children, delay = 2500 }: AnimatedListProps) => {
    const [index, setIndex] = useState(0);
    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children]
    );

    useEffect(() => {
      if (childrenArray.length <= 1) return;
      const interval = setInterval(() => {
        setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length);
      }, delay);

      return () => clearInterval(interval);
    }, [childrenArray.length, delay]);

    const itemsToShow = useMemo(() => {
      const result = [];
      for (let i = 0; i <= index; i++) {
        result.unshift(childrenArray[i % childrenArray.length]);
      }
      return result.slice(0, 4); // Keep latest 4 items
    }, [index, childrenArray]);

    return (
      <div className={cn("flex flex-col items-center gap-3 overflow-hidden", className)}>
        <AnimatePresence initial={false}>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    );
  }
);

AnimatedList.displayName = "AnimatedList";

export function AnimatedListItem({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 15 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: -10 }}
      transition={publicSpring}
      className="mx-auto w-full"
    >
      {children}
    </motion.div>
  );
}

export default AnimatedList;
