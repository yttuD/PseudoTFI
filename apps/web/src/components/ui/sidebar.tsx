"use client";

import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { terminalSpring } from "@/lib/motion-config";
import Link from "next/link";

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.aside
      className={cn(
        "h-full px-3 py-4 hidden md:flex md:flex-col bg-surface border-r border-border shrink-0 select-none",
        className
      )}
      animate={{
        width: animate ? (open ? "260px" : "76px") : "260px",
      }}
      transition={terminalSpring}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.aside>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className={cn(
        "h-14 px-4 flex flex-row md:hidden items-center justify-between bg-surface border-b border-border w-full"
      )}
      {...props}
    >
      <div className="flex justify-end z-20 w-full">
        <button
          className="text-foreground p-1.5 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setOpen(!open)}
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[99]"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              data-state="open"
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={terminalSpring}
              className={cn(
                "fixed h-full w-3/4 max-w-xs inset-0 bg-surface p-6 pt-safe pb-safe pl-safe z-[100] flex flex-col justify-between border-r border-border shadow-2xl",
                className
              )}
            >
              <button
                className="absolute right-4 top-4 p-1.5 rounded-lg text-foreground hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setOpen(false)}
                aria-label="Cerrar navegación"
              >
                <X className="h-5 w-5" />
              </button>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export interface SidebarLinkProps {
  link: {
    label: string;
    href: string;
    icon: React.ReactNode;
  };
  className?: string;
  active?: boolean;
}

export const SidebarLink = ({ link, className, active }: SidebarLinkProps) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-3 group/sidebar min-h-[44px] min-w-[44px] py-2.5 px-2.5 rounded-xl transition-colors duration-150",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
        className
      )}
    >
      <div className={cn("h-5 w-5 shrink-0 flex items-center justify-center", active && "text-primary")}>
        {link.icon}
      </div>

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={terminalSpring}
        className="text-xs whitespace-pre inline-block !p-0 !m-0 overflow-hidden font-medium"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

export default Sidebar;
