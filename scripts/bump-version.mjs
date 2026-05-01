import { readFileSync, writeFileSync } from 'node:fs';

const targetVersion = process.argv[2];

if (!targetVersion || !/^\d+\.\d+\.\d+$/.test(targetVersion)) {
  console.error('Usage: node scripts/bump-version.mjs <x.y.z>');
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value, indent = 2) {
  writeFileSync(path, `${JSON.stringify(value, null, indent)}\n`);
}

const packageJson = readJson('package.json');
packageJson.version = targetVersion;
writeJson('package.json', packageJson);

const manifest = readJson('manifest.json');
manifest.version = targetVersion;
writeJson('manifest.json', manifest);

const versions = readJson('versions.json');
versions[targetVersion] = manifest.minAppVersion;
writeJson('versions.json', versions);

const readme = readFileSync('README.md', 'utf8').replace(
  /(当前版本: )\d+\.\d+\.\d+/,
  `$1${targetVersion}`
);
writeFileSync('README.md', readme);

const readmeEn = readFileSync('README-EN.md', 'utf8').replace(
  /(Current version: )\d+\.\d+\.\d+/,
  `$1${targetVersion}`
);
writeFileSync('README-EN.md', readmeEn);

console.log(`Updated plugin version to ${targetVersion}`);
