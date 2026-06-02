/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@piplabs/cdr-sdk", "@piplabs/cdr-crypto"],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "node:module": false,
        "node:crypto": false,
        "node:buffer": false,
        "node:stream": false,
        "node:fs": false,
        "node:url": false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        module: false,
        crypto: false,
        buffer: false,
        stream: false,
        fs: false,
      };
    } else {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        { "node:fs": "commonjs node:fs", "node:url": "commonjs node:url" },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
