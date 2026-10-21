// Copies the 3 face models used by /arbitrage into public/models/human (self-hosted,
// no third-party CDN). Generated files are git-ignored.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const src = join(process.cwd(), "node_modules/@vladmandic/human/models");
const dst = join(process.cwd(), "public/models/human");
if (!existsSync(src)) {
  console.warn("copy-human-models: @vladmandic/human not installed; face match will be unavailable");
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
copyFileSync(
  join(process.cwd(), "node_modules/@vladmandic/human/dist/human.esm.js"),
  join(dst, "human.esm.js"),
);
for (const name of ["blazeface", "facemesh", "faceres"]) {
  for (const ext of ["json", "bin"]) copyFileSync(join(src, `${name}.${ext}`), join(dst, `${name}.${ext}`));
}
