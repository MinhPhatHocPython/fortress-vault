const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const appDir = path.join(releaseDir, 'win-unpacked');

console.log('Building portable Fortress Vault...');

// Step 1: Build the project
console.log('\n[1/3] Building TypeScript + Vite...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// Step 2: Use electron-builder with --dir flag to create unpacked app
// This might still fail, so we try another approach if it does
console.log('\n[2/3] Creating unpacked app...');

try {
  execSync('npx electron-builder --win --dir --config electron-builder.yml 2>&1', {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, CSC_LINK: '', CSC_KEY_PASSWORD: '', WIN_CSC_LINK: '', WIN_CSC_KEY_PASSWORD: '' }
  });
} catch (e) {
  console.log('\nelectron-builder --dir failed (expected), trying direct approach...');
  
  // Step 3: Manual packaging approach
  console.log('\n[3/3] Creating portable package...');
  
  // Get electron binary path
  const electronPath = path.join(rootDir, 'node_modules', 'electron', 'dist');
  
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
  }
  
  // Copy electron to app directory
  console.log('Copying Electron runtime...');
  copyDirSync(electronPath, appDir);
  
  // Copy our app files
  console.log('Copying app files...');
  const distMainDir = path.join(rootDir, 'dist', 'main');
  const distRendererDir = path.join(rootDir, 'dist', 'renderer');
  const resourcesDir = path.join(appDir, 'resources');
  const appResourcesDir = path.join(resourcesDir, 'app');
  
  if (fs.existsSync(resourcesDir)) {
    fs.rmSync(resourcesDir, { recursive: true });
  }
  fs.mkdirSync(appResourcesDir, { recursive: true });
  
  copyDirSync(distMainDir, path.join(appResourcesDir, 'dist', 'main'));
  copyDirSync(distRendererDir, path.join(appResourcesDir, 'dist', 'renderer'));
  copyDirSync(path.join(rootDir, 'resources'), path.join(appResourcesDir, 'resources'));
  
  // Copy package.json
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  const appPkg = {
    name: pkg.name,
    version: pkg.version,
    main: 'dist/main/index.js',
    dependencies: pkg.dependencies
  };
  fs.writeFileSync(path.join(appResourcesDir, 'package.json'), JSON.stringify(appPkg, null, 2));
  
  // Create asar archive
  console.log('Creating app.asar...');
  try {
    execSync(`npx asar pack "${appResourcesDir}" "${path.join(resourcesDir, 'app.asar')}"`, {
      cwd: rootDir,
      stdio: 'inherit'
    });
    // Remove the unpacked resources/app directory
    fs.rmSync(appResourcesDir, { recursive: true });
  } catch (e) {
    console.log('asar not available, keeping unpacked resources');
    // Rename appResourcesDir to be directly under resources
    try {
      fs.renameSync(appResourcesDir, path.join(resourcesDir, 'app'));
    } catch (renameErr) {
      console.log('Could not rename:', renameErr.message);
    }
  }

  // Copy node_modules (only production deps)
  console.log('Copying node_modules...');
  const prodModules = path.join(appResourcesDir, 'node_modules');
  if (!fs.existsSync(prodModules)) {
    fs.mkdirSync(prodModules, { recursive: true });
  }
  
  // Simple copy of required modules
  const needed = ['sql.js', 'react', 'react-dom', 'scheduler', 'loose-envify', 'js-tokens'];
  for (const mod of needed) {
    const src = path.join(rootDir, 'node_modules', mod);
    if (fs.existsSync(src)) {
      copyDirSync(src, path.join(prodModules, mod));
    }
  }
}

// Create a README
const readme = `Fortress Vault v1.0.0 - Portable Edition

To run: double-click on fortress-vault.exe (or electron.exe in the root)

IMPORTANT:
- This is a portable build. For the full installer, rebuild with:
    npm run build:win
  (Requires Administrator privileges on Windows for NSIS signing tools)
`;

try {
  fs.writeFileSync(path.join(releaseDir, 'README.txt'), readme);
  console.log('\n✅ Build complete!');
  console.log(`   App directory: ${appDir}`);
  console.log('\n   To create the NSIS installer, run this terminal as Administrator and execute:');
  console.log('   npm run build:win');
} catch (e) {
  console.log('\nBuild process:', e.message);
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
