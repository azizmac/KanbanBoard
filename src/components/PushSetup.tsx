"use client";

import { useEffect } from "react";

/** Registers the service worker once, for any signed-in page. */
export function PushSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
