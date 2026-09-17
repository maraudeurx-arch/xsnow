/**
 * Light publicité photos: compress/resize on the device, then enforce a hard
 * KB cap. Never stores a multi-megabyte original. No CDN.
 */

export const AD_IMAGE_MAX_KB = 400;
export const AD_IMAGE_MAX_BYTES = AD_IMAGE_MAX_KB * 1024;
/** Harder cap for Resend attachments (mobile pubs). */
export const AD_EMAIL_MAX_KB = 150;
export const AD_EMAIL_MAX_BYTES = AD_EMAIL_MAX_KB * 1024;
/** Skip decode for giant camera dumps that would freeze a phone tab. */
export const AD_IMAGE_READ_MAX_BYTES = 12 * 1024 * 1024;
export const AD_IMAGE_MAX_EDGE = 1280;
const EDGE_STEPS = [1280, 960, 720, 560, 400] as const;
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45] as const;

export type PreparedAdImage = {
  dataUrl: string;
  bytes: number;
  mime: string;
  filename: string;
};

export type PrepareAdImageResult =
  | { ok: true; value: PreparedAdImage }
  | { ok: false; reason: "too_large" | "not_image" | "undecodable" };

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export function isAdImageMime(mime: string): boolean {
  const value = (mime || "").trim().toLowerCase();
  if (value === "image/svg+xml" || value === "image/svg") return false;
  return ALLOWED_MIME.has(value) || value === "image/pjpeg";
}

export function adImageWithinLimit(bytes: number): boolean {
  return Number.isFinite(bytes) && bytes > 0 && bytes <= AD_IMAGE_MAX_BYTES;
}

export function dataUrlByteLength(dataUrl: string): number {
  const trimmed = dataUrl.trim();
  const comma = trimmed.indexOf(",");
  const payload = comma >= 0 ? trimmed.slice(comma + 1) : trimmed;
  if (!payload) return 0;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

export function isSafeImageDataUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value.startsWith("data:image/")) return false;
  if (/svg/i.test(value.slice(0, 40))) return false;
  if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(value)) return false;
  return adImageWithinLimit(dataUrlByteLength(value));
}

export function preparedFilename(mime: string, fallback = "publicite.jpg"): string {
  if (mime.includes("png")) return "publicite.png";
  if (mime.includes("webp")) return "publicite.webp";
  if (mime.includes("gif")) return "publicite.gif";
  return fallback;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("undecodable"));
    image.src = url;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsDataURL(blob);
  });
}

function fileToDataUrl(file: Blob): Promise<string> {
  return blobToDataUrl(file);
}

function drawScaled(image: HTMLImageElement, edge: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) return null;
  const longest = Math.max(width, height);
  const scale = longest > edge ? edge / longest : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/**
 * Compress a visitor photo to JPEG under {@link AD_IMAGE_MAX_KB} when needed.
 * Tiny already-legal JPEG/PNG/WebP files are kept as-is.
 */
function mimeFromFile(file: File): string {
  const typed = (file.type || "").toLowerCase().trim();
  if (isAdImageMime(typed)) return typed === "image/jpg" ? "image/jpeg" : typed;
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".jpe")) return "image/jpeg";
  return typed;
}

export async function prepareAdImage(file: File): Promise<PrepareAdImageResult> {
  const mime = mimeFromFile(file);
  if (!isAdImageMime(mime)) return { ok: false, reason: "not_image" };
  if (file.size <= 0) return { ok: false, reason: "not_image" };
  if (file.size > AD_IMAGE_READ_MAX_BYTES) return { ok: false, reason: "too_large" };

  if (typeof document === "undefined") {
    if (adImageWithinLimit(file.size)) {
      const dataUrl = await fileToDataUrl(file);
      if (!isSafeImageDataUrl(dataUrl)) return { ok: false, reason: "too_large" };
      return {
        ok: true,
        value: {
          dataUrl,
          bytes: dataUrlByteLength(dataUrl),
          mime: file.type || "image/jpeg",
          filename: preparedFilename(file.type, file.name || "publicite.jpg"),
        },
      };
    }
    return { ok: false, reason: "too_large" };
  }

  let objectUrl = "";
  try {
    objectUrl = URL.createObjectURL(file);
    const image = await loadImage(objectUrl);
    const longest = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
    if (adImageWithinLimit(file.size) && longest <= AD_IMAGE_MAX_EDGE && mime !== "image/gif") {
      const dataUrl = await fileToDataUrl(file);
      if (isSafeImageDataUrl(dataUrl)) {
        return {
          ok: true,
          value: {
            dataUrl,
            bytes: dataUrlByteLength(dataUrl),
            mime: file.type || "image/jpeg",
            filename: preparedFilename(file.type, "publicite.jpg"),
          },
        };
      }
    }

    for (const edge of EDGE_STEPS) {
      const canvas = drawScaled(image, edge);
      if (!canvas) continue;
      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        if (!blob) continue;
        if (!adImageWithinLimit(blob.size)) continue;
        const dataUrl = await blobToDataUrl(blob);
        if (!isSafeImageDataUrl(dataUrl)) continue;
        return {
          ok: true,
          value: {
            dataUrl,
            bytes: blob.size,
            mime: "image/jpeg",
            filename: "publicite.jpg",
          },
        };
      }
    }
    return { ok: false, reason: "too_large" };
  } catch {
    return { ok: false, reason: "undecodable" };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Re-encode for the owner inbox: always JPEG under {@link AD_EMAIL_MAX_KB}.
 * Real phone photos often fail Resend when sent near the 400 Ko display cap.
 */
export async function prepareAdImageForInbox(file: File): Promise<PrepareAdImageResult> {
  const prepared = await prepareAdImage(file);
  if (!prepared.ok) return prepared;
  if (prepared.value.bytes <= AD_EMAIL_MAX_BYTES && prepared.value.mime.includes("jpeg")) {
    return prepared;
  }
  if (typeof document === "undefined") {
    return prepared.value.bytes <= AD_EMAIL_MAX_BYTES
      ? prepared
      : { ok: false, reason: "too_large" };
  }
  let objectUrl = "";
  try {
    objectUrl = URL.createObjectURL(file);
    const image = await loadImage(objectUrl);
    for (const edge of EDGE_STEPS) {
      const canvas = drawScaled(image, edge);
      if (!canvas) continue;
      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        if (!blob || blob.size > AD_EMAIL_MAX_BYTES) continue;
        const dataUrl = await blobToDataUrl(blob);
        if (!isSafeImageDataUrl(dataUrl) || dataUrlByteLength(dataUrl) > AD_EMAIL_MAX_BYTES) continue;
        return {
          ok: true,
          value: {
            dataUrl,
            bytes: blob.size,
            mime: "image/jpeg",
            filename: "publicite.jpg",
          },
        };
      }
    }
    return { ok: false, reason: "too_large" };
  } catch {
    return { ok: false, reason: "undecodable" };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
