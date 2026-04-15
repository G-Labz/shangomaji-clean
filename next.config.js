/** @type {import('next').NextConfig} */
const nextConfig = {
 images: {
  domains: [
    "images.unsplash.com",
    "picsum.photos",
    "image.pollinations.ai",
    "iwgmuiufrphrapooxtrd.supabase.co"
  ],
  unoptimized: true,
},
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
module.exports = nextConfig;
