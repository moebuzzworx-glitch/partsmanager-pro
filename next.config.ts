import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimize build output size
  // Note: swcMinify is deprecated in Next.js 15.x (enabled by default)
  productionBrowserSourceMaps: false,
  
  // Enable compression
  compress: true,
  
  // Reduce .next folder size - exclude build dependencies
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-*',
      'node_modules/esbuild',
      'node_modules/@esbuild/*',
      'node_modules/typescript',
      'node_modules/eslint*',
      '.git',
      '.gitignore',
      '.env.example',
      'docs/**',
    ],
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
    // Optimize image delivery with modern formats only
    formats: ['image/avif', 'image/webp'],
  },
  
  // Reduce static page generation time
  staticPageGenerationTimeout: 300,
};

export default nextConfig;
