/**
 * Keep open editor tabs and recents pointed at a project file after explorer rename.
 *
 * @file retargetProjectTabs.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { EditorFile } from "@/apps/forge/EditorFile";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import {
  editorFileProjectRelativePath,
  remapProjectRelativeAfterRename,
} from "@/apps/forge/helpers/editorFileProjectPath";

function applyProjectPathRename(file: EditorFile, fromRel: string, toRel: string): boolean {
  const current = editorFileProjectRelativePath(file);
  if (!current) {
    return false;
  }
  const next = remapProjectRelativeAfterRename(current, fromRel, toRel);
  if (!next || next === current) {
    return false;
  }
  file.handle = undefined;
  file.handle2 = undefined;
  file.useProjectFileSystem = true;
  file.setPath(EditorFile.referenceURIForProjectRelative(next));
  return true;
}

/**
 * Update every open tab (and recents / persisted open_files) that still points
 * at `fromRel`, or at a child path when a folder was renamed.
 */
export function retargetOpenProjectEditors(fromRel: string, toRel: string): void {
  let changed = false;
  const tabs = ForgeState.tabManager?.tabs || [];
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const file = tab?.file;
    if (!(file instanceof EditorFile)) {
      continue;
    }
    if (!applyProjectPathRename(file, fromRel, toRel)) {
      continue;
    }
    tab.editorFileUpdated();
    changed = true;
  }

  const recents = ForgeState.recentFiles || [];
  for (let i = 0; i < recents.length; i++) {
    const file = recents[i];
    if (!(file instanceof EditorFile)) {
      continue;
    }
    if (applyProjectPathRename(file, fromRel, toRel)) {
      changed = true;
    }
  }
  if (changed) {
    ForgeState.saveState();
    ForgeState.processEventListener("onRecentFilesUpdated", []);
  }

  ForgeState.project?.retargetOpenFilesAfterRename(fromRel, toRel);
}
