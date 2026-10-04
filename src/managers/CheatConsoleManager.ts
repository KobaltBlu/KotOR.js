import { GameState } from "@/GameState";
import { InventoryManager } from "@/managers/InventoryManager";
import { ModuleItem } from "@/module";
import { GFFObject } from "@/resource/GFFObject";
import { MDLLoader, ResourceLoader, TextureLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { KEYManager } from "@/managers/KEYManager";
import { ExperienceType } from "@/enums/engine/ExperienceType";
import { RIMManager } from "@/managers/RIMManager";
import { ERFManager } from "@/managers/ERFManager";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { OdysseyModel } from "@/odyssey";
import { OdysseyModel3D } from "@/three/odyssey";

export interface CheatCommandDefinition {
  command: string;
  usage: string;
  description: string;
  example?: string;
  status?: 'ready' | 'todo';
  argHints?: string[];
}

export interface CheatCommandResult {
  ok: boolean;
  message: string;
  command?: string;
}

const CHEAT_COMMANDS: CheatCommandDefinition[] = [
  {
    command: 'adddark',
    usage: 'adddark <points>',
    description: 'Adds Dark Side points to the current player.',
    example: 'adddark 25',
    status: 'ready'
  },
  {
    command: 'addlight',
    usage: 'addlight <points>',
    description: 'Adds Light Side points to the current player.',
    example: 'addlight 25',
    status: 'ready'
  },
  {
    command: 'addlevel',
    usage: 'addlevel <levels>',
    description: 'Raises the current player level.',
    example: 'addlevel 1',
    status: 'todo'
  },
  {
    command: 'addxp',
    usage: 'addxp <points>',
    description: 'Adds experience to the current player.',
    example: 'addxp 500',
    status: 'ready'
  },
  {
    command: 'giveitem',
    usage: 'giveitem <resref> [amount]',
    description: 'Creates an item from its resref and adds it to inventory.',
    example: 'giveitem g_w_lghtsbr01 1',
    status: 'ready'
  },
  {
    command: 'givecredits',
    usage: 'givecredits <amount>',
    description: 'Adds credits to the current party.',
    example: 'givecredits 1000',
    status: 'ready'
  },
  {
    command: 'givemed',
    usage: 'givemed [amount]',
    description: 'Adds advanced medpacks to inventory.',
    example: 'givemed 99',
    status: 'ready'
  },
  {
    command: 'giverepair',
    usage: 'giverepair [amount]',
    description: 'Adds advanced repair kits to inventory.',
    example: 'giverepair 100',
    status: 'ready'
  },
  {
    command: 'givecomspikes',
    usage: 'givecomspikes [amount]',
    description: 'Adds computer spikes to inventory.',
    example: 'givecomspikes 100',
    status: 'ready'
  },
  {
    command: 'giveparts',
    usage: 'giveparts [amount]',
    description: 'Adds repair parts to inventory.',
    example: 'giveparts 99',
    status: 'ready'
  },
  {
    command: 'heal',
    usage: 'heal',
    description: 'Restores health and Force points.',
    status: 'ready'
  },
  {
    command: 'qol',
    usage: 'qol [on|off]',
    description: 'Toggles quality of life features. Currently enables sprint-to-shift and enhanced lightsaber visuals.',
    example: 'qol on',
    status: 'ready',
    argHints: ['on', 'off']
  },
  {
    command: 'timedilation',
    usage: 'timedilation <playerSpeed> <worldScale>',
    description: 'Sets a player-only movement speed multiplier and scales non-party world updates. Reset with timedilation 1 1.',
    example: 'timedilation 1.0 0.6',
    status: 'ready',
    argHints: ['playerSpeed', 'worldScale']
  },
  {
    command: 'onepunch',
    usage: 'onepunch [on|off]',
    description: 'Toggles one-hit kills for the current player while respecting Min1HP targets.',
    example: 'onepunch on',
    status: 'ready',
    argHints: ['on', 'off']
  },
  {
    command: 'revealmap',
    usage: 'revealmap',
    description: 'Reveals the full map for the current area.',
    status: 'ready'
  },
  {
    command: 'warp',
    usage: 'warp <module>',
    description: 'Loads the requested module immediately.',
    example: 'warp tar_m02aa',
    status: 'ready'
  },
  {
    command: 'whereami',
    usage: 'whereami',
    description: 'Displays the player location and coordinates.',
    status: 'ready'
  },
  {
    command: 'giverandomloot',
    usage: 'giverandomloot [amount]',
    description: 'Adds one or more random items to inventory.',
    example: 'giverandomloot 3',
    status: 'ready'
  },
  {
    command: 'playvfx',
    usage: 'playvfx <id|label>',
    description: 'Applies a visualeffects.2da entry to the current player for high-level VFX testing.',
    example: 'playvfx 123',
    status: 'ready'
  },
  {
    command: 'playmdl',
    usage: 'playmdl <resref> [seconds]',
    description: 'Loads a raw effect model on the current player and force-triggers its emitters.',
    example: 'playmdl v_light 5',
    status: 'ready'
  },
  {
    command: 'inspectmdl',
    usage: 'inspectmdl <resref>',
    description: 'Logs detailed model and emitter metadata to the developer console for debugging.',
    example: 'inspectmdl v_grndeto_fnf',
    status: 'ready'
  },
  {
    command: 'clearvfx',
    usage: 'clearvfx',
    description: 'Removes active cheat-spawned VFX model tests from the current scene.',
    status: 'ready'
  }
];

/**
 * CheatConsoleManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CheatConsoleManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CheatConsoleManager {

  static readonly SPRINT_TO_SHIFT_MULTIPLIER: number = 1.5;
  static readonly TIME_DILATION_BLEND_IN_SECONDS: number = 0.22;
  static readonly TIME_DILATION_BLEND_OUT_SECONDS: number = 0.3;
  static readonly TIME_DILATION_EPSILON: number = 0.0001;
  static onePunchEnabled: boolean = false;
  static qolEnabled: boolean = false;
  static sprintToShiftEnabled: boolean = false;
  static sprintModifierDown: boolean = false;
  static timeDilationPlayerSpeedMultiplier: number = 1;
  static timeDilationWorldScale: number = 1;
  static currentTimeDilationPlayerSpeedMultiplier: number = 1;
  static currentTimeDilationWorldScale: number = 1;
  static activeCheatEffectModels: Set<OdysseyModel3D> = new Set();
  static cheatEffectCleanupTimers: Map<OdysseyModel3D, ReturnType<typeof setTimeout>> = new Map();
  private static cheatEffectGeneration: number = 0;

  static getCommandDefinitions(): CheatCommandDefinition[] {
    return CHEAT_COMMANDS.map((command) => ({ ...command }));
  }

  static getCommandDefinition(commandName: string): CheatCommandDefinition | undefined {
    return CHEAT_COMMANDS.find((command) => command.command === commandName.toLowerCase());
  }

  static getModuleNames(): string[] {
    const names = new Set<string>();
    for (const [name, rim] of RIMManager.RIMs) {
      if ((rim as any).group === 'Module') names.add(name.toLowerCase());
    }
    for (const [name, erf] of ERFManager.ERFs) {
      if ((erf as any).group === 'Module') names.add(name.toLowerCase());
    }
    return Array.from(names).sort();
  }

  static getItemResRefs(): string[] {
    try {
      return KEYManager.Key.keys
        .filter((k) => k.resType === ResourceTypes.uti)
        .map((k) => k.resRef.toLowerCase())
        .sort();
    } catch {
      return [];
    }
  }

  static getVisualEffectsTable(){
    return GameState.TwoDAManager?.datatables?.get('visualeffects');
  }

  static getVisualEffectRows(): any[] {
    const table = CheatConsoleManager.getVisualEffectsTable();
    if(!table || !table.rows){
      return [];
    }

    return Object.keys(table.rows)
      .map((key) => table.rows[key])
      .filter((row) => !!row);
  }

  static getVisualEffectLabel(row: any): string {
    if(!row){
      return '';
    }

    return `${row.label || row.Label || row.__rowlabel || row.__index || ''}`.trim();
  }

  static formatVisualEffectSuggestion(row: any): string {
    if(!row){
      return '';
    }

    const id = `${row.__rowlabel ?? row.__index ?? ''}`.trim();
    const label = CheatConsoleManager.getVisualEffectLabel(row);
    return label && label !== id ? `${id} ${label}`.trim() : id;
  }

  static getVisualEffectSuggestions(partial: string): string[] {
    const fragment = partial.trim().toLowerCase();
    const rows = CheatConsoleManager.getVisualEffectRows();
    const suggestions = rows.filter((row) => {
      if(!fragment){
        return true;
      }

      const label = CheatConsoleManager.getVisualEffectLabel(row).toLowerCase();
      const id = `${row.__rowlabel ?? row.__index ?? ''}`.toLowerCase();
      return label.includes(fragment) || id.includes(fragment);
    });

    return suggestions
      .slice(0, 20)
      .map((row) => CheatConsoleManager.formatVisualEffectSuggestion(row));
  }

  static getEmitterModelResRefs(): string[] {
    const rows = CheatConsoleManager.getVisualEffectRows();
    const models = new Set<string>();
    const columns = [
      'imp_impact_node',
      'imp_root_s_node',
      'imp_root_m_node',
      'imp_root_l_node',
      'imp_root_h_node',
      'imp_headcon_node'
    ];

    for(const row of rows){
      for(const column of columns){
        const value = `${row?.[column] || ''}`.trim().toLowerCase();
        if(value && value !== '***' && value !== '****'){
          models.add(value);
        }
      }
    }

    return Array.from(models).sort();
  }

  static getEmitterModelSuggestions(partial: string): string[] {
    const fragment = partial.trim().toLowerCase();
    const models = CheatConsoleManager.getEmitterModelResRefs();
    if(!fragment){
      return models.slice(0, 20);
    }
    return models.filter((model) => model.includes(fragment)).slice(0, 20);
  }

  static parseLeadingWholeNumber(value: string | undefined): number | undefined {
    if(typeof value !== 'string'){
      return undefined;
    }

    const match = value.trim().match(/^-?\d+/);
    return match ? CheatConsoleManager.parseWholeNumber(match[0]) : undefined;
  }

  static resolveVisualEffect(query: string): any {
    const trimmedQuery = `${query || ''}`.trim();
    if(!trimmedQuery){
      return undefined;
    }

    const rows = CheatConsoleManager.getVisualEffectRows();
    if(!rows.length){
      return undefined;
    }

    const numericId = CheatConsoleManager.parseLeadingWholeNumber(trimmedQuery);
    if(numericId !== undefined){
      const byId = rows.find((row) => {
        return Number.parseInt(`${row.__rowlabel ?? row.__index}`, 10) === numericId;
      });
      if(byId){
        return byId;
      }
    }

    const normalizedQuery = trimmedQuery.toLowerCase();
    const exact = rows.find((row) => {
      const label = CheatConsoleManager.getVisualEffectLabel(row).toLowerCase();
      const id = `${row.__rowlabel ?? row.__index ?? ''}`.toLowerCase();
      return label === normalizedQuery || id === normalizedQuery;
    });
    if(exact){
      return exact;
    }

    return rows.find((row) => {
      const label = CheatConsoleManager.getVisualEffectLabel(row).toLowerCase();
      const id = `${row.__rowlabel ?? row.__index ?? ''}`.toLowerCase();
      return label.includes(normalizedQuery) || id.includes(normalizedQuery);
    });
  }

  static removeCheatEffectModel(effectModel?: OdysseyModel3D){
    if(!(effectModel instanceof OdysseyModel3D)){
      return false;
    }

    const timer = CheatConsoleManager.cheatEffectCleanupTimers.get(effectModel);
    if(timer){
      clearTimeout(timer);
      CheatConsoleManager.cheatEffectCleanupTimers.delete(effectModel);
    }

    CheatConsoleManager.activeCheatEffectModels.delete(effectModel);

    if(effectModel.parent instanceof OdysseyModel3D && Array.isArray(effectModel.parent.effects)){
      const effectIndex = effectModel.parent.effects.indexOf(effectModel);
      if(effectIndex >= 0){
        effectModel.parent.effects.splice(effectIndex, 1);
      }
    }

    effectModel.removeFromParent();
    effectModel.disableEmitters();
    effectModel.dispose();
    return true;
  }

  static clearCheatEffectModels(): number {
    CheatConsoleManager.cheatEffectGeneration++;
    const models = Array.from(CheatConsoleManager.activeCheatEffectModels);
    for(const model of models){
      CheatConsoleManager.removeCheatEffectModel(model);
    }
    return models.length;
  }

  static triggerModelEmitters(effectModel?: OdysseyModel3D): number {
    if(!(effectModel instanceof OdysseyModel3D)){
      return 0;
    }

    let emitterCount = 0;
    for(const emitter of effectModel.emitters){
      if(emitter.mesh){
        emitter.mesh.frustumCulled = false;
      }
      emitter.detonate();
      emitterCount++;
    }
    return emitterCount;
  }

  static inspectModelEffect(resref: string = ''){
    const normalizedResref = `${resref || ''}`.trim().toLowerCase();
    if(!normalizedResref){
      return { ok: false, message: 'Expected an effect model resref. Example: inspectmdl v_grndeto_fnf' };
    }

    void MDLLoader.loader.load(normalizedResref)
      .then((mdl: OdysseyModel) => {
        if(!(mdl instanceof OdysseyModel)){
          throw new Error(`Model '${normalizedResref}' could not be parsed as an Odyssey model.`);
        }

        return OdysseyModel3D.FromMDL(mdl, {
          context: GameState,
        }).then((model3d) => ({ mdl, model3d }));
      })
      .then(({ mdl, model3d }) => {
        const emitterSummaries = model3d.emitters.map((emitter, index) => ({
          index,
          name: emitter.node?.name,
          updateMode: emitter.node?.updateMode,
          renderMode: emitter.node?.renderMode,
          blendMode: emitter.node?.blendMode,
          texture: emitter.node?.textureResRef,
          birthRate: emitter.birthRate,
          lifeExp: emitter.lifeExp,
          size: {
            x: emitter.size?.x,
            y: emitter.size?.y,
            z: emitter.size?.z,
          },
          velocity: emitter.velocity,
          randomVelocity: emitter.randVelocity,
          spread: emitter.spread,
          colorStart: emitter.colorStart ? emitter.colorStart.getHexString() : undefined,
          colorMid: emitter.colorMid ? emitter.colorMid.getHexString() : undefined,
          colorEnd: emitter.colorEnd ? emitter.colorEnd.getHexString() : undefined,
          opacity: Array.isArray(emitter.opacity) ? [...emitter.opacity] : emitter.opacity,
          sizeCurve: Array.isArray(emitter.sizes) ? [...emitter.sizes] : emitter.sizes,
          hasTexture: !!emitter.material?.uniforms?.map?.value,
          animationFrameStart: emitter.material?.uniforms?.frameRange?.value?.x,
          animationFrameEnd: emitter.material?.uniforms?.frameRange?.value?.y,
          particleCount: emitter.particleCount,
          maxParticleCount: emitter.maxParticleCount,
        }));

        const report = {
          resref: normalizedResref,
          modelName: mdl.geometryHeader?.modelName,
          superModel: mdl.modelHeader?.superModelName,
          classification: mdl.modelHeader?.classification,
          nodeCount: model3d.nodes.size,
          animationCount: model3d.odysseyAnimations.length,
          animations: model3d.odysseyAnimations.map((animation) => ({
            name: animation.name,
            length: animation.length,
            transitionTime: animation.transition,
            events: Array.isArray((animation as any).events) ? (animation as any).events : undefined,
          })),
          emitterCount: model3d.emitters.length,
          emitters: emitterSummaries,
        };

        console.groupCollapsed(`inspectmdl ${normalizedResref}`);
        console.log(report);
        if(emitterSummaries.length){
          console.table(emitterSummaries);
        }
        console.groupEnd();

        model3d.dispose();
      })
      .catch((error) => {
        console.error(`CheatConsoleManager.inspectModelEffect: Failed to inspect '${normalizedResref}'`, error);
      });

    return {
      ok: true,
      message: `Inspecting '${normalizedResref}'. See the developer console for model and emitter details.`
    };
  }

  static playVisualEffect(query: string){
    const player = GameState.getCurrentPlayer();
    if(!player){
      return { ok: false, message: 'Unable to find the current player to receive the effect.' };
    }

    const visualEffect = CheatConsoleManager.resolveVisualEffect(query);
    if(!visualEffect){
      return { ok: false, message: `Unable to resolve a visual effect from '${query}'.` };
    }

    const effectId = Number.parseInt(`${visualEffect.__rowlabel ?? visualEffect.__index}`, 10);
    if(Number.isNaN(effectId)){
      return { ok: false, message: `Visual effect '${query}' is missing a usable numeric id.` };
    }

    const effect = new GameState.GameEffectFactory.EffectVisualEffect();
    effect.setCreator(player);
    effect.setInt(0, effectId);
    effect.initialize();
    player.addEffect(effect, GameEffectDurationType.INSTANT);

    return {
      ok: true,
      message: `Triggered visual effect ${effectId} (${CheatConsoleManager.getVisualEffectLabel(visualEffect) || 'unnamed'}).`
    };
  }

  static playModelEffect(resref: string = '', durationSeconds = 5){
    const player = GameState.getCurrentPlayer();
    const normalizedResref = `${resref || ''}`.trim().toLowerCase();
    if(!player){
      return { ok: false, message: 'Unable to find the current player to attach the effect model.' };
    }

    if(!normalizedResref){
      return { ok: false, message: 'Expected an effect model resref. Example: playmdl v_light 5' };
    }

    const cleanupDelay = Math.max(1, Math.abs(durationSeconds || 5)) * 1000;
    const generation = CheatConsoleManager.cheatEffectGeneration;
    const sourceModule = GameState.module;

    void MDLLoader.loader.load(normalizedResref)
      .then((mdl: OdysseyModel) => {
        if(!(mdl instanceof OdysseyModel)){
          throw new Error(`Model '${normalizedResref}' could not be parsed as an Odyssey model.`);
        }
        return OdysseyModel3D.FromMDL(mdl, {
          context: player.context || GameState,
        });
      })
      .then((effectModel: OdysseyModel3D) => {
        if(!(effectModel instanceof OdysseyModel3D)){
          throw new Error(`Failed to build OdysseyModel3D for '${normalizedResref}'.`);
        }

        if(generation !== CheatConsoleManager.cheatEffectGeneration
          || sourceModule !== GameState.module
          || player !== GameState.getCurrentPlayer()){
          effectModel.dispose();
          return;
        }

        if(player.model instanceof OdysseyModel3D){
          player.model.effects.push(effectModel);
          player.model.add(effectModel);
          effectModel.position.set(0, 0, 0);
          effectModel.rotation.set(0, 0, 0);
          effectModel.quaternion.set(0, 0, 0, 1);
        }else if(GameState.scene){
          GameState.scene.add(effectModel);
          effectModel.position.copy(player.position);
          effectModel.rotation.copy(player.rotation);
          effectModel.quaternion.copy(player.quaternion);
        }

        const animation = effectModel.playAnimation('impact', false)
          || effectModel.playAnimation('duration', true)
          || (effectModel.odysseyAnimations.length ? effectModel.playAnimation(0, false) : undefined);

        CheatConsoleManager.triggerModelEmitters(effectModel);
        TextureLoader.LoadQueue();

        CheatConsoleManager.activeCheatEffectModels.add(effectModel);
        const timeout = setTimeout(() => {
          CheatConsoleManager.removeCheatEffectModel(effectModel);
        }, animation ? Math.max(cleanupDelay, animation.length * 1000) : cleanupDelay);
        CheatConsoleManager.cheatEffectCleanupTimers.set(effectModel, timeout);
      })
      .catch((error) => {
        console.error(`CheatConsoleManager.playModelEffect: Failed to load '${normalizedResref}'`, error);
      });

    return {
      ok: true,
      message: `Loading effect model '${normalizedResref}' and forcing its emitters to fire...`
    };
  }

  /**
   * Returns argument-level autocomplete suggestions for a command.
   * `partial` is the text after the command name (may be empty).
   */
  static getArgumentSuggestions(commandName: string, partial: string): string[] {
    const cmd = commandName.toLowerCase();
    const fragment = partial.toLowerCase();

    switch (cmd) {
      case 'warp': {
        const modules = CheatConsoleManager.getModuleNames();
        if (!fragment) return modules.slice(0, 20);
        return modules.filter((m) => m.includes(fragment)).slice(0, 20);
      }
      case 'giveitem': {
        const items = CheatConsoleManager.getItemResRefs();
        if (!fragment) return items.slice(0, 20);
        return items.filter((r) => r.includes(fragment)).slice(0, 20);
      }
      case 'onepunch': {
        const values = ['on', 'off'];
        if (!fragment) return values;
        return values.filter((value) => value.includes(fragment));
      }
      case 'qol': {
        const values = ['on', 'off'];
        if (!fragment) return values;
        return values.filter((value) => value.includes(fragment));
      }
      case 'playvfx': {
        return CheatConsoleManager.getVisualEffectSuggestions(partial);
      }
      case 'playmdl': {
        return CheatConsoleManager.getEmitterModelSuggestions(partial);
      }
      case 'inspectmdl': {
        return CheatConsoleManager.getEmitterModelSuggestions(partial);
      }
      default:
        return [];
    }
  }

  static invalidNumber(paramName: string): CheatCommandResult {
    return {
      ok: false,
      message: `Expected a valid number for ${paramName}.`
    };
  }

  static notImplemented(commandName: string): CheatCommandResult {
    const definition = CheatConsoleManager.getCommandDefinition(commandName);
    return {
      ok: false,
      command: commandName,
      message: definition
        ? `${definition.command} is listed in the console, but it is not implemented yet.`
        : `${commandName} is not implemented yet.`
    };
  }

  static parseWholeNumber(value: string | undefined): number | undefined {
    if (typeof value !== 'string' || value.trim() === '') {
      return undefined;
    }

    const parsedValue = Number(value);
    if (!Number.isSafeInteger(parsedValue)) {
      return undefined;
    }

    return parsedValue;
  }

  static parseNumber(value: string | undefined): number | undefined {
    if (typeof value !== 'string' || value.trim() === '') {
      return undefined;
    }

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return undefined;
    }

    return parsedValue;
  }

  static parseToggleValue(value: string | undefined): boolean | undefined {
    if (typeof value !== 'string' || value.trim() === '') {
      return undefined;
    }

    switch (value.trim().toLowerCase()) {
      case '1':
      case 'on':
      case 'true':
      case 'enable':
      case 'enabled':
        return true;
      case '0':
      case 'off':
      case 'false':
      case 'disable':
      case 'disabled':
        return false;
      default:
        return undefined;
    }
  }

  static resolveItemResRef(
    preferredResRefs: string[] = [],
    preferredFragments: string[][] = [],
    excludedFragments: string[] = []
  ): string | undefined {
    const itemResRefs = CheatConsoleManager.getItemResRefs();
    if(!itemResRefs.length){
      return undefined;
    }

    const normalizedItems = itemResRefs.map((resref) => resref.toLowerCase());
    const availableItems = new Set(normalizedItems);

    for(const preferredResRef of preferredResRefs){
      const normalizedResRef = preferredResRef.toLowerCase();
      if(availableItems.has(normalizedResRef)){
        return normalizedResRef;
      }
    }

    for(const fragments of preferredFragments){
      const match = normalizedItems.find((resref) => {
        if(excludedFragments.some((fragment) => resref.includes(fragment.toLowerCase()))){
          return false;
        }

        return fragments.every((fragment) => resref.includes(fragment.toLowerCase()));
      });

      if(match){
        return match;
      }
    }

    return undefined;
  }

  static giveResolvedItem(
    preferredResRefs: string[] = [],
    preferredFragments: string[][] = [],
    amount: number = 1,
    excludedFragments: string[] = []
  ){
    amount = Math.abs(amount);
    if(!amount){
      return undefined;
    }

    const resref = CheatConsoleManager.resolveItemResRef(preferredResRefs, preferredFragments, excludedFragments);
    if(!resref){
      return undefined;
    }

    return CheatConsoleManager.giveItem(resref, amount);
  }

  static isOnePunchEnabled(): boolean {
    return CheatConsoleManager.onePunchEnabled;
  }

  static setOnePunchEnabled(enabled: boolean): boolean {
    CheatConsoleManager.onePunchEnabled = enabled;
    return CheatConsoleManager.onePunchEnabled;
  }

  static isQolEnabled(): boolean {
    return CheatConsoleManager.qolEnabled;
  }

  static setQolEnabled(enabled: boolean): boolean {
    CheatConsoleManager.qolEnabled = enabled;
    CheatConsoleManager.sprintToShiftEnabled = enabled;
    ModuleItem.qolLightsaberEnabled = enabled;

    if(!enabled){
      CheatConsoleManager.sprintModifierDown = false;
    }

    return CheatConsoleManager.qolEnabled;
  }

  static isSprintToShiftEnabled(): boolean {
    return CheatConsoleManager.isQolEnabled() && CheatConsoleManager.sprintToShiftEnabled;
  }

  static setSprintModifierDown(down: boolean): boolean {
    CheatConsoleManager.sprintModifierDown = CheatConsoleManager.isSprintToShiftEnabled() ? !!down : false;
    return CheatConsoleManager.sprintModifierDown;
  }

  static smoothTimeDilationValue(currentValue: number, targetValue: number, delta: number): number {
    if(Math.abs(targetValue - currentValue) <= CheatConsoleManager.TIME_DILATION_EPSILON){
      return targetValue;
    }

    const duration = Math.abs(targetValue - 1) <= CheatConsoleManager.TIME_DILATION_EPSILON
      ? CheatConsoleManager.TIME_DILATION_BLEND_OUT_SECONDS
      : CheatConsoleManager.TIME_DILATION_BLEND_IN_SECONDS;

    const blendFactor = 1 - Math.pow(0.001, delta / Math.max(duration, 0.0001));
    const nextValue = currentValue + ((targetValue - currentValue) * blendFactor);

    return Math.abs(targetValue - nextValue) <= CheatConsoleManager.TIME_DILATION_EPSILON
      ? targetValue
      : nextValue;
  }

  static Update(delta: number = 0){
    if(delta <= 0){
      return;
    }

    CheatConsoleManager.currentTimeDilationPlayerSpeedMultiplier = CheatConsoleManager.smoothTimeDilationValue(
      CheatConsoleManager.currentTimeDilationPlayerSpeedMultiplier,
      CheatConsoleManager.timeDilationPlayerSpeedMultiplier,
      delta
    );

    CheatConsoleManager.currentTimeDilationWorldScale = CheatConsoleManager.smoothTimeDilationValue(
      CheatConsoleManager.currentTimeDilationWorldScale,
      CheatConsoleManager.timeDilationWorldScale,
      delta
    );
  }

  static setTimeDilation(playerSpeedMultiplier = 1, worldScale = 1){
    CheatConsoleManager.timeDilationPlayerSpeedMultiplier = Number.isFinite(playerSpeedMultiplier) ? Math.max(0, playerSpeedMultiplier) : 1;
    CheatConsoleManager.timeDilationWorldScale = Number.isFinite(worldScale) ? Math.max(0, worldScale) : 1;

    return {
      playerSpeedMultiplier: CheatConsoleManager.timeDilationPlayerSpeedMultiplier,
      worldScale: CheatConsoleManager.timeDilationWorldScale,
    };
  }

  static getWorldDeltaScale(): number {
    return CheatConsoleManager.currentTimeDilationWorldScale;
  }

  static getCurrentTimeDilationPlayerSpeedMultiplier(): number {
    return CheatConsoleManager.currentTimeDilationPlayerSpeedMultiplier;
  }

  static getMovementSpeedMultiplier(creature: any): number {
    const currentPlayer = GameState.getCurrentPlayer();
    if(!currentPlayer || creature !== currentPlayer){
      return 1;
    }

    let multiplier = CheatConsoleManager.currentTimeDilationPlayerSpeedMultiplier;

    if(CheatConsoleManager.isSprintToShiftEnabled() && CheatConsoleManager.sprintModifierDown){
      multiplier *= CheatConsoleManager.SPRINT_TO_SHIFT_MULTIPLIER;
    }

    return multiplier;
  }

  static shouldApplyOnePunch(attacker: any, target: any): boolean {
    if(!CheatConsoleManager.isOnePunchEnabled()){
      return false;
    }

    const currentPlayer = GameState.getCurrentPlayer();
    if(!currentPlayer || attacker !== currentPlayer || !target){
      return false;
    }

    if(typeof attacker.isHostile === 'function' && !attacker.isHostile(target)){
      return false;
    }

    if(typeof target.getHP !== 'function'){
      return false;
    }

    return target.getHP() > 0;
  }

  static getOnePunchDamage(target: any): number {
    if(!target || typeof target.getHP !== 'function'){
      return 0;
    }

    const currentHP = Math.max(target.getHP(), 0);
    const minimumRemainingHP = target.min1HP ? 1 : 0;
    return Math.max(currentHP - minimumRemainingHP, 0);
  }

  //Gives your character the amount of Dark Side points you want
  static addDarkSide(points: number = 0){
    points = Math.abs(points);
    const player = GameState.getCurrentPlayer();
    if(player){
      player.goodEvil -= points;
      if(player.goodEvil < 0) player.goodEvil = 0;
    }
  }

  //Gives your character the amount of experience points you want
  static addEXP(points: number = 0){
    points = Math.abs(points);
    const player = GameState.getCurrentPlayer();
    if(player){
      player.addXP(points, ExperienceType.PLOT);
    }
  }

  //Increases your character's level to the number you want
  static addLevel(points: number = 0){
    points = Math.abs(points);
    const player = GameState.getCurrentPlayer();
    if(player){
      
    }
  }

  //Gives your character the amount of Light Side points you want
  static addLightSide(points: number = 0){
    points = Math.abs(points);
    const player = GameState.getCurrentPlayer();
    if(player){
      player.goodEvil += points;
      if(player.goodEvil > 100) player.goodEvil = 100;
    }
  }

  //Increases the brightness in the game
  static bright(){

  }

  //Receive (n) computer spikes
  static giveComputerSpikes (amount: number = 100){
    amount = Math.abs(amount);
    return CheatConsoleManager.giveResolvedItem(
      [
        'k_computer_spike',
        'g_i_progspike01',
        'g_i_progspike001'
      ],
      [
        ['computer', 'spike'],
        ['progspike01'],
        ['progspike001'],
        ['progspike']
      ],
      amount,
      ['secspike']
    );
  }

  //Receive the amount of credits you want
  static giveCredits (amount: number = 0){
    amount = Math.abs(amount);
    if(!amount){
      return 0;
    }

    GameState.PartyManager.AddGold(amount);
    return amount;
  }

  static giveItem(resref: string = '', amount: number = 1){
    amount = Math.abs(amount);
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], resref);
    if(buffer){
      const item = new ModuleItem(new GFFObject(buffer));
      item.initProperties();
      item.setStackSize(amount);
      InventoryManager.addItem(item);
      return item;
    }
    return undefined;
  }

  //Receive (n) medkits
  static giveMedPacks (amount: number = 100){
    amount = Math.abs(amount);
    return CheatConsoleManager.giveResolvedItem(
      [
        'g_i_medeqpmnt02',
        'g_i_medeqpmnt002'
      ],
      [
        ['medeqpmnt02'],
        ['medeqpmnt002'],
        ['medeqpmnt', '02']
      ],
      amount
    );
  }

  //Receive (n) repair kits
  static giveRepairKits (amount: number = 100){
    amount = Math.abs(amount);
    return CheatConsoleManager.giveResolvedItem(
      [
        'g_i_drdrepeqp02',
        'g_i_drdrepeqp002'
      ],
      [
        ['drdrepeqp02'],
        ['drdrepeqp002'],
        ['drdrepeqp', '02']
      ],
      amount,
      ['03']
    );
  }

  //Receive (n) repair parts
  static giveParts (amount: number = 99){
    amount = Math.abs(amount);
    return CheatConsoleManager.giveResolvedItem(
      [
        'k_repair_part',
        'g_i_parts01',
        'g_i_parts001'
      ],
      [
        ['repair', 'part'],
        ['parts01'],
        ['parts001'],
        ['parts']
      ],
      amount,
      ['repairkit', 'drdrepeqp', 'component', 'chem']
    );
  }

  //Refills your character's health and Force points
  static heal (){
    const player = GameState.getCurrentPlayer();
    if(player){
      const maxHP = Math.max(player.getMaxHP(), 0);
      const maxFP = Math.max(player.getMaxFP(), 0);

      player.setHP(maxHP);
      player.setFP(maxFP);
      player.forcePoints = maxFP;

      return true;
    }

    return false;
  }

  //Reveals the entire map for the area you're in
  static revealmap() {
    if(GameState?.module?.area?.areaMap){
      GameState.module.area.areaMap.revealEntireMap();
      return true;
    }

    return false;
  }

  //Teleports your characters to a specific location
  static warp (name: string = ''){
    if(name){
      GameState.LoadModule(name)
    }
  }

  //Will display your character's current coordinates
  static whereami (){
    const player = GameState.getCurrentPlayer();
    if(!player){
      return undefined;
    }

    const moduleName = GameState?.module?.filename || 'unknown_module';
    const position = player.position;
    const facing = ((player.getFacing() * 180) / Math.PI + 360) % 360;

    return `${moduleName}: x=${position.x.toFixed(2)}, y=${position.y.toFixed(2)}, z=${position.z.toFixed(2)}, facing=${facing.toFixed(1)}°`;
  }

  static giveRandomLoot(amount: number = 1) {
    const items = KEYManager.Key.keys.filter( (k) => k.resType == ResourceTypes.uti );
    for(let i = 0; i < amount; i++){
      const item = items[Math.floor(Math.random()*items.length)];
      if(item){
        CheatConsoleManager.giveItem(item.resRef, 1);
      }
    }
  }

  static processCommand(command: string): CheatCommandResult {
    const trimmedCommand = command.trim();
    if(!trimmedCommand){
      return {
        ok: false,
        message: 'Enter a cheat command first.'
      };
    }

    const args = trimmedCommand.split(/\s+/);
    const cmd = (args.shift() || '').toLowerCase();
    const params = args.map((param) => param.toLowerCase());

    switch(cmd){
      case 'adddark':
      case 'adddarkside': {
        const points = CheatConsoleManager.parseWholeNumber(params[0]);
        if(points === undefined){
          return CheatConsoleManager.invalidNumber('points');
        }
        CheatConsoleManager.addDarkSide(points);
        return {
          ok: true,
          command: cmd,
          message: `Added ${Math.abs(points)} Dark Side points.`
        };
      }
      case 'addlight':
      case 'addlightside': {
        const points = CheatConsoleManager.parseWholeNumber(params[0]);
        if(points === undefined){
          return CheatConsoleManager.invalidNumber('points');
        }
        CheatConsoleManager.addLightSide(points);
        return {
          ok: true,
          command: cmd,
          message: `Added ${Math.abs(points)} Light Side points.`
        };
      }
      case 'addlevel': {
        return CheatConsoleManager.notImplemented(cmd);
      }
      case 'addxp':
      case 'addexp': {
        const points = CheatConsoleManager.parseWholeNumber(params[0]);
        if(points === undefined){
          return CheatConsoleManager.invalidNumber('points');
        }
        CheatConsoleManager.addEXP(points);
        return {
          ok: true,
          command: cmd,
          message: `Added ${Math.abs(points)} experience.`
        };
      }
      case 'giveitem': {
        const resref = params[0];
        if(!resref){
          return {
            ok: false,
            command: cmd,
            message: 'Expected an item resref. Example: giveitem g_w_lghtsbr01 1'
          };
        }

        const amount = params[1] ? CheatConsoleManager.parseWholeNumber(params[1]) : 1;
        if(amount === undefined){
          return CheatConsoleManager.invalidNumber('amount');
        }

        const item = CheatConsoleManager.giveItem(resref, amount);
        if(!item){
          return {
            ok: false,
            command: cmd,
            message: `Unable to find item '${resref}'.`
          };
        }

        return {
          ok: true,
          command: cmd,
          message: `Added ${Math.abs(amount)}x ${resref} to inventory.`
        };
      }
      case 'givecredits': {
        const amount = CheatConsoleManager.parseWholeNumber(params[0]);
        if(amount === undefined){
          return CheatConsoleManager.invalidNumber('amount');
        }

        CheatConsoleManager.giveCredits(amount);
        return {
          ok: true,
          command: cmd,
          message: `Added ${Math.abs(amount)} credits.`
        };
      }
      case 'givemed': {
        const amount = params[0] ? CheatConsoleManager.parseWholeNumber(params[0]) : 99;
        if(amount === undefined){
          return CheatConsoleManager.invalidNumber('amount');
        }

        const item = CheatConsoleManager.giveMedPacks(amount);
        if(!item){
          return {
            ok: false,
            command: cmd,
            message: 'Unable to resolve an advanced medpack item for the current game.'
          };
        }

        return {
          ok: true,
          command: cmd,
          message: `Added ${Math.abs(amount)} advanced medpack${Math.abs(amount) === 1 ? '' : 's'}.`
        };
      }
      case 'giverepair': {
        const amount = params[0] ? CheatConsoleManager.parseWholeNumber(params[0]) : 100;
        if(amount === undefined){
          return CheatConsoleManager.invalidNumber('amount');
        }

        const item = CheatConsoleManager.giveRepairKits(amount);
        if(!item){
          return {
            ok: false,
            command: cmd,
            message: 'Unable to resolve an advanced repair kit item for the current game.'
          };
        }

        return {
          ok: true,
          command: cmd,
          message: `Added ${Math.abs(amount)} repair kit${Math.abs(amount) === 1 ? '' : 's'}.`
        };
      }
      case 'givecomspikes': {
        const amount = params[0] ? CheatConsoleManager.parseWholeNumber(params[0]) : 100;
        if(amount === undefined){
          return CheatConsoleManager.invalidNumber('amount');
        }

        const item = CheatConsoleManager.giveComputerSpikes(amount);
        if(!item){
          return {
            ok: false,
            command: cmd,
            message: 'Unable to resolve a computer spike item for the current game.'
          };
        }

        return {
          ok: true,
          command: cmd,
          message: `Added ${Math.abs(amount)} computer spike${Math.abs(amount) === 1 ? '' : 's'}.`
        };
      }
      case 'giveparts': {
        const amount = params[0] ? CheatConsoleManager.parseWholeNumber(params[0]) : 99;
        if(amount === undefined){
          return CheatConsoleManager.invalidNumber('amount');
        }

        const item = CheatConsoleManager.giveParts(amount);
        if(!item){
          return {
            ok: false,
            command: cmd,
            message: 'Unable to resolve a repair parts item for the current game.'
          };
        }

        return {
          ok: true,
          command: cmd,
          message: `Added ${Math.abs(amount)} repair part${Math.abs(amount) === 1 ? '' : 's'}.`
        };
      }
      case 'heal': {
        const healed = CheatConsoleManager.heal();
        if(!healed){
          return {
            ok: false,
            command: cmd,
            message: 'Unable to find the current player to heal.'
          };
        }

        return {
          ok: true,
          command: cmd,
          message: 'Restored health and Force points to maximum.'
        };
      }
      case 'qol': {
        const requestedState = params[0] ? CheatConsoleManager.parseToggleValue(params[0]) : undefined;
        if(params[0] && requestedState === undefined){
          return {
            ok: false,
            command: cmd,
            message: "Expected 'on' or 'off'. Example: qol on"
          };
        }

        const enabled = requestedState === undefined
          ? CheatConsoleManager.setQolEnabled(!CheatConsoleManager.isQolEnabled())
          : CheatConsoleManager.setQolEnabled(requestedState);

        return {
          ok: true,
          command: cmd,
          message: enabled
            ? 'Quality of life cheats enabled. Active features: sprint-to-shift, enhanced lightsabers.'
            : 'Quality of life cheats disabled.'
        };
      }
      case 'timedilation': {
        const playerSpeed = CheatConsoleManager.parseNumber(params[0]);
        if(playerSpeed === undefined){
          return CheatConsoleManager.invalidNumber('playerSpeed');
        }

        const worldScale = CheatConsoleManager.parseNumber(params[1]);
        if(worldScale === undefined){
          return CheatConsoleManager.invalidNumber('worldScale');
        }

        if(playerSpeed < 0 || worldScale < 0){
          return {
            ok: false,
            command: cmd,
            message: 'Expected non-negative numbers. Example: timedilation 1.0 0.6'
          };
        }

        const settings = CheatConsoleManager.setTimeDilation(playerSpeed, worldScale);
        const disabled = settings.playerSpeedMultiplier === 1 && settings.worldScale === 1;

        return {
          ok: true,
          command: cmd,
          message: disabled
            ? 'Time dilation disabled. Player speed and world scale reset to normal.'
            : `Time dilation set. Player speed: ${settings.playerSpeedMultiplier.toFixed(2)}x. World scale: ${settings.worldScale.toFixed(2)}x.`
        };
      }
      case 'onepunch': {
        const requestedState = params[0] ? CheatConsoleManager.parseToggleValue(params[0]) : undefined;
        if(params[0] && requestedState === undefined){
          return {
            ok: false,
            command: cmd,
            message: "Expected 'on' or 'off'. Example: onepunch on"
          };
        }

        const enabled = requestedState === undefined
          ? CheatConsoleManager.setOnePunchEnabled(!CheatConsoleManager.isOnePunchEnabled())
          : CheatConsoleManager.setOnePunchEnabled(requestedState);

        return {
          ok: true,
          command: cmd,
          message: enabled
            ? 'One Punch mode enabled. Hostile enemies hit by the current player will be dropped to 0 HP, or 1 HP if they are protected by Min1HP.'
            : 'One Punch mode disabled.'
        };
      }
      case 'revealmap': {
        const revealed = CheatConsoleManager.revealmap();
        if(!revealed){
          return {
            ok: false,
            command: cmd,
            message: 'Unable to reveal the map for the current area.'
          };
        }

        return {
          ok: true,
          command: cmd,
          message: 'Revealed the full map for the current area.'
        };
      }
      case 'warp': {
        const moduleName = params[0];
        if(!moduleName){
          return {
            ok: false,
            command: cmd,
            message: 'Expected a module name. Example: warp tar_m02aa'
          };
        }

        CheatConsoleManager.warp(moduleName);
        return {
          ok: true,
          command: cmd,
          message: `Warping to ${moduleName}...`
        };
      }
      case 'whereami': {
        const location = CheatConsoleManager.whereami();
        if(!location){
          return {
            ok: false,
            command: cmd,
            message: 'Unable to resolve the current player position.'
          };
        }

        return {
          ok: true,
          command: cmd,
          message: location
        };
      }
      case 'giverandomloot': {
        const amount = params[0] ? CheatConsoleManager.parseWholeNumber(params[0]) : 1;
        if(amount === undefined){
          return CheatConsoleManager.invalidNumber('amount');
        }
        CheatConsoleManager.giveRandomLoot(amount);
        return {
          ok: true,
          command: cmd,
          message: `Added ${Math.abs(amount)} random loot drop${Math.abs(amount) === 1 ? '' : 's'}.`
        };
      }
      case 'playvfx': {
        const visualEffectQuery = args.join(' ').trim();
        if(!visualEffectQuery){
          return {
            ok: false,
            command: cmd,
            message: 'Expected a visual effect id or label. Example: playvfx 123'
          };
        }

        const result = CheatConsoleManager.playVisualEffect(visualEffectQuery);
        return {
          ok: result.ok,
          command: cmd,
          message: result.message
        };
      }
      case 'playmdl': {
        const resref = params[0];
        if(!resref){
          return {
            ok: false,
            command: cmd,
            message: 'Expected an effect model resref. Example: playmdl v_light 5'
          };
        }

        const durationSeconds = params[1] ? CheatConsoleManager.parseWholeNumber(params[1]) : 5;
        if(durationSeconds === undefined){
          return CheatConsoleManager.invalidNumber('seconds');
        }

        const result = CheatConsoleManager.playModelEffect(resref, durationSeconds);
        return {
          ok: result.ok,
          command: cmd,
          message: result.message
        };
      }
      case 'inspectmdl': {
        const resref = params[0];
        if(!resref){
          return {
            ok: false,
            command: cmd,
            message: 'Expected an effect model resref. Example: inspectmdl v_grndeto_fnf'
          };
        }

        const result = CheatConsoleManager.inspectModelEffect(resref);
        return {
          ok: result.ok,
          command: cmd,
          message: result.message
        };
      }
      case 'clearvfx': {
        const cleared = CheatConsoleManager.clearCheatEffectModels();
        return {
          ok: true,
          command: cmd,
          message: cleared
            ? `Removed ${cleared} active cheat VFX model${cleared === 1 ? '' : 's'}.`
            : 'No active cheat VFX models were running.'
        };
      }
      default: {
        const suggestions = CHEAT_COMMANDS
          .filter((definition) => definition.command.startsWith(cmd))
          .slice(0, 3)
          .map((definition) => definition.command);

        return {
          ok: false,
          command: cmd,
          message: suggestions.length
            ? `Unknown command '${cmd}'. Try ${suggestions.join(', ')}.`
            : `Unknown command '${cmd}'. Open Help to see available cheats.`
        };
      }
    }
  }

}
