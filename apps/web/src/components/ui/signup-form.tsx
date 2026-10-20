"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SignupFormContainerProps {
  className?: string;
  children?: React.ReactNode;
}

export const SignupFormContainer: React.FC<SignupFormContainerProps> = ({
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        "max-w-md w-full mx-auto rounded-3xl p-6 sm:p-8 bg-surface/90 backdrop-blur-xl border border-border/80 shadow-glass relative overflow-hidden group",
        className
      )}
    >
      {/* Subtle top ambient glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">{children}</div>
    </div>
  );
};

export const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};

export default SignupFormContainer;
