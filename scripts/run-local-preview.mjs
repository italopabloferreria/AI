import {build} from 'vite';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
process.loadEnvFile=()=>{};
delete process.env.DATABASE_URL;
process.env.NODE_ENV='test';
await build({configFile:'vite.static.config.ts',build:{ssr:'scripts/audit-local-server.ts',outDir:'work/local-server',emptyOutDir:true}});
await import(pathToFileURL(path.resolve('work/local-server/audit-local-server.js')).href);
