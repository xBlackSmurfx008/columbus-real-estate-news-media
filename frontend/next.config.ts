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
    return [
      { source: "/tools", destination: "/resources", permanent: true },
      // Legacy static prototypes (deleted from the repo 2026-09-04). Google had
      // indexed them and was still surfacing their frozen market figures
      // (5,223 listings / +8.2% YoY / 6.43%). A 301 to the live equivalents is
      // what actually de-indexes them: a 404 would linger in the index far
      // longer and drops any accumulated link equity, and a noindex tag can
      // only work on a page we keep serving.
      { source: "/columbusrealestatenews-v2.html", destination: "/", permanent: true },
      { source: "/columbusrealestatenews-v3.html", destination: "/", permanent: true },
      { source: "/columbusrealestatenews-v2", destination: "/", permanent: true },
      { source: "/columbusrealestatenews-v3", destination: "/", permanent: true },
    ];
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
