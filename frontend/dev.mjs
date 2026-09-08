/**
 * Start the dev server with the working directory set to this folder.
 *
 * Why this exists: the app lives in a path containing spaces ("Footage Tracker App"),
 * and launching Vite from anywhere else makes Tailwind look for tailwind.config.js in
 * the wrong place, so every custom colour silently disappears. Setting the directory
 * here means it starts correctly no matter where it is launched from.
 *
 *   node "…/frontend/dev.mjs"        (or: npm run dev)
 */
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
process.chdir(here);

const port = Number(process.env.PORT) || 5173;

const server = await createServer({
  root: here,
  configFile: `${here}/vite.config.js`,
  server: { port, strictPort: true },
});

await server.listen();
server.printUrls();
