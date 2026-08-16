/**
 * Open a cloned GFF editor tab from a live UTx template tab.
 *
 * @file openTabAsGff.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { EditorFile } from "@/apps/forge/EditorFile";
import { tabCanOpenAsGff } from "@/apps/forge/commands/editorCommandGuards";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabGFFEditorState } from "@/apps/forge/states/tabs/TabGFFEditorState";
import { TabState } from "@/apps/forge/states/tabs/TabState";

interface BlueprintExportTab extends TabState {
  blueprint?: { getExportBuffer: () => Uint8Array };
}

export async function openTabAsGffEditor(tab: TabState | undefined): Promise<void> {
  if (!tab || !tabCanOpenAsGff(tab) || !tab.file) {
    return;
  }
  tab.updateFile();
  const ext = String(tab.file.ext || "").toLowerCase().replace(/^\./, "");
  let bytes = await tab.getExportBuffer(tab.file.resref, ext);
  const blueprint = (tab as BlueprintExportTab).blueprint;
  if ((!bytes || !bytes.length) && blueprint && typeof blueprint.getExportBuffer === "function") {
    bytes = blueprint.getExportBuffer();
  }
  const clone = EditorFile.From(tab.file);
  clone.buffer = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new Uint8Array(0);
  ForgeState.tabManager.addTab(new TabGFFEditorState({ editorFile: clone }));
}
