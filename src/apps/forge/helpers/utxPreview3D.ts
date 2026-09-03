/**
 * Whether UTx template tabs should show a 3D model pane.
 *
 * @file utxPreview3D.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { forgeBlueprintsSettings } from "@/apps/forge/settings/forgeEditorsSettings";
import * as THREE from "three";

export function utxShouldShow3DPreview(): boolean {
  return ForgeState.hasGameData && forgeBlueprintsSettings.get().show3DPreview;
}

export interface UtxPreviewObject {
  setContext: (context: UI3DRenderer) => void;
  load: () => Promise<void> | void;
  container: THREE.Object3D;
}

export async function attachUtxModelPreview(
  renderer: UI3DRenderer,
  object: UtxPreviewObject
): Promise<void> {
  object.setContext(renderer);
  if (!utxShouldShow3DPreview()) {
    return;
  }
  await object.load();
  renderer.attachObject(object.container, false);
}

export function bindUtxPreviewOnGameData(tab: TabState & { attachPreview: () => Promise<void> }): void {
  const onGameDataChanged = () => {
    void tab.attachPreview();
  };
  ForgeState.addEventListener("onGameDataChanged", onGameDataChanged);
  tab.addEventListener("onTabRemoved", () => {
    ForgeState.removeEventListener("onGameDataChanged", onGameDataChanged);
  });
}
