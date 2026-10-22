"use client";

import React, { useId, useRef, useState } from "react";
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
  const tabsId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = propTabs.findIndex((tab) => tab.value === active.value);

  const moveSelectedTabToTop = (idx: number) => {
    const selected = propTabs[idx];
    setActive(selected);
    onTabChange?.(selected);
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (propTabs.length < 2) return;
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (index + 1) % propTabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (index - 1 + propTabs.length) % propTabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = propTabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    moveSelectedTabToTop(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="w-full flex flex-col">
      <div
        role="tablist"
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
              ref={(element) => { tabRefs.current[idx] = element; }}
              id={`${tabsId}-tab-${idx}`}
              onClick={() => moveSelectedTabToTop(idx)}
              onKeyDown={(event) => handleTabKeyDown(event, idx)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tabsId}-panel`}
              tabIndex={isActive ? 0 : -1}
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

      <div
        id={`${tabsId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-tab-${activeIndex}`}
        tabIndex={0}
        className={cn("relative w-full mt-4", contentClassName)}
      >
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
