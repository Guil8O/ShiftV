#!/usr/bin/env node
/**
 * Dual-boot guard: ensures node_modules binaries match the current OS.
 *
 * Dual-booting Windows/Linux on a shared NTFS partition means node_modules
 * installed on one OS contains OS-specific binaries (esbuild, vite, etc.)
 * that won't run on the other. This script detects the mismatch and
 * re-runs `npm install` automatically before dev/build tasks.
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const isWindows = process.platform === 'win32';

/**
 * On Windows, npm writes .cmd wrappers for every bin entry.
 * On Linux/macOS, npm writes plain symlinks (no .cmd).
 * We use vite.cmd presence as the platform marker.
 */
const MARKER_WINDOWS = join(ROOT, 'node_modules', '.bin', 'vite.cmd');
const MARKER_UNIX    = join(ROOT, 'node_modules', '.bin', 'vite');

const nodeModulesExist = existsSync(join(ROOT, 'node_modules'));
const windowsMarkerOk  = existsSync(MARKER_WINDOWS);
const unixMarkerOk     = existsSync(MARKER_UNIX);

let needsInstall = false;

if (!nodeModulesExist) {
  console.log('[check-platform] node_modules not found → installing...');
  needsInstall = true;
} else if (isWindows && !windowsMarkerOk) {
  console.log('[check-platform] node_modules was installed on Linux — reinstalling for Windows...');
  needsInstall = true;
} else if (!isWindows && !unixMarkerOk) {
  console.log('[check-platform] node_modules was installed on Windows — reinstalling for Linux...');
  needsInstall = true;
}

if (needsInstall) {
  try {
    execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
    console.log('[check-platform] npm install complete.');
  } catch (e) {
    console.error('[check-platform] npm install failed:', e.message);
    process.exit(1);
  }
} else {
  const platform = isWindows ? 'Windows' : 'Linux/macOS';
  console.log(`[check-platform] node_modules OK for ${platform}.`);
}
