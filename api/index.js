import { createRequestHandler } from "@remix-run/vercel";
import * as build from "../build/server/index.js";

export default createRequestHandler({
  build,
  getLoadContext(req) {
    return {
      env: process.env
    };
  },
  mode: process.env.NODE_ENV
});