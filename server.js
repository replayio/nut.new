import { createRequestHandler } from "@remix-run/node";
import * as build from "./build/server/index.js";

// This is the main server entry point for Vercel
const handler = createRequestHandler({
  build,
  getLoadContext(req, res) {
    return {
      env: process.env
    };
  },
  mode: process.env.NODE_ENV
});

export default handler;