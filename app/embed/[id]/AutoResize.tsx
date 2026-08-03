"use client";

import { useEffect } from "react";

// Reports the rendered content height to the parent window so the embed loader
// can size its iframe to fit. Uses body.scrollHeight (the actual content), not
// documentElement.scrollHeight, which is floored at the iframe viewport height
// and therefore can never let the iframe shrink.
export function AutoResize({ id }: { id: string }) {
  useEffect(() => {
    const post = () => {
      const height = document.body.scrollHeight;
      window.parent?.postMessage({ type: "cms-widget-height", id, height }, "*");
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    window.addEventListener("load", post);
    // Catch late-loading images that change height after mount.
    const t = setInterval(post, 500);
    const stop = setTimeout(() => clearInterval(t), 8000);
    return () => {
      ro.disconnect();
      window.removeEventListener("load", post);
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [id]);
  return null;
}
