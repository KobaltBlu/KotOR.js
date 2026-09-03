/**
 * Preview lifecycle controller for the module editor.
 *
 * @file PreviewController.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import { EditorMode } from "@/apps/forge/module-editor/kernel/EditorMode";

export type PreviewStage =
  | "idle"
  | "packing"
  | "loading"
  | "ready"
  | "failed"
  | "stopping";

export type PreviewSpawnMode = "entry" | "camera" | "waypoint" | "selection";

export interface PreviewProgress {
  stage: PreviewStage;
  detail: string;
  skippedNss: string[];
}

export class PreviewController extends EventListenerModel {
  private active = false;
  private stage: PreviewStage = "idle";
  private detail = "";
  private skippedNss: string[] = [];
  private spawnMode: PreviewSpawnMode = "entry";
  private host: HTMLElement | undefined;

  isActive(): boolean {
    return this.active;
  }

  getStage(): PreviewStage {
    return this.stage;
  }

  getSpawnMode(): PreviewSpawnMode {
    return this.spawnMode;
  }

  setSpawnMode(mode: PreviewSpawnMode): void {
    this.spawnMode = mode;
    this.processEventListener("onSpawnModeChanged", [mode]);
  }

  setHost(host: HTMLElement | undefined): void {
    this.host = host;
  }

  getHost(): HTMLElement | undefined {
    return this.host;
  }

  begin(detail = "Starting preview…"): void {
    this.active = true;
    this.setProgress("packing", detail);
    this.processEventListener("onPreviewModeChanged", [true, EditorMode.PREVIEW]);
  }

  setProgress(stage: PreviewStage, detail = ""): void {
    this.stage = stage;
    this.detail = detail;
    if (stage === "ready") {
      this.active = true;
    }
    if (stage === "failed" || stage === "idle") {
      this.active = stage === "failed" ? false : this.active;
    }
    this.processEventListener("onPreviewProgress", [this.getProgress()]);
  }

  setSkippedNss(list: string[]): void {
    this.skippedNss = Array.isArray(list) ? list.slice() : [];
    this.processEventListener("onPreviewSkippedNss", [this.skippedNss.slice()]);
  }

  getProgress(): PreviewProgress {
    return {
      stage: this.stage,
      detail: this.detail,
      skippedNss: this.skippedNss.slice(),
    };
  }

  end(detail = ""): void {
    this.active = false;
    this.stage = "idle";
    this.detail = detail;
    this.processEventListener("onPreviewProgress", [this.getProgress()]);
    this.processEventListener("onPreviewModeChanged", [false, EditorMode.EDIT]);
  }
}
