import { GameState } from "@/GameState";

const SKIP_KEYS = new Set<string>([
  "BWStructs",
  "BWFields",
  "BWFieldData",
  "BWLabels",
  "BWFieldIndicies",
  "BWListIndicies",
  "buffer",
  "canvas",
  "camera",
  "camera_dialog",
  "camera_gui",
  "camera_animated",
  "clock",
  "collisionList",
  "composer",
  "container",
  "context",
  "controls",
  "copyPass",
  "currentCamera",
  "currentCameraPosition",
  "debugLabel",
  "depthTarget",
  "dialog",
  "domElement",
  "effectComposer",
  "eventListeners",
  "fog",
  "forwardVector",
  "frustumMat4",
  "globalLight",
  "group",
  "guiAudioEmitter",
  "helperMesh",
  "html",
  "interactableObjects",
  "lastGameplayThumb",
  "lastGameplayThumbCtx",
  "lastGameplayThumbRT",
  "lightManager",
  "limiter",
  "material",
  "mesh",
  "model",
  "mouse",
  "mouseUI",
  "odysseyShaderPass",
  "path",
  "pathHelpers",
  "perspectiveCamera",
  "raycaster",
  "reader",
  "renderPass",
  "renderPassAA",
  "renderPassGUI",
  "renderer",
  "reticle",
  "reticle2",
  "scene",
  "scene_cursor_holder",
  "scene_gui",
  "scene_movie",
  "screenCenter",
  "scripts",
  "selectedControl",
  "shader",
  "stats",
  "tGuiPanel",
  "texture",
  "viewportFrustum",
  "viewportProjectionMatrix",
  "walkEdges",
  "walkFaces",
  "walkmeshList",
  "window",
]);

const OPAQUE_CONSTRUCTOR_NAMES = new Set<string>([
  "AudioContext",
  "AudioListener",
  "DataTexture",
  "DepthTexture",
  "Document",
  "EventTarget",
  "HTMLAudioElement",
  "HTMLCanvasElement",
  "HTMLElement",
  "ImageBitmap",
  "ImageData",
  "OffscreenCanvas",
  "ShaderMaterial",
  "WebGLRenderTarget",
  "WebGLRenderer",
  "WebGLRenderingContext",
  "Window",
]);

export interface GameStateSnapshotExportResult {
  ok: boolean;
  cancelled?: boolean;
  path?: string;
  bytes?: number;
  message: string;
}

export class GameStateSnapshot {
  static readonly SNAPSHOT_FORMAT_VERSION = 1;
  static readonly MAX_DEPTH = 32;

