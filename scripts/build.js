/**
 * Build script for Netlify deployment
 * Copies JS and compiles Tailwind CSS into public/
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const files = [
  { src: 'src/js', dest: 'public/js' },
  { src: 'src/css/style.css', dest: 'public/css/style.css' },
];

files.forEach(({ src, dest }) => {
  const destDir = path.join(projectRoot, path.dirname(dest));
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const srcPath = path.join(projectRoot, src);
  const stats = fs.statSync(srcPath);
  if (stats.isDirectory()) {
    const items = fs.readdirSync(srcPath);
    items.forEach((item) => {
      if (item.endsWith('.js')) {
        const srcFile = path.join(srcPath, item);
        const destFile = path.join(projectRoot, dest, item);
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied ${srcFile} -> ${destFile}`);
      }
    });
  } else if (src === 'src/css/style.css') {
    const tailwindBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss');
    execSync(`"${tailwindBin}" -i src/css/style.css -o public/css/style.css`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    console.log('Built Tailwind CSS -> public/css/style.css');
  } else {
    const destFile = path.join(projectRoot, dest);
    fs.copyFileSync(srcPath, destFile);
    console.log(`Copied ${srcPath} -> ${destFile}`);
  }
});