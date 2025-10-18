const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { minify: minifyJS } = require('terser');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

// Configuration
const BUILD_DIR = 'dist';
const ASSETS_DIR = 'assets';
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
  'README.md'
];

const ASSET_FILES = [
  'icon16.png',
  'icon48.png',
  'icon128.png',
  'yt-sample.png'
];

console.log('🚀 Building Auto Click to Play Audio extension...');
if (isProduction) {
  console.log('🔒 Production mode: Minifying code...\n');
} else {
  console.log('🔧 Development mode\n');
}

// Clean previous build
if (fs.existsSync(BUILD_DIR)) {
  console.log('🧹 Cleaning previous build...');
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}

// Create build directory
console.log('📁 Creating build directory...');
fs.mkdirSync(BUILD_DIR, { recursive: true });

// Async build function
async function build() {
  console.log('📋 Copying and processing files...');

  for (const file of FILES_TO_COPY) {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(__dirname, BUILD_DIR, file);
    
    if (!fs.existsSync(srcPath)) {
      console.log(`   ⚠️  ${file} not found, skipping...`);
      continue;
    }

    let content = fs.readFileSync(srcPath, 'utf8');
    
    // Process based on file type
    if (file.endsWith('.js')) {
      if (isProduction) {
        console.log(`   🔧 Minifying ${file}...`);
        
        // Minify (without removing console logs - let terser handle it)
        const minified = await minifyJS(content, {
          compress: {
            dead_code: true,
            drop_console: true, // Remove console.* calls
            drop_debugger: true,
            conditionals: true,
            evaluate: true,
            booleans: true,
            loops: true,
            unused: true,
            hoist_funs: true,
            keep_fargs: false,
            hoist_vars: false,
            if_return: true,
            join_vars: true,
            side_effects: true
          },
          mangle: {
            toplevel: false // Don't mangle top-level names for Chrome extension compatibility
          },
          format: {
            comments: false
          }
        });
        
        if (minified.code) {
          content = minified.code;
        }
      }
    } else if (file.endsWith('.html') && isProduction) {
      console.log(`   🔨 Minifying ${file}...`);
      content = await minifyHTML(content, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true
      });
    } else if (file.endsWith('.css') && isProduction) {
      console.log(`   🔨 Minifying ${file}...`);
      const result = new CleanCSS({
        level: 2,
        compatibility: 'ie9'
      }).minify(content);
      content = result.styles;
    }
    
    fs.writeFileSync(destPath, content);
    console.log(`   ✓ ${file}`);
  }

  // Copy assets
  console.log('\n🎨 Copying assets...');
  for (const file of ASSET_FILES) {
    const srcPath = path.join(__dirname, ASSETS_DIR, file);
    const destPath = path.join(__dirname, BUILD_DIR, file);
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`   ✓ ${file}`);
    } else {
      console.log(`   ⚠️  ${file} not found in assets/`);
    }
  }

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
    
    if (isProduction) {
      console.log('✨ Production build with minification\n');
    }
    
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
  const files = [...FILES_TO_COPY, ...ASSET_FILES];
  files.forEach(file => {
    const filePath = path.join(BUILD_DIR, path.basename(file));
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: path.basename(file) });
    }
  });

  archive.finalize();
}

// Run the async build
build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
