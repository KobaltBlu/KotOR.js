/**
 * Host hooks so NSS language providers stay free of ForgeState import cycles.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssLanguageHost.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";

export interface NssEditorTabLike {
  file?: { resref?: string; ext?: string; path?: string };
  code: string;
  resolvedIncludes: Map<string, string>;
  editor?: monacoEditor.editor.IStandaloneCodeEditor;
  show(): void;
}

export interface ProjectNssFile {
  path: string;
  resref: string;
  text: string;
}

export interface NssLanguageHost {
  getEngineTypes(): Array<{ name: string; index: number }>;
  findTabForModel(model: monacoEditor.editor.ITextModel): NssEditorTabLike | undefined;
  listNssTabs(): NssEditorTabLike[];
  listProjectNss(): Promise<ProjectNssFile[]>;
  openNss(resref: string, buffer?: Uint8Array): void;
  getNwscriptBuffer(): Uint8Array | undefined;
  loadNssBuffer?(resref: string): Promise<Uint8Array | undefined>;
  writeProjectFile?(path: string, text: string): Promise<boolean>;
  resolveIncludes?(text: string): Promise<Map<string, string>>;
}
