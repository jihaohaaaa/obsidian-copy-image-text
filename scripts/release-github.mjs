import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const targetVersion = process.argv[2];

if (!targetVersion || !/^\d+\.\d+\.\d+$/.test(targetVersion)) {
  console.error('Usage: npm run release:github -- <x.y.z>');
  process.exit(1);
}

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function output(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const repo = packageJson.repository?.url
  ?.replace(/^git\+https:\/\/github\.com\//, '')
  .replace(/\.git$/, '');

if (!repo) {
  console.error('Unable to determine GitHub repo from package.json repository.url');
  process.exit(1);
}

const status = output('git', ['status', '--short']);
if (status) {
  console.error('Release requires a clean git worktree. Commit or stash changes first.');
  console.error(status);
  process.exit(1);
}

run('node', ['scripts/bump-version.mjs', targetVersion]);
run('npm', ['install', '--package-lock-only', '--include=dev', '--ignore-scripts']);
run('npm', ['run', 'build']);

for (const asset of ['main.js', 'manifest.json']) {
  if (!existsSync(asset)) {
    console.error(`Missing release asset: ${asset}`);
    process.exit(1);
  }
}

run('git', [
  'add',
  'README-EN.md',
  'README.md',
  'manifest.json',
  'package-lock.json',
  'package.json',
  'versions.json'
]);
run('git', ['commit', '-m', `Release ${targetVersion}`]);
run('git', ['push', 'origin', output('git', ['branch', '--show-current'])]);

run('gh', [
  'release',
  'create',
  targetVersion,
  'main.js',
  'manifest.json',
  '--repo',
  repo,
  '--target',
  output('git', ['branch', '--show-current']),
  '--title',
  targetVersion,
  '--notes',
  `Release ${targetVersion} for Obsidian/BRAT installation.\n\nAssets included:\n- main.js\n- manifest.json`
]);
