#!/usr/bin/env node
/**
 * Post-build script to copy public assets to .next directory
 * This ensures public files are available when Netlify publishes from .next folder
 */

const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      // Recursively copy directories
      copyRecursive(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  const publicDir = path.join(__dirname, '..', 'public');
  const destDir = path.join(__dirname, '..', '.next', 'public');

  if (fs.existsSync(publicDir)) {
    console.log(`[Post-Build] Copying public files from ${publicDir} to ${destDir}`);
    copyRecursive(publicDir, destDir);
    console.log('[Post-Build] Public files copied successfully');
  } else {
    console.warn(`[Post-Build] Public directory not found at ${publicDir}`);
  }
} catch (error) {
  console.error('[Post-Build] Error copying files:', error);
  process.exit(1);
}
