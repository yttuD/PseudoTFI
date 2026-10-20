"use client";

import React, { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  MotionValue,
} from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { publicSpring } from "@/lib/motion-config";
import { Menu, X } from "lucide-react";

export interface DockItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  onClick?: () => void;
}

export interface FloatingDockProps {
  items: DockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
  className?: string;
  mobileAriaLabel?: string;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  items,
  desktopClassName,
  mobileClassName,
  className,
  mobileAriaLabel,
}) => {
  return (
    <div className={cn("relative", className)}>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} mobileAriaLabel={mobileAriaLabel} />
    </div>
  );
};

const FloatingDockMobile: React.FC<{
  items: DockItem[];
  className?: string;
  mobileAriaLabel?: string;
}> = ({ items, className, mobileAriaLabel = "Abrir menú flotante" }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute bottom-full mb-2 inset-x-0 flex flex-col gap-2 p-2 rounded-2xl bg-surface/90 backdrop-blur-xl border border-border shadow-xl z-50"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={publicSpring}
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: idx * 0.05 },
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: { delay: (items.length - 1 - idx) * 0.03 },
                }}
              >
                {item.href.startsWith("#") || !item.href ? (
                  <button
                    onClick={() => {
                      item.onClick?.();
                      setOpen(false);
                    }}
                    className="flex min-h-[44px] h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <div className="h-5 w-5 flex items-center justify-center text-primary">{item.icon}</div>
                    <span>{item.title}</span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => {
                      item.onClick?.();
                      setOpen(false);
                    }}
                    className="flex min-h-[44px] h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <div className="h-5 w-5 flex items-center justify-center text-primary">{item.icon}</div>
                    <span>{item.title}</span>
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface/90 backdrop-blur-xl border border-border shadow-lg text-foreground focus:outline-none"
        aria-label={mobileAriaLabel}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  );
};

const FloatingDockDesktop: React.FC<{
  items: DockItem[];
  className?: string;
}> = ({ items, className }) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "hidden md:flex h-14 items-center gap-3 rounded-2xl bg-surface/85 backdrop-blur-xl px-4 border border-border/80 shadow-glass",
        className
      )}
    >
      {items.map((item) => (
        <DockIconContainer mouseX={mouseX} key={item.title} item={item} />
      ))}
    </motion.div>
  );
};

const DockIconContainer: React.FC<{
  mouseX: MotionValue<number>;
  item: DockItem;
}> = ({ mouseX, item }) => {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [44, 56, 44]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 260, damping: 20 });

  const [hovered, setHovered] = useState(false);

  const content = (
    <motion.div
      ref={ref}
      style={{ width, height: width }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center justify-center rounded-xl bg-muted/60 hover:bg-muted text-foreground transition-colors cursor-pointer min-w-[44px] min-h-[44px]"
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            transition={publicSpring}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-pre rounded-md bg-foreground px-2 py-0.5 text-xs text-background shadow-md pointer-events-none"
          >
            {item.title}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-center text-primary">{item.icon}</div>
    </motion.div>
  );

  if (!item.href || item.href.startsWith("#")) {
    return (
      <div
        onClick={item.onClick}
        role="button"
        tabIndex={0}
        className="flex min-w-[44px] min-h-[44px] items-center justify-center"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={item.onClick}
      className="flex min-w-[44px] min-h-[44px] items-center justify-center"
    >
      {content}
    </Link>
  );
};

export default FloatingDock;
