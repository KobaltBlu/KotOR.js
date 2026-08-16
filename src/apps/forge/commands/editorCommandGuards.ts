/**
 * Enablement helpers for workbench commands that act on the current editor tab.
 *
 * @file editorCommandGuards.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export const UTX_TEMPLATE_EXTENSIONS = [
  "utc",
  "utd",
  "ute",
  "uti",
  "utm",
  "utp",
  "uts",
  "utt",
  "utw",
] as const;

export const UTX_TAB_TYPES = [
  "TabUTCEditorState",
  "TabUTDEditorState",
  "TabUTEEditorState",
  "TabUTIEditorState",
  "TabUTMEditorState",
  "TabUTPEditorState",
  "TabUTSEditorState",
  "TabUTTEditorState",
  "TabUTWEditorState",
] as const;

export function tabCanCompile(tab: { canCompile?: boolean } | null | undefined): boolean {
  return !!tab && tab.canCompile === true;
}

export function tabCanSave(tab: { file?: unknown } | null | undefined): boolean {
  return !!tab?.file;
}

export function tabCanOpenAsGff(tab: { type?: string; file?: { ext?: string } } | null | undefined): boolean {
  if (!tab) {
    return false;
  }
  const ext = String(tab.file?.ext || "").toLowerCase().replace(/^\./, "");
  if ((UTX_TEMPLATE_EXTENSIONS as readonly string[]).indexOf(ext) >= 0) {
    return true;
  }
  return (UTX_TAB_TYPES as readonly string[]).indexOf(String(tab.type || "")) >= 0;
}
