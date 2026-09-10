import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const buildDir = path.join(projectRoot, 'build');
const distClientDir = path.join(projectRoot, 'dist', 'client');

// 1. Garante que dist/client existe
if (!fs.existsSync(distClientDir)) {
  fs.mkdirSync(distClientDir, { recursive: true });
}

// 2. Copia os assets e index.html estáticos de build para dist/client
if (fs.existsSync(buildDir)) {
  const indexHtmlSrc = path.join(buildDir, 'index.html');
  const indexHtmlDest = path.join(distClientDir, 'index.html');

  if (fs.existsSync(indexHtmlSrc)) {
    fs.copyFileSync(indexHtmlSrc, indexHtmlDest);
    console.log('[prepare-dist] index.html copiado com sucesso para dist/client/index.html');
  }

  const assetsSrc = path.join(buildDir, 'assets');
  const assetsDest = path.join(distClientDir, 'assets');

  if (fs.existsSync(assetsSrc)) {
    fs.cpSync(assetsSrc, assetsDest, { recursive: true });
    console.log('[prepare-dist] assets copiados com sucesso para dist/client/assets');
  }
}

console.log('[prepare-dist] Preparação do diretório de publicação concluída com sucesso.');
