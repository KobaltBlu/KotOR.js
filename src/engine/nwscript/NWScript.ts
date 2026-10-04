import { ResourceLoader } from "@engine/loaders";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { GameFileSystem } from "@core/filesystem/GameFileSystem";
import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { NWScriptInstruction } from "@core/nwscript/NWScriptInstruction";
import { NWScriptStack } from "@engine/nwscript/NWScriptStack";
import { NWScriptDecompiler } from "@core/nwscript/decompiler/NWScriptDecompiler";
import { NCSProgram } from "@core/nwscript/NCSProgram";
import { IPCMessageType } from "@engine/enums/server/ipc/IPCMessageType";
import { GameState } from "@engine/runtime/GameState";
import { GameEngineType } from "@core/enums/engine/GameEngineType";
import { INWScriptDefAction } from "@core/interface/nwscript/INWScriptDefAction";
import { NWScriptDefK2 } from "@engine/nwscript/NWScriptDefK2";
import { NWScriptDefK1 } from "@engine/nwscript/NWScriptDefK1";

export interface NWScriptLoadOptions {
  /** Explicit bytecode dialect. Defaults to the active game for runtime compatibility. */
  game?: GameEngineType;
  /** Optional action table override for tools that run without GameState. */
  actionsMap?: { [key: number]: INWScriptDefAction };
}

/**
 * Runtime NWScript: parsed NCS program plus instance management and resource loading.
 */
export class NWScript extends NCSProgram {
  static scripts: Map<string, NWScript> = new Map();
  static NWScriptInstance: typeof NWScriptInstance = NWScriptInstance;
  static NWScriptStack: typeof NWScriptStack = NWScriptStack;
  static NWScriptInstanceMap: Map<string, NWScriptInstance> = new Map();

  instances: NWScriptInstance[];
  instanceUUIDMap: Map<string, NWScriptInstance> = new Map();
  executeInstance: NWScriptInstance | undefined;
  isGlobal: boolean = false;

  constructor(dataOrFile?: string | Uint8Array, options: NWScriptLoadOptions = {}) {
    const game = options.game ?? GameState.GameKey;
    const actionsMap =
      options.actionsMap ??
      (game === GameEngineType.TSL ? NWScriptDefK2.Actions : NWScriptDefK1.Actions);

    super(
      dataOrFile instanceof Uint8Array ? dataOrFile : undefined,
      { actionsMap }
    );

    this.instances = [];
    this.isGlobal = false;

    if (!dataOrFile) {
      return;
    }

    if (typeof dataOrFile === 'string') {
      GameFileSystem.readFile(dataOrFile).then((buffer) => {
        this.decompile(buffer);
      });
    }
  }

  /** @deprecated Prefer {@link NCSProgram.parseInstruction}; kept for call-site compatibility. */
  parseIntruction(
    reader: Parameters<NCSProgram['parseInstruction']>[0],
    lastInstruction: NWScriptInstruction,
    index: number
  ): NWScriptInstruction {
    return this.parseInstruction(reader, lastInstruction, index);
  }

  clone() {
    const script = new NWScript(undefined, { actionsMap: this.actionsMap });
    script.name = this.name;
    script.instructions = new Map(this.instructions);
    return script;
  }

  newInstance(parentInstance?: NWScriptInstance) {
    const instance = new NWScriptInstance(this.instructions);
    instance.name = this.name;
    instance.nwscript = this;

    this.instances.push(instance);

    if (parentInstance instanceof NWScriptInstance) {
      instance.parentUUID = parentInstance.uuid;
      instance.lastPerceived = parentInstance.lastPerceived;
      instance.listenPatternNumber = parentInstance.listenPatternNumber;
      instance.listenPatternSpeaker = parentInstance.listenPatternSpeaker;
      instance.copyOwnerFrom(parentInstance);
    }

    instance.sendToDebugger(IPCMessageType.CreateScript);

    NWScript.NWScriptInstanceMap.set(instance.uuid, instance);
    this.instanceUUIDMap.set(instance.uuid, instance);
    instance.addEventListener('dispose', (uuid: string) => {
      this.instanceUUIDMap.delete(uuid);
      NWScript.NWScriptInstanceMap.delete(uuid);
    });

    return instance;
  }

  getInstanceForExecute(parentInstance?: NWScriptInstance): NWScriptInstance {
    if (
      this.executeInstance &&
      !this.executeInstance._disposed &&
      !this.executeInstance.running
    ) {
      if (parentInstance instanceof NWScriptInstance) {
        this.executeInstance.parentUUID = parentInstance.uuid;
      }
      return this.executeInstance;
    }

    if (this.executeInstance && this.executeInstance.running) {
      const nested = this.newInstance(parentInstance);
      nested.disposeAfterRun = true;
      return nested;
    }

    this.executeInstance = this.newInstance(parentInstance);
    return this.executeInstance;
  }

  static Ensure(scriptName = ''): NWScript | undefined {
    if (!scriptName) {
      return undefined;
    }
    if (NWScript.scripts.has(scriptName)) {
      return NWScript.scripts.get(scriptName);
    }
    NWScript.Load(scriptName, false);
    return NWScript.scripts.get(scriptName);
  }

  static Run(scriptName: string, caller: any, scriptVar = 0, parentInstance?: NWScriptInstance) {
    const script = NWScript.Ensure(scriptName);
    if (!script) {
      return undefined;
    }
    const instance = script.getInstanceForExecute(parentInstance);
    return instance.run(caller, scriptVar);
  }

  static SetGlobalScript(scriptName = '', isGlobal = true) {
    if (!scriptName || !NWScript.scripts.has(scriptName)) {
      return;
    }
    const script = NWScript.scripts.get(scriptName);
    script.isGlobal = isGlobal;
  }

  static Load(
    scriptName = '',
    returnInstance = true,
    parentInstance?: NWScriptInstance
  ): NWScriptInstance {
    if (!scriptName) {
      return undefined;
    }

    if (NWScript.scripts.has(scriptName)) {
      const script = NWScript.scripts.get(scriptName);
      if (!returnInstance) {
        return undefined;
      }
      if (parentInstance instanceof NWScriptInstance) {
        return script.getInstanceForExecute(parentInstance);
      }
      return script.newInstance();
    }

    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['ncs'], scriptName);
    if (!buffer) {
      return undefined;
    }

    const script = new NWScript(buffer);
    script.name = scriptName;
    NWScript.scripts.set(scriptName, script);

    if (!returnInstance) {
      return undefined;
    }
    if (parentInstance instanceof NWScriptInstance) {
      return script.getInstanceForExecute(parentInstance);
    }
    return script.newInstance();
  }

  static Reload() {
    NWScript.scripts.forEach((script, key) => {
      if (script.isGlobal) {
        return;
      }
      script.executeInstance = undefined;
      script.disposeInstances();
      NWScript.scripts.delete(key);
    });
  }

  disposeInstance(instance: NWScriptInstance) {
    if (instance instanceof NWScriptInstance) {
      instance.dispose();
    }
  }

  disposeInstances() {
    let i = this.instances.length;
    while (i--) {
      const instance = this.instances[i];
      if (instance instanceof NWScriptInstance) {
        instance.dispose();
      }
    }
    this.executeInstance = undefined;
  }

  decompile(binary: Uint8Array): string {
    if (!this.instructions || this.instructions.size === 0) {
      this.init(binary);
    }
    const decompiler = new NWScriptDecompiler(this);
    return decompiler.decompile();
  }
}