  static capture(): any {
    const module = GameState.module;
    const area = module?.area;
    const currentPlayer = typeof GameState.getCurrentPlayer === "function"
      ? GameState.getCurrentPlayer()
      : undefined;

    const source = {
      snapshotFormatVersion: GameStateSnapshot.SNAPSHOT_FORMAT_VERSION,
      capturedAt: new Date().toISOString(),
      // Query/fragment data may contain credentials or private launch parameters.
      location: typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      game: {
        key: GameState.GameKey,
        mode: GameState.Mode,
        state: GameState.State,
        ready: GameState.Ready,
        debugMode: GameState.debugMode,
        debugFlags: GameState.debug,
        flags: GameState.Flags,
        isLoadingSave: GameState.isLoadingSave,
        soloMode: GameState.SOLOMODE,
        autoRun: GameState.autoRun,
        holdWorldFadeInForDialog: GameState.holdWorldFadeInForDialog,
        alphaTest: GameState.AlphaTest,
        noClickTimer: GameState.noClickTimer,
        time: GameState.time,
        delta: GameState.delta,
        clampedDelta: GameState.clampedDelta,
        deltaTime: GameState.deltaTime,
        deltaTimeFixed: GameState.deltaTimeFixed,
        tutorialWindowTracker: GameState.TutorialWindowTracker,
        currentLeader: GameState.currentLeader,
        currentPlayer: currentPlayer,
        currentModule: module?.filename,
        currentSaveGame: GameState.SaveGame,
      },
      cursor: GameState.CursorManager ? {
        selected: GameState.CursorManager.selected,
        selectedObject: GameState.CursorManager.selectedObject,
        hovered: GameState.CursorManager.hovered,
        hoveredObject: GameState.CursorManager.hoveredObject,
      } : null,
      partyManager: GameState.PartyManager ? {
        party: GameState.PartyManager.party,
        Player: GameState.PartyManager.Player,
        PlayerTemplate: GameState.PartyManager.PlayerTemplate,
        ActualPlayerTemplate: GameState.PartyManager.ActualPlayerTemplate,
        PortraitOrder: GameState.PartyManager.PortraitOrder,
        NPCS: GameState.PartyManager.NPCS,
        Puppets: GameState.PartyManager.Puppets,
        Gold: GameState.PartyManager.Gold,
        CurrentMembers: GameState.PartyManager.CurrentMembers,
        InfluenceMap: GameState.PartyManager.InfluenceMap,
        ChemicalCount: GameState.PartyManager.ChemicalCount,
        ComponentCount: GameState.PartyManager.ComponentCount,
        SwoopUpgrade1: GameState.PartyManager.SwoopUpgrade1,
        SwoopUpgrade2: GameState.PartyManager.SwoopUpgrade2,
        SwoopUpgrade3: GameState.PartyManager.SwoopUpgrade3,
      } : null,
      inventoryManager: GameState.InventoryManager ? {
        inventory: GameState.InventoryManager.inventory,
      } : null,
      globalVariableManager: GameState.GlobalVariableManager ? {
        Globals: GameState.GlobalVariableManager.Globals,
      } : null,
      journalManager: GameState.JournalManager ? {
        Categories: GameState.JournalManager.Categories,
        Entries: GameState.JournalManager.Entries,
        SortOrder: GameState.JournalManager.SortOrder,
      } : null,
      dialogMessageManager: GameState.DialogMessageManager ? {
        Entries: GameState.DialogMessageManager.Entries,
      } : null,
      feedbackMessageManager: GameState.FeedbackMessageManager ? {
        FeedbackOptions: GameState.FeedbackMessageManager.FeedbackOptions,
        Entries: GameState.FeedbackMessageManager.Entries,
      } : null,
      factionManager: GameState.FactionManager ? {
        FACTION_COUNT: GameState.FactionManager.FACTION_COUNT,
        factions: GameState.FactionManager.factions,
      } : null,
      moduleObjectManager: GameState.ModuleObjectManager ? {
        COUNT: GameState.ModuleObjectManager.COUNT,
        PLAYER_ID: GameState.ModuleObjectManager.PLAYER_ID,
        ObjectList: GameState.ModuleObjectManager.ObjectList,
        playerSelectableObjects: GameState.ModuleObjectManager.playerSelectableObjects,
        playerHoverableObjects: GameState.ModuleObjectManager.playerHoverableObjects,
      } : null,
      planetary: GameState.Planetary ? {
        planets: GameState.Planetary.planets,
        selectedIndex: GameState.Planetary.selectedIndex,
        selected: GameState.Planetary.selected,
      } : null,
      pazaak: GameState.PazaakManager ? {
        Wager: GameState.PazaakManager.Wager,
        MinWager: GameState.PazaakManager.MinWager,
        MaxWager: GameState.PazaakManager.MaxWager,
        EndScript: GameState.PazaakManager.EndScript,
        ShowTutorial: GameState.PazaakManager.ShowTutorial,
        Opponent: GameState.PazaakManager.Opponent,
        Cards: GameState.PazaakManager.Cards,
        Won: GameState.PazaakManager.Won,
        TotalSideDeckCards: GameState.PazaakManager.TotalSideDeckCards,
        TotalMainDeckCards: GameState.PazaakManager.TotalMainDeckCards,
        WaitTimer: GameState.PazaakManager.WaitTimer,
        TargetPoints: GameState.PazaakManager.TargetPoints,
        PlayerSideDeck: GameState.PazaakManager.PlayerSideDeck,
        OpponentSideDeck: GameState.PazaakManager.OpponentSideDeck,
        TurnState: GameState.PazaakManager.TurnState,
        Tables: GameState.PazaakManager.Tables,
        TurnMode: GameState.PazaakManager.TurnMode,
        Actions: GameState.PazaakManager.Actions,
        TargetWins: GameState.PazaakManager.TargetWins,
      } : null,
      module: module ? {
        module: module,
        area: area,
        objects: area ? {
          party: GameState.PartyManager?.party,
          cameras: area.cameras,
          creatures: area.creatures,
          doors: area.doors,
          encounters: area.encounters,
          items: area.items,
          placeables: area.placeables,
          sounds: area.sounds,
          stores: area.stores,
          triggers: area.triggers,
          waypoints: area.waypoints,
          areaOfEffects: area.areaOfEffects,
          rooms: area.rooms,
          textSprites: area.textSprites,
          spellInstances: area.spellInstances,
        } : null,
      } : null,
    };

    return this.serializeValue(source, "$", new Map(), 0);
  }

