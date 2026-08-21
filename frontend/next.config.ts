import type { NextConfig } from "next";
import { withWorkflow } from 'workflow/next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/@img/sharp-linux-x64/**/*',
      './node_modules/@img/sharp-libvips-linux-x64/**/*',
    ],
  },
  async redirects() {
    return [{ source: "/tools", destination: "/resources", permanent: true }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      // Higgsfield-generated hero images (CloudFront)
      { protocol: "https", hostname: "*.cloudfront.net", pathname: "/**" },
      // Stable CREN newsroom heroes uploaded by the subscription image backfill.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" },
    ],
  },
};

export default withWorkflow(nextConfig);
