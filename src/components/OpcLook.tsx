"use client";

import { useEffect } from "react";
import { resolveOpcLook, type OpcLook } from "@/lib/opc-look";

function currentLook(): OpcLook {
  const preview = new URLSearchParams(window.location.search).get("opc-look");
  return resolveOpcLook(Date.now(), preview);
}

/** Mirrors the boot script onto html, body, and `.app-stage`. */
export function OpcLook() {
  useEffect(() => {
    const apply = () => {
      const look = currentLook();
      document.documentElement.setAttribute("data-opc-look", look);
      document.body.setAttribute("data-opc-look", look);
      document.querySelector(".app-stage")?.setAttribute("data-opc-look", look);
    };
    apply();
    const id = window.setInterval(apply, 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
