import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, '../node_modules/@biosensesignal/web-sdk/dist');
const destDir = path.join(__dirname, '../public');

// Files to ignore (from webpack config in sample)
const ignorePatterns = [
  'main.js',
  'main.d.ts',
  'main.js.LICENSE.txt',
  // Ignore TypeScript definition files
  '**/*.d.ts',
];

function shouldIgnore(file) {
  const relativePath = path.relative(sourceDir, file);
  return ignorePatterns.some(pattern => {
    if (pattern.includes('**')) {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*'));
      return regex.test(relativePath);
    }
    return relativePath === pattern || relativePath.endsWith(pattern);
  });
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (shouldIgnore(srcPath)) {
      console.log(`Ignoring: ${entry.name}`);
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${entry.name}`);
    }
  }
}

try {
  console.log('Copying BiosenseSignal SDK files...');
  console.log(`From: ${sourceDir}`);
  console.log(`To: ${destDir}`);
  
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    console.error('Please run "pnpm install" first.');
    process.exit(1);
  }

  copyDirectory(sourceDir, destDir);
  console.log('✅ Successfully copied SDK files to public directory!');
} catch (error) {
  console.error('❌ Error copying SDK files:', error);
  process.exit(1);
}
