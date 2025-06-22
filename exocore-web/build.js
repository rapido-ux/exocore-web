const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');
const { solidPlugin } = require('esbuild-plugin-solid');

const publicDir = path.resolve(__dirname, 'public');
const publicDirSrc = path.resolve(publicDir, 'src');

if (!fs.existsSync(publicDirSrc)) {
  fs.mkdirSync(publicDirSrc, { recursive: true });
}

let lastTimestamps = {};

function getJSXFiles() {
  return fs.readdirSync(publicDir)
    .filter(file => file.endsWith('.jsx'))
    .map(file => path.join(publicDir, file));
}

async function buildJSX(entryPoints) {
  try {
    await build({
      entryPoints,
      outdir: publicDirSrc,
      bundle: true,
      format: 'esm',
      plugins: [solidPlugin()],
      jsx: 'automatic',
      jsxImportSource: 'solid-js',
      minify: false,
      sourcemap: true,
      splitting: false,
      treeShaking: true,
      logLevel: 'silent',
    });
  } catch (err) {
  }
}

function hasChanged(files) {
  let changed = false;
  for (const file of files) {
    const stat = fs.statSync(file);
    const last = lastTimestamps[file] || 0;
    if (stat.mtimeMs > last) {
      lastTimestamps[file] = stat.mtimeMs;
      changed = true;
    }
  }
  return changed;
}

(async () => {
  const jsxFiles = getJSXFiles();
  if (jsxFiles.length === 0) {
    return; 
  }

  console.log(`[ESBuild] JSX loaded: ${jsxFiles.length} files.`);
  await buildJSX(jsxFiles);

  setInterval(async () => {
    const files = getJSXFiles();
    if (hasChanged(files)) {
      await buildJSX(files);
    }
  }, 1000); 
})();
