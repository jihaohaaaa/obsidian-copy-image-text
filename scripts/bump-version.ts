import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const targetVersion = process.argv[2];

if (!targetVersion || !/^\d+\.\d+\.\d+$/.test(targetVersion)) {
  console.error('Usage: pnpm run version:bump <x.y.z>');
  process.exit(1);
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });
  });
}

async function readJson<T>(path: string): Promise<T> {
  const content = await readFile(path, 'utf8');
  return JSON.parse(content) as T;
}

async function writeJson(path: string, value: unknown, indent = 2): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, indent)}\n`);
}

type PackageJson = {
  version: string;
};

type ManifestJson = {
  version: string;
  minAppVersion: string;
};

type VersionsJson = Record<string, string>;

async function main(): Promise<void> {
  const packageJson = await readJson<PackageJson>('package.json');
  packageJson.version = targetVersion;
  await writeJson('package.json', packageJson);

  const manifest = await readJson<ManifestJson>('manifest.json');
  manifest.version = targetVersion;
  await writeJson('manifest.json', manifest);

  const versions = await readJson<VersionsJson>('versions.json');
  versions[targetVersion] = manifest.minAppVersion;
  await writeJson('versions.json', versions);

  const readme = (await readFile('README.md', 'utf8')).replace(
    /(当前版本: )\d+\.\d+\.\d+/,
    `$1${targetVersion}`
  );
  await writeFile('README.md', readme);

  const readmeEn = (await readFile('README-EN.md', 'utf8')).replace(
    /(Current version: )\d+\.\d+\.\d+/,
    `$1${targetVersion}`
  );
  await writeFile('README-EN.md', readmeEn);

  await runCommand('pnpm', ['format']);

  console.log(`Updated plugin version to ${targetVersion}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
