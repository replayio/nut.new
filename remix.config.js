/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ['**/.*'],
  serverModuleFormat: 'esm',
  serverPlatform: 'node',
  tailwind: true,
  postcss: true,
  watchPaths: ['./tailwind.config.ts'],
  dev: {
    port: 8002,
  },
  future: {
    v2_dev: true,
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
}; 