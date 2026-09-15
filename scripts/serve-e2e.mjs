/**
 * Serve the Next static export (`out/`) at `/xsnow/`, matching GitHub Pages.
 * Playwright and `npm run serve:static` use this so assetPrefix/basePath resolve.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd(), "out");
const BASE = "/xsnow";
const PORT = Number(process.env.E2E_PORT || 4173);
const HOST = process.env.E2E_HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function send(res, status, headers = {}, body) {
  res.writeHead(status, headers);
  if (body === undefined) res.end();
  else res.end(body);
}

function fileFromUrl(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  if (decoded === "/") return { redirect: `${BASE}/` };
  if (decoded === BASE) return { redirect: `${BASE}/` };
  if (!decoded.startsWith(`${BASE}/`) && decoded !== BASE) return { status: 404 };

  const rel = decoded.slice(BASE.length) || "/";
  const candidates = [];
  if (rel.endsWith("/")) {
    candidates.push(join(ROOT, rel, "index.html"));
  } else {
    candidates.push(join(ROOT, rel));
    candidates.push(join(ROOT, `${rel}.html`));
    candidates.push(join(ROOT, rel, "index.html"));
  }

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    const relToRoot = relative(ROOT, resolved);
    if (relToRoot.startsWith("..") || normalize(relToRoot).startsWith("..")) continue;
    if (!existsSync(resolved) || !statSync(resolved).isFile()) continue;
    return { file: resolved };
  }
  return { status: 404 };
}

if (!existsSync(join(ROOT, "index.html"))) {
  console.error("Missing out/index.html. Run `npm run build` before serving the static export.");
  process.exit(1);
}

const server = createServer((req, res) => {
  const urlPath = req.url || "/";
  const mapped = fileFromUrl(urlPath);
  if (mapped.redirect) {
    send(res, 302, { Location: mapped.redirect });
    return;
  }
  if (!mapped.file) {
    send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
    return;
  }
  const type = MIME[extname(mapped.file).toLowerCase()] || "application/octet-stream";
  const html = type.startsWith("text/html");
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": html ? "no-store" : "public, max-age=60",
  });
  createReadStream(mapped.file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Static Pages export at http://${HOST}:${PORT}${BASE}/`);
});
