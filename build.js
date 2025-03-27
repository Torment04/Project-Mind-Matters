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
    
    // Store original links for debugging
    const originalLinks = [];
    const linkRegex = /href="[^"]+"/g;
    let match;
    while ((match = linkRegex.exec(originalContent)) !== null) {
      originalLinks.push(match[0]);
    }
    
    // Fix links for images and css - these can be safely updated
    content = content.replace(/href="\.\.\/css\//g, 'href="/css/');
    content = content.replace(/src="\.\.\/images\//g, 'src="/images/');
    
    // For pages in the pages directory, update navigation links
    if (filePath.includes('public/pages/')) {
      // First, handle relative links without path (like "about.html")
      content = content.replace(/href="([^\/\.]+)\.html"/g, 'href="/$1.html"');
      
      // Handle index.html specifically
      content = content.replace(/href="index\.html"/g, 'href="/"');
      
      // Fix links to other pages in the same directory (don't convert to clean URLs)
      content = content.replace(/href="pages\/([^"]+)\.html"/g, 'href="/$1.html"');
      
      // Handle absolute paths to pages directory
      content = content.replace(/href="\/pages\/([^"]+)\.html"/g, 'href="/$1.html"');
      
      // Fix active link class for current page
      const pageName = path.basename(filePath, '.html');
      if (pageName === 'index') {
        content = content.replace('href="/"', 'href="/" class="active"');
      } else {
        content = content.replace(`href="/${pageName}.html"`, `href="/${pageName}.html" class="active"`);
      }
    }
    
    // Save a debug file if changes were made
    if (content !== originalContent) {
      const debugDir = path.join('public', 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      // Find modified links for debugging
      const modifiedLinks = [];
      while ((match = linkRegex.exec(content)) !== null) {
        modifiedLinks.push(match[0]);
      }
      
      const debugInfo = {
        filePath,
        originalLinks,
        modifiedLinks,
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
      
      // Create an HTML debug view as well
      const htmlDebug = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Debug Info for ${path.basename(filePath)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .container { max-width: 1200px; margin: 0 auto; }
    .file-path { background: #f5f5f5; padding: 10px; border-radius: 5px; }
    .links-section { margin: 20px 0; }
    .link-item { margin: 5px 0; padding: 5px; border-left: 3px solid #ccc; }
    .original { border-left-color: #ff9800; }
    .modified { border-left-color: #4caf50; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Debug Information</h1>
    <h2>File: <span class="file-path">${filePath}</span></h2>
    
    <div class="links-section">
      <h3>Link Transformations</h3>
      <table>
        <tr>
          <th>Original Link</th>
          <th>Modified Link</th>
        </tr>
        ${originalLinks.map((link, i) => `
          <tr>
            <td class="original">${link}</td>
            <td class="modified">${modifiedLinks[i] || 'No match'}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  </div>
</body>
</html>
      `;
      
      fs.writeFileSync(
        path.join(debugDir, `${path.basename(filePath, '.html')}_debug.html`),
        htmlDebug
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

// Function to create a site map file
function createSiteMap() {
  const baseUrl = 'https://project-mind-matters.vercel.app';
  const pages = [
    { path: '/', name: 'Home' },
    { path: '/about.html', name: 'About' },
    { path: '/blog.html', name: 'Blog' },
    { path: '/contact.html', name: 'Contact' },
    { path: '/events.html', name: 'Events' },
    { path: '/team.html', name: 'Team' },
    { path: '/testimonials.html', name: 'Testimonials' }
  ];
  
  let sitemapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Site Map - Project Mind Matters</title>
  <style>
    body {
      font-family: 'Poppins', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #9c27b0;
      border-bottom: 2px solid #9c27b0;
      padding-bottom: 10px;
    }
    .site-map {
      margin: 20px 0;
    }
    .site-map a {
      display: block;
      padding: 8px 0;
      color: #9c27b0;
      text-decoration: none;
      border-bottom: 1px solid #eee;
    }
    .site-map a:hover {
      background-color: #f9f0ff;
    }
    .back-btn {
      display: inline-block;
      margin-top: 20px;
      padding: 8px 16px;
      background-color: #9c27b0;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    .back-btn:hover {
      background-color: #7b1fa2;
    }
  </style>
</head>
<body>
  <h1>Project Mind Matters - Site Map</h1>
  <div class="site-map">
    ${pages.map(page => `<a href="${page.path}">${page.name}</a>`).join('\n    ')}
  </div>
  <a href="/" class="back-btn">Back to Home</a>
</body>
</html>
  `;
  
  fs.writeFileSync(path.join('public', 'sitemap.html'), sitemapHtml);
  console.log('Created site map at /sitemap.html');
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
      line-height: 1.6;
    }
    h1 {
      color: #9c27b0;
      margin-bottom: 20px;
      font-size: 36px;
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
    .error-code {
      display: inline-block;
      background-color: #f1e5f9;
      color: #9c27b0;
      padding: 10px 20px;
      border-radius: 30px;
      font-weight: bold;
      margin-bottom: 30px;
    }
    .navigation {
      margin-top: 40px;
      padding: 20px;
      border-top: 1px solid #eee;
    }
    .navigation a {
      display: inline-block;
      margin: 0 10px;
      padding: 8px 16px;
      background-color: #9c27b0;
      color: white;
      border-radius: 4px;
      transition: background-color 0.3s;
    }
    .navigation a:hover {
      background-color: #7b1fa2;
      text-decoration: none;
    }
    .countdown {
      font-size: 16px;
      color: #666;
      margin-top: 20px;
    }
  </style>
  <script>
    // Countdown timer
    window.onload = function() {
      let seconds = 5;
      const countdownElement = document.getElementById('countdown');
      
      const interval = setInterval(function() {
        seconds--;
        countdownElement.textContent = seconds;
        
        if (seconds <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    };
  </script>
</head>
<body>
  <div class="container">
    <span class="error-code">404</span>
    <h1>Page Not Found</h1>
    <p>Sorry, the page you are looking for does not exist or has been moved.</p>
    <p>You will be redirected to the homepage in <span id="countdown">5</span> seconds.</p>
    
    <div class="navigation">
      <a href="/">Home</a>
      <a href="/about.html">About Us</a>
      <a href="/blog.html">Blog</a>
      <a href="/sitemap.html">Site Map</a>
    </div>
  </div>
</body>
</html>
`;
fs.writeFileSync(path.join('public', '404.html'), notFoundPage);
console.log('Created custom 404 page');

// Create site map
createSiteMap();

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

// Create a debug index page
const debugIndexContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Debug Information - Project Mind Matters</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #9c27b0;
      border-bottom: 2px solid #9c27b0;
      padding-bottom: 10px;
    }
    .summary {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .files-list {
      list-style-type: none;
      padding: 0;
    }
    .files-list li {
      margin-bottom: 10px;
      padding: 10px;
      background-color: #f1e5f9;
      border-radius: 4px;
    }
    .files-list a {
      color: #9c27b0;
      text-decoration: none;
      font-weight: bold;
    }
    .files-list a:hover {
      text-decoration: underline;
    }
    .back-btn {
      display: inline-block;
      margin-top: 20px;
      padding: 8px 16px;
      background-color: #9c27b0;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    .back-btn:hover {
      background-color: #7b1fa2;
    }
  </style>
</head>
<body>
  <h1>Project Mind Matters - Debug Information</h1>
  
  <div class="summary">
    <h2>Site Summary</h2>
    <p>This page provides diagnostic information about the Project Mind Matters website deployment.</p>
    <p>The following debug files contain information about how HTML links were processed during the build.</p>
  </div>

  <h2>Debug Files</h2>
  <ul class="files-list" id="debug-files">
    <li>Loading debug files...</li>
  </ul>

  <a href="/" class="back-btn">Back to Home</a>

  <script>
    // This would normally list files, but in a static site we'll just show a message
    document.getElementById('debug-files').innerHTML = '<li>Debug files are available in the /debug directory.</li>';
  </script>
</body>
</html>
`;

const debugDir = path.join('public', 'debug');
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
}
fs.writeFileSync(path.join(debugDir, 'index.html'), debugIndexContent);
console.log('Created debug index page at /debug/index.html');

console.log('Build completed successfully!'); 