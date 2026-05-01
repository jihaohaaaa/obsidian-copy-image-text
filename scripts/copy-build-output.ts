import { copyFileSync, existsSync } from 'node:fs';

const outputFile = 'dist/main.js';

if (!existsSync(outputFile)) {
  console.error(`Missing ${outputFile}. Run vite build first.`);
  process.exit(1);
}

copyFileSync(outputFile, 'main.js');
console.log('Copied dist/main.js to main.js');
