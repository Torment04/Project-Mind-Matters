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
    
    // Fix links in navigation - convert "about.html" to "/about"
    content = content.replace(/href="([^\/][^"]+)\.html"/g, 'href="/$1"');
    
    // Fix links that point to pages/file.html to just /file
    content = content.replace(/href="pages\/([^"]+)\.html"/g, 'href="/$1"');
    
    // Fix links for images and css
    content = content.replace(/href="\.\.\/css\//g, 'href="/css/');
    content = content.replace(/src="\.\.\/images\//g, 'src="/images/');
    
    // Fix active link class for current page
    const pageName = path.basename(filePath, '.html');
    if (pageName === 'index') {
      content = content.replace('href="/"', 'href="/" class="active"');
    } else {
      content = content.replace(`href="/${pageName}"`, `href="/${pageName}" class="active"`);
    }
    
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

// Create a file that redirects from /pages to the root
const pagesRedirect = `
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=/" />
</head>
<body>
  Redirecting to home page...
</body>
</html>
`;
fs.mkdirSync(path.join('public', 'pages'), { recursive: true });
fs.writeFileSync(path.join('public', 'pages', 'index.html'), pagesRedirect);
console.log('Created redirect for /pages path');

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