"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { publicSpring } from "@/lib/motion-config";

export interface ClerkOtpInputProps {
  length?: number;
  value?: string;
  onChange?: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  className?: string;
}

export const ClerkOtpInput: React.FC<ClerkOtpInputProps> = ({
  length = 6,
  value = "",
  onChange,
  onComplete,
  disabled = false,
  className,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const currentValue = value !== undefined ? value : internalValue;
  const digits = Array.from({ length }, (_, i) => currentValue[i] || "");

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "").slice(0, length);
    if (value === undefined) {
      setInternalValue(rawVal);
    }
    onChange?.(rawVal);
    if (rawVal.length === length) {
      onComplete?.(rawVal);
    }
  };

  const handleBoxClick = () => {
    hiddenInputRef.current?.focus();
  };

  const activeIndex = Math.min(currentValue.length, length - 1);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center gap-2 sm:gap-3 cursor-text select-none",
        className
      )}
      onClick={handleBoxClick}
    >
      {/* Accessible & Automation-friendly real input */}
      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        placeholder="123456"
        value={currentValue}
        disabled={disabled}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 text-transparent"
        aria-label="Código de verificación"
      />

      {/* Visual Eldora UI Digit Boxes */}
      {digits.map((digit, idx) => {
        const isBoxActive = isFocused && idx === activeIndex;
        const hasDigit = !!digit;

        return (
          <div
            key={idx}
            className={cn(
              "relative w-11 h-14 sm:w-12 sm:h-14 flex items-center justify-center font-mono text-xl font-bold rounded-xl border bg-surface/80 backdrop-blur-md transition-all duration-200",
              isBoxActive
                ? "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/10"
                : hasDigit
                ? "border-border/90 text-foreground"
                : "border-border/60 text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span>{digit}</span>

            {/* Glowing Active Box Indicator */}
            {isBoxActive && (
              <motion.div
                layoutId="otp-box-glow"
                className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
                transition={publicSpring}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ClerkOtpInput;
