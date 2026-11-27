import * as path from 'path';

/** Absolute path to the repository root (Jest cwd). */
export const REPO_ROOT = path.resolve(process.cwd());

/** Absolute path to the repo `src/` directory. */
export const SRC_ROOT = path.join(REPO_ROOT, 'src');

/** Resolve a path under `src/`. */
export function srcPath(...segments: string[]): string {
  return path.join(SRC_ROOT, ...segments);
}
