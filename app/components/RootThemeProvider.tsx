"use client";

import React, { useEffect } from "react";
import { SchoolThemeProvider } from "./SchoolThemeProvider";

export function RootThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Intercept input changes globally to handle leading zeros
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (
        target &&
        target.tagName === "INPUT" &&
        (target.type === "number" ||
          target.getAttribute("inputmode") === "numeric" ||
          target.getAttribute("inputmode") === "decimal")
      ) {
        const val = target.value;
        // Match a leading zero (with optional sign) followed directly by another digit
        if (/^-?0\d/.test(val)) {
          const newVal = val.replace(/^(-?)0+(\d)/, "$1$2");

          // Prevent loop
          if ((target as any).__updating_value) return;
          (target as any).__updating_value = true;

          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(target, newVal);
          } else {
            target.value = newVal;
          }

          const tracker = (target as any)._valueTracker;
          if (tracker) {
            tracker.setValue(val);
          }

          target.dispatchEvent(new Event("input", { bubbles: true }));
          delete (target as any).__updating_value;
        }
      }
    };

    // Restore "0" on blur if left empty
    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (
        target &&
        target.tagName === "INPUT" &&
        (target.type === "number" ||
          target.getAttribute("inputmode") === "numeric" ||
          target.getAttribute("inputmode") === "decimal")
      ) {
        if (target.value === "") {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(target, "0");
          } else {
            target.value = "0";
          }

          const tracker = (target as any)._valueTracker;
          if (tracker) {
            tracker.setValue("");
          }

          target.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    };

    document.addEventListener("input", handleInput, true);
    document.addEventListener("blur", handleBlur, true);

    return () => {
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("blur", handleBlur, true);
    };
  }, []);

  return <SchoolThemeProvider source="auto">{children}</SchoolThemeProvider>;
}
