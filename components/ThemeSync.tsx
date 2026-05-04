"use client";

import { useEffect } from "react";
import {
  MN_THEME_STORAGE_KEY,
  normalizeStoredTheme,
} from "../lib/theme";

/** Applies stored theme to `<html data-theme>` after mount (FOUC handled by inline script). */
export default function ThemeSync() {
  useEffect(() => {
    try {
      const t = normalizeStoredTheme(
        localStorage.getItem(MN_THEME_STORAGE_KEY),
      );
      document.documentElement.setAttribute("data-theme", t);
    } catch {
      /* private mode / denied */
    }
  }, []);
  return null;
}
