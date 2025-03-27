const fs = require('fs');
const path = require('path');

// Function to copy a file
function copyFile(source, target) {
  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.copyFileSync(source, target);
  console.log(`Copied: ${source} -> ${target}`);
}

// Function to fix HTML links in copied files
function fixHtmlLinks(filePath) {
  if (!filePath.endsWith('.html')) return;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace relative navigation links
    content = content.replace(/href="([^\/][^"]+)\.html"/g, 'href="/$1"');
    
    // Fix paths to css and images
    content = content.replace(/href="\.\.\/css\//g, 'href="/css/');
    content = content.replace(/src="\.\.\/images\//g, 'src="/images/');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed links in: ${filePath}`);
  } catch (error) {
    console.error(`Error fixing links in ${filePath}:`, error);
  }
}

// Function to copy a directory
function copyDir(source, target) {
  // Create the target directory if it doesn't exist
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  // Get all files and subdirectories in the source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  // Process each entry
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDir(sourcePath, targetPath);
    } else {
      // Copy files
      copyFile(sourcePath, targetPath);
      
      // Fix HTML links if it's an HTML file
      if (entry.name.endsWith('.html')) {
        fixHtmlLinks(targetPath);
      }
    }
  }
}

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
  console.log('Created public directory');
}

// Copy index.html to public directory
if (fs.existsSync('index.html')) {
  copyFile('index.html', path.join('public', 'index.html'));
}

// Copy directories to public
const dirsToCopy = ['pages', 'css', 'images'];
for (const dir of dirsToCopy) {
  if (fs.existsSync(dir)) {
    copyDir(dir, path.join('public', dir));
    console.log(`Copied directory: ${dir} -> public/${dir}`);
    
    // Fix HTML links in all HTML files in the directory
    if (dir === 'pages') {
      const htmlFiles = fs.readdirSync(path.join('public', dir))
        .filter(file => file.endsWith('.html'))
        .map(file => path.join('public', dir, file));
      
      htmlFiles.forEach(fixHtmlLinks);
    }
  } else {
    console.log(`Warning: Directory ${dir} not found, skipping.`);
  }
}

console.log('Build completed successfully!'); 