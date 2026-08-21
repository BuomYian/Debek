import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Patient file/image thumbnails are served through Cloudinary
    // transformations (Section 7 performance requirement).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // Section 7: "secure headers." HTTPS itself is a deployment-platform
  // concern (Vercel/etc. terminate TLS in front of this), not something
  // Next.js config can enforce — HSTS below assumes it.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
