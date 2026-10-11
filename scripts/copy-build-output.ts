import { copyFile } from 'node:fs/promises';

async function main(): Promise<void> {
  const outputFile = 'dist/main.js';

  try {
    await copyFile(outputFile, 'main.js');
    console.log('Copied dist/main.js to main.js');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Missing ${outputFile}. Run vite build first.`);
      process.exit(1);
    }
    throw error;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
