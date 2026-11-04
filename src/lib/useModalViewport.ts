"use client";

import { useEffect, useState } from "react";

export const MODAL_OPEN_CLASS = "opc-modal-open";

/**
 * Stable mobile modal layout (Popol, 04/11/2026): while a modal is open, lock page scroll,
 * hide the fixed header/footer chrome (html.opc-modal-open) and size the overlay to the
 * *visual* viewport, so the iOS keyboard never squeezes the top nav or floats the footer banner.
 */
export function useModalViewport(): { top: number | string; height: number | string } {
  const [box, setBox] = useState<{ top: number | string; height: number | string }>({ top: 0, height: "100dvh" });
  useEffect(() => {
    const root = document.documentElement;
    const count = Number(root.dataset.opcModals || "0") + 1;
    root.dataset.opcModals = String(count);
    root.classList.add(MODAL_OPEN_CLASS);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const vv = window.visualViewport;
    const update = () => { if (vv) setBox({ top: Math.round(vv.offsetTop), height: Math.round(vv.height) }); };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      document.body.style.overflow = prevOverflow;
      const left = Math.max(0, Number(root.dataset.opcModals || "1") - 1);
      root.dataset.opcModals = String(left);
      if (!left) root.classList.remove(MODAL_OPEN_CLASS);
    };
  }, []);
  return box;
}
