const fs = require('fs');
const path = require('path');
const axios = require('axios');
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
  } catch (err) {}
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

async function downloadMainAndPackage() {
  try {
    const mainUrl = 'https://raw.githubusercontent.com/Exocore-Organization/exocore-web/main/main.js';
    const packageUrl = 'https://raw.githubusercontent.com/Exocore-Organization/exocore-web/refs/heads/main/package.json';

    const mainPath = path.join(__dirname, '../main.js');
    const packagePath = path.join(__dirname, '../package.json');

    const [mainResponse, pkgResponse] = await Promise.all([
      axios.get(mainUrl),
      axios.get(packageUrl),
    ]);

    fs.writeFileSync(mainPath, mainResponse.data, 'utf8');
    console.log("✅ main.js successfully saved to ../main.js");

    fs.writeFileSync(packagePath, JSON.stringify(pkgResponse.data, null, 2), 'utf8');
    console.log("✅ package.json successfully saved to ../package.json");
  } catch (err) {
    console.error("❌ Failed to download main.js or package.json:", err.message);
  }
}

(async () => {
  await downloadMainAndPackage();

  const jsxFiles = getJSXFiles();
  if (jsxFiles.length === 0) return;

  console.log(`[ESBuild] JSX loaded: ${jsxFiles.length} files.`);
  await buildJSX(jsxFiles);

  setInterval(async () => {
    const files = getJSXFiles();
    if (hasChanged(files)) {
      await buildJSX(files);
    }
  }, 1000);
})();
