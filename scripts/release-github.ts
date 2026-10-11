import { access, readFile } from 'node:fs/promises';
import { execa } from 'execa';

const targetVersion = process.argv[2];

if (!targetVersion || !/^\d+\.\d+\.\d+$/.test(targetVersion)) {
  console.error('Usage: pnpm run release:github <x.y.z>');
  process.exit(1);
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

  const { stdout: status } = await execa('git', ['status', '--short']);
  if (status.trim()) {
    console.error('Release requires a clean git worktree. Commit or stash changes first.');
    console.error(status);
    process.exit(1);
  }

  await execa('pnpm', ['run', 'version:bump', targetVersion], { stdio: 'inherit' });
  await execa('pnpm', ['install', '--lockfile-only', '--ignore-scripts'], { stdio: 'inherit' });
  await execa('pnpm', ['run', 'build'], { stdio: 'inherit' });

  for (const asset of ['main.js', 'manifest.json']) {
    try {
      await access(asset);
    } catch {
      console.error(`Missing release asset: ${asset}`);
      process.exit(1);
    }
  }

  const { stdout: currentBranch } = await execa('git', ['branch', '--show-current']);

  await execa(
    'git',
    [
      'add',
      'README-EN.md',
      'README.md',
      'manifest.json',
      'pnpm-lock.yaml',
      'package.json',
      'versions.json'
    ],
    { stdio: 'inherit' }
  );
  await execa('git', ['commit', '-m', `Release ${targetVersion}`], { stdio: 'inherit' });
  await execa('git', ['push', 'origin', currentBranch.trim()], { stdio: 'inherit' });

  await execa(
    'gh',
    [
      'release',
      'create',
      targetVersion,
      'main.js',
      'manifest.json',
      '--repo',
      repo,
      '--target',
      currentBranch.trim(),
      '--title',
      targetVersion,
      '--notes',
      `Release ${targetVersion} for Obsidian/BRAT installation.\n\nAssets included:\n- main.js\n- manifest.json`
    ],
    { stdio: 'inherit' }
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
