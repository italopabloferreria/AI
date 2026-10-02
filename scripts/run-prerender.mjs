import { build } from 'vite';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
await build({configFile:'vite.static.config.ts',build:{ssr:'scripts/prerender.tsx',outDir:'work/prerender',emptyOutDir:true}});
await import(pathToFileURL(path.resolve('work/prerender/prerender.js')).href);
