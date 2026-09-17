/**
 * Save a published ad creative to the device.
 *
 * Desktop / Android Chrome: fetch as blob + `<a download>`.
 * iOS Safari / iOS PWA: Web Share with the image file when allowed
 * (Share Sheet → Enregistrer l’image). Otherwise open so long-press works.
 */

import { isIosDevice } from "./install-tip.ts";

export type CreativeDownloadResult = "saved" | "shared" | "opened" | "cancelled";

export type CreativeDownloadAnchor = {
  href: string;
  download: string;
  target?: "_blank";
};

export type DownloadCreativeDeps = {
  fetch?: typeof fetch;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  clickAnchor?: (anchor: CreativeDownloadAnchor) => void;
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  isAppleWebkit?: boolean;
};

const MIME_BY_EXT: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export function mimeFromFilename(filename: string): string {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

export function sanitizeDownloadFilename(raw: string): string {
  const trimmed = raw.trim().replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "-");
  return trimmed.slice(0, 80) || "publicite.png";
}

/** True on iOS Safari / Chrome-on-iOS (WKWebView). False for Chromium spoofing iPhone UA. */
export function isAppleWebkitMobile(
  env: { vendor?: string; userAgent?: string; platform?: string; maxTouchPoints?: number } = {},
): boolean {
  if (!isIosDevice(env)) return false;
  const vendor =
    env.vendor ?? (typeof navigator === "undefined" ? "" : navigator.vendor || "");
  return /Apple/i.test(vendor);
}

function defaultClickAnchor(anchor: CreativeDownloadAnchor) {
  if (typeof document === "undefined") {
    throw new Error("download_unavailable");
  }
  const node = document.createElement("a");
  node.href = anchor.href;
  node.download = anchor.download;
  node.rel = "noopener";
  if (anchor.target) node.target = anchor.target;
  node.style.display = "none";
  document.body.appendChild(node);
  node.click();
  node.remove();
}

function canShareFiles(
  data: ShareData,
  canShare: DownloadCreativeDeps["canShare"],
): boolean {
  try {
    if (canShare) return Boolean(canShare(data));
    if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
      return false;
    }
    return Boolean(navigator.canShare(data));
  } catch {
    return false;
  }
}

async function defaultShare(data: ShareData) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    throw new Error("share_unavailable");
  }
  await navigator.share(data);
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function downloadCreativeImage(
  opts: { url: string; filename: string; shareTitle?: string },
  deps: DownloadCreativeDeps = {},
): Promise<CreativeDownloadResult> {
  const url = opts.url.trim();
  const filename = sanitizeDownloadFilename(opts.filename);
  if (!url) throw new Error("missing_url");

  const fetchFn = deps.fetch ?? (typeof fetch === "function" ? fetch : undefined);
  const clickAnchor = deps.clickAnchor ?? defaultClickAnchor;
  const appleWebkit = deps.isAppleWebkit ?? isAppleWebkitMobile();
  const createObjectUrl =
    deps.createObjectUrl ?? (typeof URL !== "undefined" ? URL.createObjectURL.bind(URL) : undefined);
  const revokeObjectUrl =
    deps.revokeObjectUrl ?? (typeof URL !== "undefined" ? URL.revokeObjectURL.bind(URL) : undefined);

  let blob: Blob | null = null;
  if (fetchFn) {
    try {
      const response = await fetchFn(url, { credentials: "same-origin", mode: "cors" });
      if (response.ok) blob = await response.blob();
    } catch {
      blob = null;
    }
  }

  if (blob) {
    const type =
      blob.type && blob.type !== "application/octet-stream"
        ? blob.type
        : mimeFromFilename(filename);
    const file = new File([blob], filename, { type });
    const shareData: ShareData = {
      files: [file],
      title: opts.shareTitle || filename,
      text: opts.shareTitle || filename,
    };
    const share =
      deps.share ??
      (typeof navigator !== "undefined" && typeof navigator.share === "function"
        ? defaultShare
        : undefined);

    if (share && canShareFiles(shareData, deps.canShare)) {
      try {
        await share(shareData);
        return "shared";
      } catch (error) {
        if (isAbort(error)) return "cancelled";
      }
    }

    if (createObjectUrl) {
      const objectUrl = createObjectUrl(blob);
      try {
        if (appleWebkit) {
          clickAnchor({ href: objectUrl, download: filename, target: "_blank" });
          return "opened";
        }
        clickAnchor({ href: objectUrl, download: filename });
        return "saved";
      } finally {
        if (revokeObjectUrl) {
          setTimeout(() => revokeObjectUrl(objectUrl), 2_000);
        }
      }
    }
  }

  if (appleWebkit) {
    clickAnchor({ href: url, download: filename, target: "_blank" });
    return "opened";
  }
  clickAnchor({ href: url, download: filename });
  return "saved";
}
