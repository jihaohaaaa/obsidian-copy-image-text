import { execFile as execFileCallback, spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFileCallback);

const targetVersion = process.argv[2];

if (!targetVersion || !/^\d+\.\d+\.\d+$/.test(targetVersion)) {
  console.error('Usage: pnpm run release:github <x.y.z>');
  process.exit(1);
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });
  });
}

async function output(command: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(command, args, { encoding: 'utf8' });
  return stdout.trim();
}

type PackageJson = {
  repository?: {
    url?: string;
  };
};

async function main(): Promise<void> {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as PackageJson;
  const repo = packageJson.repository?.url
    ?.replace(/^git\+https:\/\/github\.com\//, '')
    .replace(/\.git$/, '');

  if (!repo) {
    console.error('Unable to determine GitHub repo from package.json repository.url');
    process.exit(1);
  }

  const status = await output('git', ['status', '--short']);
  if (status) {
    console.error('Release requires a clean git worktree. Commit or stash changes first.');
    console.error(status);
    process.exit(1);
  }

  await run('pnpm', ['run', 'version:bump', targetVersion]);
  await run('pnpm', ['install', '--lockfile-only', '--ignore-scripts']);
  await run('pnpm', ['run', 'build']);

  for (const asset of ['main.js', 'manifest.json']) {
    try {
      await access(asset);
    } catch {
      console.error(`Missing release asset: ${asset}`);
      process.exit(1);
    }
  }

  const currentBranch = await output('git', ['branch', '--show-current']);

  await run('git', [
    'add',
    'README-EN.md',
    'README.md',
    'manifest.json',
    'pnpm-lock.yaml',
    'package.json',
    'versions.json'
  ]);
  await run('git', ['commit', '-m', `Release ${targetVersion}`]);
  await run('git', ['push', 'origin', currentBranch]);

  await run('gh', [
    'release',
    'create',
    targetVersion,
    'main.js',
    'manifest.json',
    '--repo',
    repo,
    '--target',
    currentBranch,
    '--title',
    targetVersion,
    '--notes',
    `Release ${targetVersion} for Obsidian/BRAT installation.\n\nAssets included:\n- main.js\n- manifest.json`
  ]);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
