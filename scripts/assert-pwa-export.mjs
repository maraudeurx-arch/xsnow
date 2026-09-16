/**
 * Fail the Pages export if Home Screen would open github.io root.
 * Run after `npm run build`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const manifestPath = resolve(root, "out/manifest.webmanifest");
const htmlPath = resolve(root, "out/index.html");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const html = readFileSync(htmlPath, "utf8");
const errors = [];

for (const field of ["id", "start_url", "scope"]) {
  if (manifest[field] !== "/xsnow/") {
    errors.push(`${field}=${JSON.stringify(manifest[field])} (expected "/xsnow/")`);
  }
}
if (JSON.stringify(manifest).includes("/xsnow/xsnow")) {
  errors.push("manifest double-prefixed /xsnow/xsnow");
}
for (const icon of manifest.icons ?? []) {
  if (!String(icon.src).startsWith("/xsnow/")) {
    errors.push(`icon src ${icon.src} is not under /xsnow/`);
  }
}
if (!html.includes('href="/xsnow/manifest.webmanifest"')) {
  errors.push("index.html missing /xsnow/manifest.webmanifest");
}
if (!html.includes('href="/xsnow/apple-touch-icon.png"')) {
  errors.push("index.html missing /xsnow/apple-touch-icon.png");
}
if (html.includes('href="/manifest.webmanifest"')) {
  errors.push("index.html links origin /manifest.webmanifest");
}
if (html.includes('href="/apple-touch-icon.png"')) {
  errors.push("index.html links origin /apple-touch-icon.png");
}

if (errors.length) {
  console.error(`PWA export check failed (${manifestPath}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PWA export: start_url / scope / id / apple-touch-icon stay under /xsnow/");
