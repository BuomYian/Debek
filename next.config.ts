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
};

export default nextConfig;
