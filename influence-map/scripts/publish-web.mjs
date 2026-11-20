#!/usr/bin/env node
// Builds the public site and publishes it to the gh-pages branch of a separate, public
// repository that holds only the built site (leo23lh/INFLUENCE-MAP), which GitHub Pages serves
// at https://leo23lh.github.io/INFLUENCE-MAP/. The source repository can then stay private.
// PAGES_REPO=<git url> publishes somewhere else. The session must have push access to it.
//   npm run publish:web            build, then push if anything changed
//   npm run publish:web -- --dry   build and show what would change, push nothing
// See CLAUDE.md "Public site".
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './lib/load.mjs';

const dry = process.argv.includes('--dry');
const BRANCH = 'gh-pages';
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts }).trim();
const repo = join(ROOT, '..');
const remote = process.env.PAGES_REPO ?? 'https://github.com/leo23lh/INFLUENCE-MAP';

execFileSync('node', [join(ROOT, 'scripts', 'build-web.mjs')], { stdio: 'inherit' });

const tmp = mkdtempSync(join(tmpdir(), 'influence-map-pages-'));
const git = (...a) => run('git', ['-C', tmp, ...a]);
try {
  // Start from the branch as published, so each publish is one commit on top of the last.
  const exists = run('git', ['ls-remote', '--heads', remote, BRANCH]) !== '';
  if (exists) run('git', ['clone', '--quiet', '--depth', '1', '--branch', BRANCH, remote, tmp]);
  else {
    git('init', '--quiet', '-b', BRANCH);
    git('remote', 'add', 'origin', remote);
  }
  for (const f of readdirSync(tmp)) if (f !== '.git') rmSync(join(tmp, f), { recursive: true, force: true });
  cpSync(join(ROOT, 'dist-web'), tmp, { recursive: true });
  git('add', '--all');
  const changes = git('status', '--porcelain');
  if (!changes) {
    console.log('The public site is already up to date.');
  } else {
    console.log(`${changes.split('\n').length} files changed.`);
    if (dry) console.log('Dry run: nothing pushed.');
    else {
      git('-c', `user.name=${run('git', ['-C', repo, 'config', 'user.name'])}`, '-c', `user.email=${run('git', ['-C', repo, 'config', 'user.email'])}`, 'commit', '--quiet', '-m', `Publish the public site (${new Date().toISOString().slice(0, 10)})`);
      git('push', '--quiet', 'origin', `HEAD:${BRANCH}`);
      console.log(`Pushed to ${BRANCH}. GitHub Pages updates in a minute or two.`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
