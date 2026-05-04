"use client";

import { useEffect, type RefObject } from "react";

function getFocusable(root: HTMLElement): HTMLElement[] {
  const sel =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(sel)).filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    return true;
  });
}

/** Trap Tab/Shift+Tab inside `rootRef` while `active`; restore focus on cleanup. */
export function useModalFocusTrap(
  active: boolean,
  rootRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active || !rootRef.current) return;
    const root = rootRef.current;
    const previous = document.activeElement as HTMLElement | null;

    const list = getFocusable(root);
    if (list.length > 0) {
      window.setTimeout(() => list[0]?.focus(), 0);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !root.contains(document.activeElement)) return;
      const items = getFocusable(root);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [active, rootRef]);
}
