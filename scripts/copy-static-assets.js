const fs = require('fs');
const path = require('path');

function copyFile(sourceRelativePath, targetRelativePath) {
  const sourcePath = path.join(process.cwd(), sourceRelativePath);
  const targetPath = path.join(process.cwd(), targetRelativePath);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

copyFile('styles/main.css', 'dist/styles/main.css');
copyFile('scripts/email-reveal.js', 'dist/scripts/email-reveal.js');
