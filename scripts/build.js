/**
 * Build script for Netlify deployment
 * Copies JS and CSS from src/ into public/
 */
const fs = require('fs');
const path = require('path');

const files = [
  { src: 'src/js', dest: 'public/js' },
  { src: 'src/css/style.css', dest: 'public/css/style.css' },
];

files.forEach(({ src, dest }) => {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    // Copy all .js files from directory
    const items = fs.readdirSync(src);
    items.forEach((item) => {
      if (item.endsWith('.js')) {
        const srcFile = path.join(src, item);
        const destFile = path.join(dest, item);
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied ${srcFile} -> ${destFile}`);
      }
    });
  } else {
    // Copy single file
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
  }
});