import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const vaultPath = process.argv[2] || process.env.OBSIDIAN_VAULT_PATH;

if (!vaultPath) {
  console.error('Usage: npm run install:local -- <vault-path>');
  process.exit(1);
}

type ManifestJson = {
  id: string;
  version: string;
};

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8')) as ManifestJson;
const pluginDir = resolve(vaultPath, '.obsidian', 'plugins', manifest.id);

const requiredAssets = ['main.js', 'manifest.json'];
for (const asset of requiredAssets) {
  if (!existsSync(asset)) {
    console.error(`Missing ${asset}. Run npm run build first.`);
    process.exit(1);
  }
}

mkdirSync(pluginDir, { recursive: true });

for (const asset of requiredAssets) {
  copyFileSync(asset, resolve(pluginDir, asset));
}

if (existsSync('styles.css')) {
  copyFileSync('styles.css', resolve(pluginDir, 'styles.css'));
}

console.log(`Installed ${manifest.id} ${manifest.version} to ${pluginDir}`);
