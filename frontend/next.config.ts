import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/tools", destination: "/resources", permanent: true }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      // Higgsfield-generated hero images (CloudFront)
      { protocol: "https", hostname: "*.cloudfront.net", pathname: "/**" },
    ],
  },
};

export default nextConfig;
