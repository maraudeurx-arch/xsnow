import type { NextConfig } from "next";

const pagesBase = "/xsnow";

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
  basePath: pagesBase,
  assetPrefix: pagesBase,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  agentRules: false,
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
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
