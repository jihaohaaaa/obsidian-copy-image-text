import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const vaultPath = process.argv[2] || process.env.OBSIDIAN_VAULT_PATH;

if (!vaultPath) {
  console.error('Usage: pnpm run install:local <vault-path>');
  process.exit(1);
}

type ManifestJson = {
  id: string;
  version: string;
};

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8')) as ManifestJson;
  const pluginDir = resolve(vaultPath as string, '.obsidian', 'plugins', manifest.id);

  await mkdir(pluginDir, { recursive: true });

  const requiredAssets = ['main.js', 'manifest.json'];
  for (const asset of requiredAssets) {
    try {
      await copyFile(asset, resolve(pluginDir, asset));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error(`Missing ${asset}. Run pnpm run build first.`);
        process.exit(1);
      }
      throw error;
    }
  }

  try {
    await copyFile('styles.css', resolve(pluginDir, 'styles.css'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  console.log(`Installed ${manifest.id} ${manifest.version} to ${pluginDir}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