  static async exportSnapshotToFile(): Promise<GameStateSnapshotExportResult> {
    try {
      const snapshot = this.capture();
      const text = JSON.stringify(snapshot, null, 2);
      const bytes = new TextEncoder().encode(text).byteLength;
      const defaultFileName = this.getDefaultFileName();
      return await this.writeSnapshot(defaultFileName, text, bytes);
    } catch (error: any) {
      return {
        ok: false,
        message: `Failed to export snapshot: ${this.getErrorMessage(error)}`,
      };
    }
  }

  private static getDefaultFileName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const gameKey = String(GameState.GameKey || "kotor").toLowerCase();
    const moduleName = (GameState.module?.filename || "no-module").toLowerCase();
    return `${gameKey}-snapshot-${moduleName}-${timestamp}.json`;
  }

  private static async writeSnapshot(defaultFileName: string, text: string, bytes: number): Promise<GameStateSnapshotExportResult> {
    const windowAny = typeof window !== "undefined" ? window as any : undefined;

    if (windowAny?.dialog?.showSaveDialog && windowAny?.fs?.writeFile) {
      try {
        const saveResult = await windowAny.dialog.showSaveDialog({
          title: "Export Game Snapshot",
          defaultPath: defaultFileName,
          filters: [
            { name: "JSON Files", extensions: ["json"] },
            { name: "All Files", extensions: ["*"] }
          ]
        });

        if (!saveResult || saveResult.canceled || saveResult.cancelled || !saveResult.filePath) {
          return {
            ok: false,
            cancelled: true,
            message: "Snapshot export cancelled.",
          };
        }

        await new Promise<void>((resolve, reject) => {
          windowAny.fs.writeFile(saveResult.filePath, text, "utf8", (error: any) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });

        return {
          ok: true,
          path: saveResult.filePath,
          bytes,
          message: `Snapshot exported to ${saveResult.filePath}`,
        };
      } catch (error: any) {
        return {
          ok: false,
          message: `Failed to write snapshot: ${this.getErrorMessage(error)}`,
        };
      }
    }

    if (typeof windowAny?.showSaveFilePicker === "function") {
      try {
        const handle = await windowAny.showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: "JSON Files",
            accept: {
              "application/json": [".json"]
            }
          }],
        });

        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();

        return {
          ok: true,
          path: handle.name,
          bytes,
          message: `Snapshot exported to ${handle.name}`,
        };
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return {
            ok: false,
            cancelled: true,
            message: "Snapshot export cancelled.",
          };
        }

        return {
          ok: false,
          message: `Failed to write snapshot: ${this.getErrorMessage(error)}`,
        };
      }
    }

    try {
      const blob = new Blob([text], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = defaultFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);

      return {
        ok: true,
        path: defaultFileName,
        bytes,
        message: `Snapshot downloaded as ${defaultFileName}`,
      };
    } catch (error: any) {
      return {
        ok: false,
        message: `Failed to trigger snapshot download: ${this.getErrorMessage(error)}`,
      };
    }
  }

  private static serializeValue(value: any, path: string, seen: Map<any, string>, depth: number): any {
    if (value === null) return null;
    if (value === undefined) return undefined;

    const valueType = typeof value;
    if (valueType === "string" || valueType === "boolean") return value;

    if (valueType === "number") {
      if (Number.isFinite(value)) return value;
      if (Number.isNaN(value)) return "NaN";
      return value > 0 ? "Infinity" : "-Infinity";
    }

    if (valueType === "bigint") return value.toString();
    if (valueType === "symbol") return String(value);
    if (valueType === "function") return undefined;

    if (depth >= this.MAX_DEPTH) {
      return `[MaxDepth -> ${path}]`;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof RegExp) {
      return value.toString();
    }

    if (typeof ArrayBuffer !== "undefined") {
      if (value instanceof ArrayBuffer) {
        return Array.from(new Uint8Array(value));
      }

      if (ArrayBuffer.isView(value)) {
        return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
      }
    }

    if (this.shouldTreatAsOpaque(value)) {
      return this.getOpaqueSummary(value);
    }

    if (seen.has(value)) {
      return `[Circular -> ${seen.get(value)}]`;
    }

    if (this.shouldUseToJSON(value)) {
      seen.set(value, path);
      try {
        const serializedJSON = this.serializeValue(value.toJSON(), `${path}.toJSON()`, seen, depth + 1);
        const ctorName = this.getConstructorName(value);
        if (ctorName && ctorName !== "Object") {
          return {
            $type: ctorName,
            value: serializedJSON,
          };
        }
        return serializedJSON;
      } catch (error: any) {
        return {
          $type: this.getConstructorName(value),
          $error: `toJSON failed: ${this.getErrorMessage(error)}`,
        };
      }
    }

    if (value instanceof Map) {
      seen.set(value, path);
      return {
        $type: "Map",
        entries: Array.from(value.entries()).map(([entryKey, entryValue], index) => ({
          key: this.serializeValue(entryKey, `${path}.<mapKey:${index}>`, seen, depth + 1),
          value: this.serializeValue(entryValue, `${path}.<mapValue:${index}>`, seen, depth + 1),
        })),
      };
    }

    if (value instanceof Set) {
      seen.set(value, path);
      return {
        $type: "Set",
        values: Array.from(value.values()).map((entryValue, index) => (
          this.serializeValue(entryValue, `${path}[${index}]`, seen, depth + 1)
        )),
      };
    }

    if (Array.isArray(value)) {
      seen.set(value, path);
      return value.map((entryValue, index) => (
        this.serializeValue(entryValue, `${path}[${index}]`, seen, depth + 1)
      ));
    }

    seen.set(value, path);

    const output: Record<string, any> = {};
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    for (const key of keys) {
      if (this.shouldSkipKey(key)) {
        continue;
      }

      let childValue: any;
      try {
        childValue = value[key];
      } catch (error: any) {
        output[key] = `[Thrown while reading property: ${this.getErrorMessage(error)}]`;
        continue;
      }

      const serializedChild = this.serializeValue(childValue, `${path}.${key}`, seen, depth + 1);
      if (serializedChild !== undefined) {
        output[key] = serializedChild;
      }
    }

    const ctorName = this.getConstructorName(value);
    if (ctorName && ctorName !== "Object") {
      return {
        $type: ctorName,
        ...output,
      };
    }

    return output;
  }

  private static shouldUseToJSON(value: any): boolean {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return false;
    if (value instanceof Date) return false;
    if (value instanceof Map) return false;
    if (value instanceof Set) return false;
    if (typeof value.toJSON !== "function") return false;
    return !this.shouldTreatAsOpaque(value);
  }

  private static shouldSkipKey(key: string): boolean {
    if (!key) return true;
    if (SKIP_KEYS.has(key)) return true;
    if (key.startsWith("__react")) return true;
    if (key.startsWith("_listeners")) return true;
    if (key.startsWith("on") && key[2] === key[2]?.toUpperCase()) return true;
    return false;
  }

  private static shouldTreatAsOpaque(value: any): boolean {
    if (!value || typeof value !== "object") return false;

    if ((value as any).isObject3D) return true;
    if ((value as any).isMaterial) return true;
    if ((value as any).isBufferGeometry) return true;
    if ((value as any).isTexture) return true;
    if ((value as any).isWebGLRenderer) return true;
    if ((value as any).isWebGLRenderTarget) return true;
    if ((value as any).isFog) return true;
    if ((value as any).isCamera) return true;
    if ((value as any).isScene) return true;

    const ctorName = this.getConstructorName(value);
    if (OPAQUE_CONSTRUCTOR_NAMES.has(ctorName)) return true;
    if (ctorName.endsWith("Emitter")) return true;
    if (ctorName.endsWith("Listener")) return true;

    if (typeof Element !== "undefined" && value instanceof Element) return true;
    if (typeof Document !== "undefined" && value instanceof Document) return true;
    if (typeof Window !== "undefined" && value instanceof Window) return true;

    return false;
  }

  private static getOpaqueSummary(value: any): any {
    return {
      $type: this.getConstructorName(value),
      $opaque: true,
    };
  }

  private static getConstructorName(value: any): string {
    return value?.constructor?.name || "Object";
  }

  private static getErrorMessage(error: any): string {
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    try {
      return JSON.stringify(error);
    } catch (_e) {
      return String(error);
    }
  }
}
