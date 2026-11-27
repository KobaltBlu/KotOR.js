import { GameState } from "@engine/runtime/GameState";
import { VideoManager } from "@engine/managers";
import { ModuleLoadCoordinator } from "@engine/runtime/ModuleLoadCoordinator";

/**
 * Host options for the shared playable-entry tail after module scripts.
 * Coordinator enables movies/fade; Forge preview forces a non-save spawn pass.
 */
export interface ModulePlayEntryOptions {
  /** When true, defer the playable tail until the movie queue finishes. */
  movies?: boolean;
  /**
   * Overrides GameState.isLoadingSave when deciding runSpawnScripts.
   * runSpawnScripts = !isLoadingSave.
   */
  isLoadingSave?: boolean;
  /** GPU warm after reveal prime. Default true. */
  gpuWarm?: boolean;
  /** Post-load world fade. Default true. */
  fade?: boolean;
  /** Host setup after spawn flag is resolved, before initAreaObjects. */
  prepare?: () => void | Promise<void>;
  /** Host finish after warm/fade (load screen, music, flags). */
  finalize?: () => void | Promise<void>;
}

/**
 * Shared ordered tail for ModuleLoadCoordinator and ForgePreviewHost:
 * spawn/init → ready → prime reveal → optional GPU warm → optional fade.
 */
export class ModulePlayEntrySequence {
  /**
   * When movies is true, schedules the tail on the movie queue and returns
   * immediately (same fire-and-forget shape as the runtime coordinator).
   * Otherwise awaits the full sequence.
   */
  static run(options: ModulePlayEntryOptions = {}): Promise<void> {
    const execute = async () => {
      const loadingSave = options.isLoadingSave ?? !!GameState.isLoadingSave;
      const runSpawnScripts = !loadingSave;
      GameState.isLoadingSave = false;

      if(options.prepare){
        await options.prepare();
      }

      await GameState.module.area.initAreaObjects(runSpawnScripts);
      GameState.module.readyToProcessEvents = true;
      GameState.module.area.primePostLoadReveal();
      if(options.gpuWarm !== false){
        await ModuleLoadCoordinator.warmModuleGpuForArea();
      }
      if(options.fade !== false){
        ModuleLoadCoordinator.applyPostLoadRevealFade();
      }
      if(options.finalize){
        await options.finalize();
      }
    };

    if(options.movies){
      VideoManager.playMovieQueue(async () => {
        await execute();
      });
      return Promise.resolve();
    }

    return execute();
  }
}
