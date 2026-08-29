/**
 * Viewport tool / snap / transform-space state.
 *
 * @file ToolService.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import {
  DEFAULT_SNAP_SETTINGS,
  EditorMode,
  EditorTool,
  SnapSettings,
  TransformSpace,
} from "@/apps/forge/module-editor/kernel/EditorMode";

export class ToolService extends EventListenerModel {
  private mode: EditorMode = EditorMode.EDIT;
  private tool: EditorTool = EditorTool.SELECT;
  private space: TransformSpace = "world";
  private snap: SnapSettings = { ...DEFAULT_SNAP_SETTINGS };

  getMode(): EditorMode {
    return this.mode;
  }

  setMode(mode: EditorMode): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    if (mode === EditorMode.PLACE) {
      this.tool = EditorTool.PLACE;
    } else if (mode === EditorMode.PREVIEW) {
      // Tools are inactive in preview.
    } else if (this.tool === EditorTool.PLACE) {
      this.tool = EditorTool.SELECT;
    }
    this.processEventListener("onModeChanged", [this.mode, this.tool]);
  }

  getTool(): EditorTool {
    return this.tool;
  }

  setTool(tool: EditorTool): void {
    if (this.mode === EditorMode.PREVIEW) {
      return;
    }
    if (this.tool === tool) {
      return;
    }
    this.tool = tool;
    this.mode = tool === EditorTool.PLACE ? EditorMode.PLACE : EditorMode.EDIT;
    this.processEventListener("onToolChanged", [this.tool, this.mode]);
  }

  getSpace(): TransformSpace {
    return this.space;
  }

  setSpace(space: TransformSpace): void {
    if (this.space === space) {
      return;
    }
    this.space = space;
    this.processEventListener("onSpaceChanged", [this.space]);
  }

  toggleSpace(): TransformSpace {
    this.setSpace(this.space === "local" ? "world" : "local");
    return this.space;
  }

  getSnap(): SnapSettings {
    return { ...this.snap };
  }

  setSnap(patch: Partial<SnapSettings>): SnapSettings {
    this.snap = { ...this.snap, ...patch };
    this.processEventListener("onSnapChanged", [this.getSnap()]);
    return this.getSnap();
  }

  /**
   * Resolve whether snapping should apply given Ctrl invert semantics.
   */
  isSnapActive(ctrlPressed: boolean): { position: boolean; angle: boolean } {
    const invert = this.snap.ctrlInverts && ctrlPressed;
    return {
      position: invert ? !this.snap.positionEnabled : this.snap.positionEnabled,
      angle: invert ? !this.snap.angleEnabled : this.snap.angleEnabled,
    };
  }
}
