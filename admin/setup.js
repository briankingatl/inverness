const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nodeModulesPath = path.join(__dirname, 'node_modules');

if (fs.existsSync(nodeModulesPath)) {
  console.log('node_modules/ already exists — nothing to do.');
  console.log('If you need to update dependencies, run: npm install');
} else {
  console.log('node_modules/ not found. Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('\nSetup complete! You can now run: npm start');
  } catch (err) {
    console.error('\nSetup failed. Please run "npm install" manually.');
    process.exit(1);
  }
}
