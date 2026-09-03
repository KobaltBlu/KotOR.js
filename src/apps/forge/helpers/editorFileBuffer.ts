/**
 * Guard restored KEY/BIF EditorFile reads that resolve an empty or missing buffer.
 *
 * @file editorFileBuffer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export function isNonEmptyEditorBuffer(buffer: unknown): buffer is Uint8Array {
  return buffer instanceof Uint8Array && buffer.byteLength > 0;
}
