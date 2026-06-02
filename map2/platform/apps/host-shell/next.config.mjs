/** @type {import('next').NextConfig} */
const config = {
  // Allow importing the workspace shared-types package.
  transpilePackages: ['@platform/shared-types', 'maplibre-gl'],
  // Cleaner output in dev.
  poweredByHeader: false,

  // Force Webpack instead of Turbopack (required for Module Federation).
  bundlePagesRouterDependencies: true,

  webpack(webpackConfig, { isServer }) {
    // Prevent maplibre-gl from being bundled server-side.
    if (isServer) {
      webpackConfig.externals = webpackConfig.externals || [];
      webpackConfig.externals.push('maplibre-gl');
    }

    return webpackConfig;
  },
};

export default config;
