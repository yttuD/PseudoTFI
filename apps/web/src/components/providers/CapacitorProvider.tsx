"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard } from "@capacitor/keyboard";

export const CapacitorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // 1. Configure Native Status Bar
    const initStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#111827" });
      } catch (err) {
        console.warn("StatusBar config failed:", err);
      }
    };
    initStatusBar();

    // 2. Hardware Back Button Listener (Android)
    const backButtonListener = CapApp.addListener("backButton", ({ canGoBack }) => {
      // Check if any open modal, dialog, sheet, or overlay is currently active
      const openDialog = document.querySelector(
        '[role="dialog"][data-state="open"], [data-slot="dialog-content"], [data-slot="sheet-content"]'
      );

      if (openDialog) {
        // Dispatch ESC key event to trigger accessible close
        const escEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(escEvent);
        return;
      }

      // If no dialog is open, handle navigation
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        // At root or empty history, minimize or exit
        CapApp.minimizeApp().catch(() => CapApp.exitApp());
      }
    });

    // 3. Keyboard Listeners to prevent layout shift
    const showListener = Keyboard.addListener("keyboardWillShow", () => {
      document.body.classList.add("keyboard-open");
    });
    const hideListener = Keyboard.addListener("keyboardWillHide", () => {
      document.body.classList.remove("keyboard-open");
    });

    return () => {
      backButtonListener.then((sub) => sub.remove()).catch(() => {});
      showListener.then((sub) => sub.remove()).catch(() => {});
      hideListener.then((sub) => sub.remove()).catch(() => {});
    };
  }, [router]);

  return <>{children}</>;
};

export default CapacitorProvider;
