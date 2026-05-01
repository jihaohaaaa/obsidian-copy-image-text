import { readFileSync, writeFileSync } from 'node:fs';

const targetVersion = process.argv[2];

if (!targetVersion || !/^\d+\.\d+\.\d+$/.test(targetVersion)) {
  console.error('Usage: npm run version:bump -- <x.y.z>');
  process.exit(1);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeJson(path: string, value: unknown, indent = 2): void {
  writeFileSync(path, `${JSON.stringify(value, null, indent)}\n`);
}

type PackageJson = {
  version: string;
};

type ManifestJson = {
  version: string;
  minAppVersion: string;
};

type VersionsJson = Record<string, string>;

const packageJson = readJson<PackageJson>('package.json');
packageJson.version = targetVersion;
writeJson('package.json', packageJson);

const manifest = readJson<ManifestJson>('manifest.json');
manifest.version = targetVersion;
writeJson('manifest.json', manifest);

const versions = readJson<VersionsJson>('versions.json');
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
