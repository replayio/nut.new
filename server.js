import { createRequestHandler } from '@remix-run/express';
import express from 'express';
import * as path from 'path';

// Determine if we're in development or production mode
const isProduction = process.env.NODE_ENV === 'production';

// Define paths for client and server build artifacts
const BUILD_CLIENT_DIR = path.join(process.cwd(), 'build', 'client');
const BUILD_SERVER_PATH = path.join(process.cwd(), 'build', 'server', 'index.js');

async function start() {
  const app = express();

  // Setup development mode with Vite
  let viteDevServer;

  if (!isProduction) {
    const { createServer } = await import('vite');
    viteDevServer = await createServer({
      server: { middlewareMode: true },
    });
    app.use(viteDevServer.middlewares);
  } else {
    // In production, serve static files from the client build directory
    app.use(
      express.static(BUILD_CLIENT_DIR, {
        immutable: true,
        maxAge: '1y',
      }),
    );
  }

  // Handle all other requests with the Remix app
  app.all(
    '*',
    createRequestHandler({
      build: isProduction
        ? await import(BUILD_SERVER_PATH)
        : () => viteDevServer.ssrLoadModule('virtual:remix/server-build'),
      mode: isProduction ? 'production' : 'development',
    }),
  );

  // Start the server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Express server listening on http://localhost:${port}`);
  });
}

start().catch(console.error); 