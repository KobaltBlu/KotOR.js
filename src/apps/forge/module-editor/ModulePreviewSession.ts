/**
 * Forge playable module preview session.
 * Packs live editor + project files into an ERF, loads GameState.module, hosts INGAME.
 *
 * @file ModulePreviewSession.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import * as KotOR from "@/apps/forge/KotOR";
import * as THREE from "three";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { buildProjectModuleErf } from "@/apps/forge/helpers/exportProjectModule";
import {
  compileAllNssBeforeModulePack,
  formatBulkNssCompileFailure,
  type BulkProjectNssCompileOutcome,
} from "@/apps/forge/helpers/ForgeNWScriptCompile";
import { ModalBulkNssCompileResultsState } from "@/apps/forge/states/modal/ModalBulkNssCompileResultsState";
import type { TabModuleEditorState } from "@/apps/forge/states/tabs/TabModuleEditorState";
import { ModuleEditorTabMode } from "@/apps/forge/enum/ModuleEditorTabMode";
import { CacheScope } from "@/enums/resource/CacheScope";
import { EngineMode } from "@/enums/engine/EngineMode";

export interface ModulePreviewSessionResult {
  ok: boolean;
  reason?: string;
  skippedNss?: string[];
}

export type ModulePreviewProgressStage =
  | "preparing"
  | "compiling"
  | "packing"
  | "init"
  | "loading"
  | "ready"
  | "failed";

export class ModulePreviewSession {
  static active = false;
  static hostElement: HTMLElement | null = null;
  private static starting = false;

  private static emitProgress(tab: TabModuleEditorState, stage: ModulePreviewProgressStage, detail?: string) {
    tab.processEventListener("onPreviewProgress", [stage, detail || ""]);
  }

  /** Temporarily apply camera spawn into module entry fields for pack. Waypoint spawn uses LoadModuleFromArchives tag (retail warp). */
  private static withSpawnOverrides<T>(tab: TabModuleEditorState, fn: () => T): T {
    const mod = tab.module;
    if(!mod || tab.previewSpawnMode !== "camera"){
      return fn();
    }
    if(!tab.ui3DRenderer?.camera){
      return fn();
    }
    const saved = {
      entryX: mod.entryX,
      entryY: mod.entryY,
      entryZ: mod.entryZ,
      entryDirectionX: mod.entryDirectionX,
      entryDirectionY: mod.entryDirectionY,
    };
    try{
      const cam = tab.ui3DRenderer.camera;
      mod.entryX = cam.position.x;
      mod.entryY = cam.position.y;
      mod.entryZ = cam.position.z;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      const len = Math.hypot(forward.x, forward.y) || 1;
      mod.entryDirectionX = forward.x / len;
      mod.entryDirectionY = forward.y / len;
      return fn();
    }finally{
      mod.entryX = saved.entryX;
      mod.entryY = saved.entryY;
      mod.entryZ = saved.entryZ;
      mod.entryDirectionX = saved.entryDirectionX;
      mod.entryDirectionY = saved.entryDirectionY;
    }
  }

  private static presentCompileFailure(outcome: BulkProjectNssCompileOutcome): void {
    try {
      const modal = new ModalBulkNssCompileResultsState(outcome);
      modal.attachToModalManager(ForgeState.modalManager);
      modal.open();
    } catch (e) {
      console.error("ModulePreviewSession presentCompileFailure", e);
    }
  }

  /** Compile all project NSS, then pack live editor + project files into an ERF. */
  private static async packErf(tab: TabModuleEditorState): Promise<{
    ok: boolean;
    reason?: string;
    erf?: any;
    skippedNss?: string[];
    areaResRef: string;
  }> {
    this.emitProgress(tab, "compiling", "Compiling project scripts…");
    const compile = await compileAllNssBeforeModulePack();
    if (!compile.ok) {
      this.presentCompileFailure(compile.outcome);
      return {
        ok: false,
        reason: formatBulkNssCompileFailure(compile.outcome),
        skippedNss: compile.outcome.failures.map((f) => f.relativePath),
        areaResRef: tab.module?.area?.getLayoutResRef?.() || "",
      };
    }

    const buffers = this.withSpawnOverrides(tab, () => tab.serializeModuleBuffers());
    if(!buffers){
      return { ok: false, reason: "Failed to serialize the live module.", areaResRef: "" };
    }
    const areaResRef = tab.module!.area.getLayoutResRef();
    const overrides: Record<string, Uint8Array> = {
      "module.ifo": buffers.ifo,
      [`${areaResRef}.are`]: buffers.are,
      [`${areaResRef}.git`]: buffers.git,
    };
    if(buffers.lyt){
      overrides[`${areaResRef}.lyt`] = buffers.lyt;
    }
    if(buffers.vis){
      overrides[`${areaResRef}.vis`] = buffers.vis;
    }

    this.emitProgress(tab, "packing", "Packing module ERF…");
    const files = await ProjectFileSystem.readdir("", { recursive: true });
    const built = await buildProjectModuleErf({
      files,
      readFile: (rel) => ProjectFileSystem.readFile(rel),
      moduleTag: tab.module!.tag || areaResRef || "preview",
      projectName: ForgeState.project?.settings?.name,
      overrides,
    });
    if(!built.ok || !built.erf){
      return { ok: false, reason: built.reason || "Failed to pack module for preview.", skippedNss: built.skippedNss, areaResRef };
    }
    return { ok: true, erf: built.erf, skippedNss: built.skippedNss, areaResRef };
  }

  static async start(tab: TabModuleEditorState, host: HTMLElement): Promise<ModulePreviewSessionResult> {
    if(this.starting || this.active){
      return { ok: false, reason: "Preview is already running." };
    }
    if(!ForgeState.hasGameData){
      return {
        ok: false,
        reason: "Game data is required for playable preview. Use File → Load Game Directory… first.",
      };
    }
    if(!tab.module?.area){
      return { ok: false, reason: "No module area is loaded in the editor." };
    }

    this.starting = true;
    tab.tabMode = ModuleEditorTabMode.PREVIEW;
    tab.ui3DRenderer.transformControls.detach();
    tab.ui3DRenderer.setEnabled(false);
    tab.processEventListener("onPreviewModeChange", [true]);
    tab.processEventListener("onControlModeChange", [tab.controlMode]);
    this.emitProgress(tab, "preparing", "Preparing preview…");

    // Let React show the preview host before sizing the game canvas.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try{
      const packed = await this.packErf(tab);
      if(!packed.ok || !packed.erf){
        this.emitProgress(tab, "failed", packed.reason || "Pack failed");
        await this.stop(tab);
        return { ok: false, reason: packed.reason || "Failed to pack module for preview.", skippedNss: packed.skippedNss };
      }

      this.hostElement = host;
      this.emitProgress(tab, "init", "Initializing game renderer…");
      await KotOR.GameState.InitForForgePreview(host);

      // Re-wrap via KotOR.ERFObject: Forge webpack externals @/KotOR, so the
      // bundled ERFObject from exportProjectModule fails ResourceLoader instanceof checks.
      const exportBuffer = packed.erf.getExportBuffer();
      const playErf = new KotOR.ERFObject(exportBuffer);
      await playErf.load();

      this.emitProgress(tab, "loading", "Loading module into GameState…");
      const modName = (tab.module.tag || packed.areaResRef || "preview").slice(0, 16);
      const waypoint = tab.previewSpawnMode === "waypoint" ? tab.getPreviewSpawnWaypointTag() : null;
      await KotOR.GameState.LoadModuleFromArchives([playErf], waypoint, modName);

      this.active = true;
      this.emitProgress(tab, "ready", "Preview ready");

      if(packed.skippedNss?.length){
        console.warn("Module preview skipped uncompiled NSS scripts:", packed.skippedNss);
      }

      return { ok: true, skippedNss: packed.skippedNss };
    }catch(e){
      console.error("ModulePreviewSession.start", e);
      this.emitProgress(tab, "failed", e instanceof Error ? e.message : "Preview failed");
      try{
        await this.stop(tab);
      }catch(_e){}
      return {
        ok: false,
        reason: e instanceof Error ? e.message : "Failed to start playable preview.",
      };
    }finally{
      this.starting = false;
    }
  }

  /**
   * Incremental preview reload strategies. Script/blueprint patches attempt a
   * lighter warm reload; unknown scopes fall back to a full ERF repack.
   */
  static async reloadIncremental(
    tab: TabModuleEditorState,
    scope: "script" | "blueprint" | "scene" | "full" = "full",
  ): Promise<ModulePreviewSessionResult> {
    tab.processEventListener("onPreviewProgress", ["preparing", `Incremental ${scope} reload…`]);
    if (scope === "full" || !this.active) {
      return this.warmReload(tab);
    }
    // Script/blueprint/scene patches currently share warmReload until GameState
    // supports surgical resource replacement; the scope is retained for UI/API.
    return this.warmReload(tab);
  }

  /**
   * Re-pack and reload the module without tearing down InitForForgePreview.
   * Falls back to a full start if preview is not active.
   */
  static async warmReload(tab: TabModuleEditorState): Promise<ModulePreviewSessionResult> {
    if(!this.active || !this.hostElement){
      const host = tab.previewHostElement || this.hostElement;
      if(!host){
        return { ok: false, reason: "Preview host is not ready." };
      }
      return this.start(tab, host);
    }
    if(this.starting){
      return { ok: false, reason: "Preview is already starting." };
    }
    if(!tab.module?.area){
      return { ok: false, reason: "No module area is loaded in the editor." };
    }

    this.starting = true;
    this.emitProgress(tab, "preparing", "Warm-reloading preview…");
    try{
      const packed = await this.packErf(tab);
      if(!packed.ok || !packed.erf){
        this.emitProgress(tab, "failed", packed.reason || "Pack failed");
        return { ok: false, reason: packed.reason || "Failed to pack module for preview.", skippedNss: packed.skippedNss };
      }

      this.emitProgress(tab, "loading", "Reloading module (keep renderer)…");
      const exportBuffer = packed.erf.getExportBuffer();
      const playErf = new KotOR.ERFObject(exportBuffer);
      await playErf.load();

      const modName = (tab.module.tag || packed.areaResRef || "preview").slice(0, 16);
      const waypoint = tab.previewSpawnMode === "waypoint" ? tab.getPreviewSpawnWaypointTag() : null;
      await KotOR.GameState.LoadModuleFromArchives([playErf], waypoint, modName);

      this.emitProgress(tab, "ready", "Preview reloaded");
      return { ok: true, skippedNss: packed.skippedNss };
    }catch(e){
      console.error("ModulePreviewSession.warmReload", e);
      this.emitProgress(tab, "failed", e instanceof Error ? e.message : "Warm reload failed");
      return {
        ok: false,
        reason: e instanceof Error ? e.message : "Failed to warm-reload preview.",
      };
    }finally{
      this.starting = false;
    }
  }

  static async stop(tab: TabModuleEditorState): Promise<void> {
    const wasActive = this.active || tab.tabMode === ModuleEditorTabMode.PREVIEW;
    this.active = false;

    try{
      if(KotOR.GameState.module){
        try{
          KotOR.GameState.module.dispose();
        }catch(e){
          console.error(e);
        }
        KotOR.GameState.module = undefined as any;
      }
      KotOR.GameState.UnloadModule();
      KotOR.ResourceLoader.ClearCache(CacheScope.MODULE);
      KotOR.GameState.clearForgePreviewViewport();
      KotOR.GameState.SetEngineMode(EngineMode.LOADING);
      KotOR.GameState.loadingModule = false;
      if(KotOR.GameState.canvas){
        KotOR.GameState.canvas.style.setProperty("width", "0");
        KotOR.GameState.canvas.style.setProperty("height", "0");
        KotOR.GameState.canvas.style.removeProperty("position");
        KotOR.GameState.canvas.style.removeProperty("left");
        KotOR.GameState.canvas.style.removeProperty("top");
      }
    }catch(e){
      console.error("ModulePreviewSession.stop cleanup", e);
    }

    this.hostElement = null;
    tab.tabMode = ModuleEditorTabMode.EDIT;
    tab.processEventListener("onPreviewModeChange", [false]);
    tab.processEventListener("onControlModeChange", [tab.controlMode]);

    if(wasActive){
      // Restore editor scene graph after play disposed GameState objects.
      tab.processEventListener("onModuleLoaded", [tab.module]);
    }

    // Preview hid the editor canvas (display:none) and stopped the rAF loop.
    // Re-enable after React has a chance to show the viewport again.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tab.ui3DRenderer.syncSizeFromParent();
        tab.ui3DRenderer.setEnabled(true);
      });
    });
  }
}
