import path from "node:path";
import type { NextConfig } from "next";

// Address of the Express API (see .env.example). Empty while the site runs on sample data.
const API_URL = (process.env.API_URL ?? "").trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // The admin panel calls the API through the website's own address (/api/...),
  // and Next.js passes those requests on. The login cookie then belongs to the
  // website itself, which every browser accepts.
  async rewrites() {
    return API_URL ? [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }] : [];
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Product photos are stored on Cloudinary (see the API's upload endpoint).
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  turbopack: {
    // This repository holds two apps (api/ and web/). Tell Next.js that
    // the website's own folder is its root, not the repository root.
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
