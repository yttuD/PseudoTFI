"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { publicSpring } from "@/lib/motion-config";

export interface Skiper106InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  containerClassName?: string;
}

export const Skiper106Input = React.forwardRef<
  HTMLInputElement,
  Skiper106InputProps
>(({ className, icon, containerClassName, placeholder, value, onChange, onFocus, onBlur, ...props }, ref) => {
  const [focused, setFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentValue = value !== undefined ? String(value) : String(internalValue);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (value === undefined) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  return (
    <div
      data-touch-target="true"
      className={cn(
        "relative flex items-center w-full min-h-[44px] rounded-xl border border-border/80 bg-surface/80 backdrop-blur-md px-3.5 py-1.5 transition-all duration-300 shadow-sm",
        focused
          ? "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/5"
          : "hover:border-border",
        containerClassName
      )}
    >
      {icon && (
        <span className="mr-2.5 text-muted-foreground transition-colors group-focus-within:text-primary">
          {icon}
        </span>
      )}

      <div className="relative flex-1 flex items-center">
        <input
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn(
            "w-full h-11 min-h-[44px] bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          placeholder={placeholder}
          value={currentValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {/* Smooth Glow Indicator */}
        <motion.div
          className="absolute -bottom-2.5 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent pointer-events-none"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{
            opacity: focused ? 1 : 0,
            scaleX: focused ? 1 : 0,
          }}
          transition={publicSpring}
        />
      </div>
    </div>
  );
});

Skiper106Input.displayName = "Skiper106Input";
export default Skiper106Input;
