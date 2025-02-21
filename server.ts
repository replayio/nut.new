import * as path from 'node:path';
import { createRequestHandler } from '@remix-run/express';
import { broadcastDevReady, installGlobals } from '@remix-run/node';
import express from 'express';
import compression from 'compression';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Ensure globals are installed
installGlobals();

const BUILD_DIR = path.join(process.cwd(), 'build');
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by');

// Remix fingerprints its assets so we can cache forever.
app.use(
  '/build',
  express.static('public/build', { immutable: true, maxAge: '1y' })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static('public', { maxAge: '1h' }));

app.all(
  '*',
  process.env.NODE_ENV === 'development'
    ? createDevRequestHandler()
    : createRequestHandler({
        build: require(BUILD_DIR),
      })
);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
  if (process.env.NODE_ENV === 'development') {
    broadcastDevReady(require(BUILD_DIR));
  }
});

function createDevRequestHandler() {
  let build = require(BUILD_DIR);

  async function handleServerUpdate() {
    // Clear require cache and re-import the server build
    Object.keys(require.cache).forEach((key) => {
      if (key.startsWith(BUILD_DIR)) {
        delete require.cache[key];
      }
    });
    
    build = require(BUILD_DIR);
    // Tell Remix that this app server is now up-to-date
    await broadcastDevReady(build);
  }

  const chokidar = require('chokidar');
  const watcher = chokidar.watch(BUILD_DIR, { ignoreInitial: true });

  watcher.on('all', handleServerUpdate);
  watcher.on('ready', handleServerUpdate);

  return createRequestHandler({ build, mode: 'development' });
} 