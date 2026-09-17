import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";
import { isCustomDomainCname, resolvePagesBasePath } from "./src/lib/pages-base.ts";

function publicCnamePresent() {
  try {
    const file = join(process.cwd(), "public/CNAME");
    if (!existsSync(file)) return false;
    const host = readFileSync(file, "utf8").trim().split(/\s+/)[0] ?? "";
    return isCustomDomainCname(host);
  } catch {
    return false;
  }
}

const pagesBase = resolvePagesBasePath(process.env, { cnamePresent: publicCnamePresent() });
process.env.NEXT_PUBLIC_CUSTOM_DOMAIN = pagesBase ? "0" : "1";

const x402Stub = "./src/lib/x402-stub.ts";

const x402Aliases = {
  "@x402/core/client": x402Stub,
  "@x402/evm": x402Stub,
  "@x402/evm/exact/client": x402Stub,
  "@x402/evm/upto/client": x402Stub,
  "@x402/svm/exact/client": x402Stub,
};

const nextConfig: NextConfig = {
  output: "export",
  ...(pagesBase ? { basePath: pagesBase, assetPrefix: pagesBase } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  agentRules: false,
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
  env: {
    NEXT_PUBLIC_CUSTOM_DOMAIN: pagesBase ? "0" : "1",
  },
  turbopack: {
    resolveAlias: x402Aliases,
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      ...x402Aliases,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push("pino-pretty", "lokijs", "encoding");
    }
    return config;
  },
};

export default nextConfig;
