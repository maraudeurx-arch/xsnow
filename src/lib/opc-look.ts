/**
 * Biweekly Open Community look.
 *
 * Epoch (fixed): 2026-01-01T00:00:00.000Z
 * Period: 14 days.
 * Even periods are Look A (classic chrome from git tag `pre-look-moderne-0.3.5`,
 * commit f817873a4795, app 0.3.5). Odd periods are Look B (current Parchemin
 * chrome, green place name, solid cobalt buttons).
 *
 * Preview either look with `?opc-look=a` or `?opc-look=b` (not stored).
 */

export const OPC_LOOK_EPOCH_MS = Date.UTC(2026, 0, 1);
export const OPC_LOOK_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

export type OpcLook = "a" | "b";

export function opcLookFor(now: number, epoch = OPC_LOOK_EPOCH_MS): OpcLook {
  const period = Math.floor((now - epoch) / OPC_LOOK_PERIOD_MS);
  return ((period % 2) + 2) % 2 === 0 ? "a" : "b";
}

export function resolveOpcLook(now: number, preview: string | null | undefined): OpcLook {
  if (preview === "a" || preview === "b") return preview;
  return opcLookFor(now);
}

/** Runs before paint. Sets `data-opc-look` on `<html>` and `<body>`. */
export const OPC_LOOK_BOOT_SCRIPT = `(function(){var E=${OPC_LOOK_EPOCH_MS},P=${OPC_LOOK_PERIOD_MS},look="b";try{var q=new URLSearchParams(location.search).get("opc-look");if(q==="a"||q==="b")look=q;else{var period=Math.floor((Date.now()-E)/P);look=((period%2)+2)%2===0?"a":"b";}}catch(e){}var root=document.documentElement;root.setAttribute("data-opc-look",look);if(document.body)document.body.setAttribute("data-opc-look",look);})();`;
