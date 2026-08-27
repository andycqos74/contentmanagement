import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow any external page to embed CMS widgets inside iframes.
        // Without this, Next.js's default X-Frame-Options: SAMEORIGIN blocks
        // cross-origin framing and widgets never appear on the display site.
        source: "/embed/:path*",
        headers: [
          // Deprecated but still honoured by older browsers alongside CSP below.
          { key: "X-Frame-Options", value: "ALLOWALL" },
          // Modern browsers check this; "frame-ancestors *" allows any origin.
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
