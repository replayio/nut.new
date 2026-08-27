import { vitePlugin as remixVitePlugin } from '@remix-run/dev';
import { vercelPreset } from '@vercel/remix/vite';
import { defineConfig, type Plugin } from 'vite';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import tsconfigPaths from 'vite-tsconfig-paths';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { isRetiredResourcePath } from './app/lib/shutdown';

dotenv.config();

// Get git hash with fallback
const getGitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'no-git-info';
  }
};

function shutdownGatePlugin(): Plugin {
  return {
    name: 'shutdown-gate',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '/').split('?')[0] ?? '/';
        if (!isRetiredResourcePath(pathname)) {
          next();
          return;
        }

        res.statusCode = 410;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
          JSON.stringify({
            error: 'gone',
            message: 'Replay Builder has shut down. Visit https://www.replay.io/',
          }),
        );
      });
    },
  };
}

export default defineConfig((config) => {
  return {
    define: {
      __COMMIT_HASH: JSON.stringify(getGitHash()),
      __APP_VERSION: JSON.stringify(process.env.npm_package_version),

      // 'process.env': JSON.stringify(process.env)
    },
    build: {
      target: 'esnext',
      sourcemap: true,
    },
    ssr: {
      noExternal: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
    },
    plugins: [
      shutdownGatePlugin(),
      remixVitePlugin({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true,
        },
        presets: [vercelPreset()],
      }),
      tsconfigPaths(),
      config.mode === 'production' && optimizeCssModules({ apply: 'build' }),
    ],
    envPrefix: [
      'VITE_',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'INTERCOM_APP_ID',
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  };
});
