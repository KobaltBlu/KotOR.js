/**
 * List a game-relative directory, or [] when the folder is missing.
 *
 * @file listDirectoryOrEmpty.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export async function listDirectoryOrEmpty(
  readdir: (relativePath: string) => Promise<string[]>,
  relativePath: string
): Promise<string[]> {
  try {
    const entries = await readdir(relativePath);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}
