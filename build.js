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
    const originalContent = content; // Save original for comparison
    
    // Fix links in navigation - convert "about.html" to "/about"
    content = content.replace(/href="([^\/][^"]+)\.html"/g, 'href="/$1"');
    
    // Fix links that point to pages/file.html to just /file
    content = content.replace(/href="pages\/([^"]+)\.html"/g, 'href="/$1"');
    
    // Fix links for images and css
    content = content.replace(/href="\.\.\/css\//g, 'href="/css/');
    content = content.replace(/src="\.\.\/images\//g, 'src="/images/');
    
    // Fix any remaining absolute paths to pages directory
    content = content.replace(/href="\/pages\/([^"]+)\.html"/g, 'href="/$1"');
    
    // Fix active link class for current page
    const pageName = path.basename(filePath, '.html');
    if (pageName === 'index') {
      content = content.replace('href="/"', 'href="/" class="active"');
    } else {
      content = content.replace(`href="/${pageName}"`, `href="/${pageName}" class="active"`);
    }
    
    // Save a debug file if changes were made
    if (content !== originalContent) {
      const debugDir = path.join('public', 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      const debugInfo = {
        filePath,
        changes: []
      };
      
      // Find what patterns were matched and replaced
      if (content.match(/href="\/[^"]+"/g)) {
        debugInfo.changes.push('Found and fixed links');
      }
      
      fs.writeFileSync(
        path.join(debugDir, `${path.basename(filePath, '.html')}_debug.json`),
        JSON.stringify(debugInfo, null, 2)
      );
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
  fixHtmlLinks(path.join('public', 'index.html')); // Also fix links in root index.html
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

// Create a special 404 page that redirects to home
const notFoundPage = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Not Found - Project Mind Matters</title>
  <meta http-equiv="refresh" content="5;url=/" />
  <style>
    body {
      font-family: 'Poppins', sans-serif;
      text-align: center;
      padding: 50px 20px;
      background-color: #f8f9fa;
      color: #333;
    }
    h1 {
      color: #9c27b0;
      margin-bottom: 20px;
    }
    p {
      margin-bottom: 20px;
      font-size: 18px;
    }
    a {
      color: #9c27b0;
      text-decoration: none;
      font-weight: bold;
    }
    a:hover {
      text-decoration: underline;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Page Not Found</h1>
    <p>Sorry, the page you are looking for does not exist.</p>
    <p>You will be redirected to the homepage in 5 seconds.</p>
    <p>If you are not redirected automatically, <a href="/">click here</a> to go to the homepage.</p>
  </div>
</body>
</html>
`;
fs.writeFileSync(path.join('public', '404.html'), notFoundPage);
console.log('Created custom 404 page');

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