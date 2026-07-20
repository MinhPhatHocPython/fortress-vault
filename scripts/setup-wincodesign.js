const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const cacheDir = path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE + '\\AppData\\Local', 'electron-builder', 'Cache', 'winCodeSign');
const archiveUrl = 'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z';
const archivePath = path.join(cacheDir, 'wincodesign.7z');
const extractDir = path.join(cacheDir, 'extracted');

async function main() {
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

  // Download
  console.log('Downloading winCodeSign...');
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(archivePath);
    https.get(archiveUrl, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
  console.log('Downloaded. Extracting...');

  // Extract with -snl (no symlinks) using system 7zip
  const sevenZip = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
  execSync(`"${sevenZip}" x -snl -bd -o"${extractDir}" "${archivePath}"`, { stdio: 'inherit' });
  console.log('Extracted.');

  // Copy extracted files to each cache subfolder pattern that electron-builder expects
  const entries = fs.readdirSync(cacheDir).filter(f => /^\d+$/.test(f));
  for (const entry of entries) {
    const target = path.join(cacheDir, entry);
    if (fs.statSync(target).isDirectory()) {
      console.log('Copying to ' + entry);
      copyRecursive(extractDir, target);
    }
  }
  console.log('Done!');
}

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      if (!fs.existsSync(destPath)) fs.copyFileSync(srcPath, destPath);
    }
  }
}

main().catch(console.error);
