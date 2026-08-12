/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('Copying static assets to standalone build...');
  
  // Copy .next/static to .next/standalone/.next/static
  const nextStaticSrc = path.join(__dirname, '..', '.next', 'static');
  const nextStaticDest = path.join(__dirname, '..', '.next', 'standalone', '.next', 'static');
  if (fs.existsSync(nextStaticSrc)) {
    copyDirSync(nextStaticSrc, nextStaticDest);
    console.log('Successfully copied .next/static');
  }

  // Copy public to .next/standalone/public
  const publicSrc = path.join(__dirname, '..', 'public');
  const publicDest = path.join(__dirname, '..', '.next', 'standalone', 'public');
  if (fs.existsSync(publicSrc)) {
    copyDirSync(publicSrc, publicDest);
    console.log('Successfully copied public directory');
  }

  console.log('Assets copy completed successfully!');
} catch (err) {
  console.error('Error copying assets:', err);
  process.exit(1);
}
