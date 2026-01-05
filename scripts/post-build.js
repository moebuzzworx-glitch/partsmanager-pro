#!/usr/bin/env node
/**
 * Post-build script to copy public assets to .next directory
 * This ensures public files are available when Netlify publishes from .next folder
 * Files from public/ are copied directly to .next/ so they're served at root
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
      console.log(`  Copied: ${item}`);
    }
  }
}

try {
  const publicDir = path.join(__dirname, '..', 'public');
  
  if (!fs.existsSync(publicDir)) {
    console.warn(`[Post-Build] Public directory not found at ${publicDir}`);
    process.exit(0);
  }

  // Copy public files directly to .next root (not .next/public)
  // This ensures public/notification-sound.mp3 becomes .next/notification-sound.mp3
  // which is served at /notification-sound.mp3 when Netlify publishes from .next
  const nextDir = path.join(__dirname, '..', '.next');
  console.log(`[Post-Build] Copying public files from ${publicDir} to ${nextDir}`);
  
  if (!fs.existsSync(nextDir)) {
    fs.mkdirSync(nextDir, { recursive: true });
  }
  
  copyRecursive(publicDir, nextDir);
  console.log('[Post-Build] Public files copied to .next root successfully');
  
} catch (error) {
  console.error('[Post-Build] Error copying files:', error);
  process.exit(1);
}
