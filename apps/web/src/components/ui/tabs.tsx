"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { publicSpring } from "@/lib/motion-config";

export interface TabItem {
  title: string;
  value: string;
  content?: string | React.ReactNode;
}

export interface AceternityTabsProps {
  tabs: TabItem[];
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
  defaultValue?: string;
  onTabChange?: (tab: TabItem) => void;
}

export const AnimatedTabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
  defaultValue,
  onTabChange,
}: AceternityTabsProps) => {
  const [active, setActive] = useState<TabItem>(
    propTabs.find((t) => t.value === defaultValue) || propTabs[0]
  );

  const moveSelectedTabToTop = (idx: number) => {
    const selected = propTabs[idx];
    setActive(selected);
    onTabChange?.(selected);
  };

  return (
    <div className="w-full flex flex-col">
      <div
        className={cn(
          "flex flex-col sm:flex-row items-stretch sm:items-center justify-start [perspective:1000px] relative max-w-full w-full gap-2 p-1 rounded-xl bg-muted/60 border border-border/60",
          containerClassName
        )}
      >
        {propTabs.map((tab, idx) => {
          const isActive = active.value === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => moveSelectedTabToTop(idx)}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-state={isActive ? "active" : "inactive"}
              className={cn(
                "relative px-4 py-2 min-h-[44px] w-full sm:w-auto flex items-center justify-center rounded-lg text-xs md:text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                tabClassName
              )}
              style={{ transformStyle: "preserve-3d" }}
            >
              {isActive && (
                <motion.div
                  layoutId="clickedbutton"
                  transition={publicSpring}
                  className={cn(
                    "absolute inset-0 bg-surface rounded-lg shadow-sm border border-border/70",
                    activeTabClassName
                  )}
                />
              )}
              <span className="relative block z-10">{tab.title}</span>
            </button>
          );
        })}
      </div>

      <div className={cn("relative w-full mt-4", contentClassName)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={active.value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={publicSpring}
            className="w-full"
          >
            {active.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export const Tabs = AnimatedTabs;
export default Tabs;
