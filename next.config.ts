/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 output: 'export'
  // 移除 basePath
  images: { 
    unoptimized: true 
  },
};

export default nextConfig;