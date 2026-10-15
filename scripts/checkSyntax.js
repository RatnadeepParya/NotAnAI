/**
 * Not an AI — JavaScript Syntax & Static Integrity Checker
 * Recursively validates the syntax of every JavaScript source file using `node --check`.
 * Cross-platform and zero-dependency.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TARGET_DIRECTORIES = ['src', 'config', 'scripts', 'tests', 'public/js'];
const ROOT_FILES = ['app.js'];

function collectJsFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git') {
        results = results.concat(collectJsFiles(fullPath));
      }
    } else if (item.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  console.log('========================================================');
  console.log('  Not an AI — Static Syntax & Code Integrity Validator  ');
  console.log('========================================================');

  let filesToCheck = [];
  for (const rootFile of ROOT_FILES) {
    const full = path.join(process.cwd(), rootFile);
    if (fs.existsSync(full)) {
      filesToCheck.push(full);
    }
  }

  for (const targetDir of TARGET_DIRECTORIES) {
    const fullDir = path.join(process.cwd(), targetDir);
    filesToCheck = filesToCheck.concat(collectJsFiles(fullDir));
  }

  console.log(`Checking syntax of ${filesToCheck.length} JavaScript files...\n`);

  let errorCount = 0;
  for (const file of filesToCheck) {
    const relative = path.relative(process.cwd(), file);
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
      process.stdout.write(`  \x1b[32m✔\x1b[0m ${relative}\n`);
    } catch (err) {
      errorCount++;
      process.stderr.write(`  \x1b[31m✖\x1b[0m ${relative}\n`);
      if (err.stderr) {
        process.stderr.write(`    ${err.stderr.toString().trim()}\n`);
      }
    }
  }

  console.log('\n========================================================');
  if (errorCount === 0) {
    console.log(`  \x1b[32m✔ All ${filesToCheck.length} JavaScript files passed syntax validation.\x1b[0m`);
    console.log('========================================================\n');
    process.exit(0);
  } else {
    console.error(`  \x1b[31m✖ ${errorCount} file(s) failed syntax validation.\x1b[0m`);
    console.log('========================================================\n');
    process.exit(1);
  }
}

main();
