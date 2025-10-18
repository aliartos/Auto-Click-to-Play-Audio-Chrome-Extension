const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration
const BUILD_DIR = 'dist';
const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

// Files to include in build
const FILES_TO_COPY = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'styles.css',
  'README.md',
  'icon16.png',
  'icon48.png',
  'icon128.png'
];

console.log('🚀 Building Auto Click to Play Audio extension...\n');

// Clean previous build
if (fs.existsSync(BUILD_DIR)) {
  console.log('🧹 Cleaning previous build...');
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}

// Create build directory
console.log('📁 Creating build directory...');
fs.mkdirSync(BUILD_DIR, { recursive: true });

// Copy files
console.log('📋 Copying files...');
FILES_TO_COPY.forEach(file => {
  const srcPath = path.join(__dirname, file);
  const destPath = path.join(__dirname, BUILD_DIR, file);
  
  if (fs.existsSync(srcPath)) {
    let content = fs.readFileSync(srcPath, 'utf8');
    
    // Remove console logs in production
    if (isProduction && (file.endsWith('.js'))) {
      console.log(`🔇 Removing debug logs from ${file}...`);
      content = content
        .replace(/console\.log\([^)]*\);?\n?/g, '')
        .replace(/console\.warn\([^)]*\);?\n?/g, '')
        .replace(/console\.error\([^)]*\);?\n?/g, '');
    }
    
    fs.writeFileSync(destPath, content);
    console.log(`   ✓ ${file}`);
  } else {
    console.log(`   ⚠️  ${file} not found, skipping...`);
  }
});

// Read version from manifest
const manifest = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, 'manifest.json'), 'utf8'));
const version = manifest.version;

// Create ZIP archive
const zipName = `auto-click-audio-v${version}.zip`;
const zipPath = path.join(BUILD_DIR, zipName);

console.log('\n📦 Creating ZIP archive...');

const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`\n✅ Build complete!`);
  console.log(`📦 Package: ${zipPath} (${sizeMB} MB)`);
  console.log(`📁 Build directory: ${BUILD_DIR}/\n`);
  
  console.log('To test the build:');
  console.log('1. Go to chrome://extensions/');
  console.log('2. Enable "Developer mode"');
  console.log(`3. Click "Load unpacked" and select the "${BUILD_DIR}" directory\n`);
  
  console.log('To publish:');
  console.log(`1. Upload "${zipPath}" to Chrome Web Store`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add all files from dist except the zip itself
FILES_TO_COPY.forEach(file => {
  const filePath = path.join(BUILD_DIR, file);
  if (fs.existsSync(filePath)) {
    archive.file(filePath, { name: file });
  }
});

archive.finalize();
