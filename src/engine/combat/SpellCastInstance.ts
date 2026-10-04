import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import type { TalentSpell } from "@engine/talents";
import * as THREE from "three";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import { GameState } from "@engine/runtime/GameState";
import { MDLLoader, TextureLoader } from "@engine/loaders";
import { ActionType } from "@core/enums/actions/ActionType";
import { Utility } from "@core/utility/Utility";
import { getCounterSpellRange } from "@engine/combat/spell-range";
import {
  calculateLastSpellProjectileTimeMs,
  resolveSpellProjectilePathType,
  shouldDelaySpellImpactToLanding,
} from "@engine/combat/spell-projectile-time";
import { resolveSpellProjectileModelCandidates } from "@engine/combat/spell-projectile-model";
import { sampleSpellProjectilePosition } from "@engine/combat/spell-projectile-motion";
import { playSpellProjectileTravelAnimation } from "@engine/combat/combat-projectile";
import { isGrenadeItemType } from "@engine/combat/item-cast-grenade";
import type { ModuleItem } from "@engine/module/ModuleItem";
import { EventBroadcastSafeProjectile } from "@engine/events/EventBroadcastSafeProjectile";
import { ProjectilePath } from "@core/enums/combat/ProjectilePath";
import { AudioPriorityGroup } from "@core/enums/audio/AudioPriorityGroup";
import { SWGrenadeSound } from "@engine/rules/SWGrenadeSound";

import { isCreature } from "@engine/module/guards/isCreature";

const _projLookAhead = new THREE.Vector3();

/** Debug prefix — filter console on `[SpellCast]`. */
const LOG = (...args: unknown[]) => console.log('[SpellCast]', ...args);

/**
 * SpellCastInstance class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file SpellCastInstance.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SpellCastInstance {

  context: GameState;
  spell: TalentSpell;
  owner: ModuleObject;
  target: ModuleObject;
  targetLocation: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  container: THREE.Object3D = new THREE.Object3D();

  conjtime: string;
  casttime: string;
  catchtime: string;
  conjanim: string;
  hostilesetting: number;
  iconresref: any;
  projectileHook: any;
  projectileOrigin: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  projectileTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  projectileCurve: THREE.QuadraticBezierCurve3;

  projectile: OdysseyModel3D;
  castTimeProgress: number = 0;
  projectileDistance: THREE.Vector3;
  casthandmodel: OdysseyModel3D;
  castheadmodel: OdysseyModel3D;
  castgrndmodel: OdysseyModel3D;
  impactscript: string;
  casthandvisual: string;
  castheadvisual: string;
  castgrndvisual: string;
  castsound: string;
  flags: number;

  impacted: boolean = false;
  completed: boolean = false;
  interrupted: boolean = false;
  /** When false, skip counterspell scan (fake / item casts may opt out). */
  allowCounterSpell: boolean = true;
  /**
   * When true, run impact at end of projectile flight (grenade / throw),
   * matching SpellCastAndImpact delayed impact — not at cast-start.
   */
  impactAtProjectileLanding: boolean = false;
  /**
   * Keep the thrown mesh on the caster hand hook (no flight) until
   * {@link releaseFromHandHold} — used for grenade throw wind-up.
   */
  holdOnHand: boolean = false;
  /** Initial flight duration when impactAtProjectileLanding (for progress 1→0). */
  private flightDurationMs = 0;
  /** Optional path override from ActionCastSpell param 9. */
  projectilePathOverride: number = -1;
  /** Item used for cast (grenade model fallback when projmodel empty). */
  castItem: ModuleItem | undefined;
  /** Snapshot of MDL resrefs at cast start — survives item destroy. */
  projectileModelCandidates: string[] = [];
  /** LoadCastVisual + castsound fired once at cast-phase start. */
  private castPhaseStarted = false;
  /** SetBehaviorListSpiral rand handedness (±1). */
  private spiralSign: number = 1;
  conjureTime = 3000;
  conjuring: boolean = false;
  castTime: number = 0;

  constructor(caster: ModuleObject, target: ModuleObject, spell: TalentSpell){
    this.context = caster.context;
    this.owner = caster;
    this.target = target;
    this.spell = spell;
  }

  /**
   * Apply conjure/cast timings and impact script from the talent.
   */
  applySpellData(options: { fake?: boolean } = {}){
    if(options.fake){
      this.impactscript = '';
      this.allowCounterSpell = false;
    }else{
      this.impactscript = this.spell?.impactscript || '';
      this.allowCounterSpell = true;
    }

    const conjMs = SpellCastInstance.parseTimeMs(this.spell?.getConjureTime?.() ?? this.spell?.conjtime, 3000);
    const castMs = SpellCastInstance.parseTimeMs(this.spell?.getCastTime?.() ?? this.spell?.casttime, 0);
    this.conjureTime = conjMs;
    this.castTime = castMs;
    this.casthandvisual = this.spell?.casthandvisual || '';
    this.castheadvisual = this.spell?.castheadvisual || '';
    this.castgrndvisual = this.spell?.castgrndvisual || '';
    this.castsound = this.spell?.castsound || '';
  }

  /**
   * End hand-hold wind-up and start projectile flight (grenade release).
   * Samples the current hand world position as the flight origin.
   */
  releaseFromHandHold(flightMs: number){
    this.holdOnHand = false;
    this.conjureTime = 0;
    if(this.projectile && this.projectileHook){
      this.projectileHook.getWorldPosition(this.projectile.position);
      this.projectileOrigin.copy(this.projectile.position);
      this.projectileCurve.v0.copy(this.projectileOrigin);
    }else if(this.projectile){
      this.projectileOrigin.copy(this.projectile.position);
      this.projectileCurve.v0.copy(this.projectileOrigin);
    }else{
      this.projectileOrigin.copy(this.owner.position);
      this.projectileCurve.v0.copy(this.projectileOrigin);
    }
    // Clear so the next update begins flight from the sampled origin.
    this.projectileDistance = undefined as any;
    if(flightMs > 0){
      this.castTime = Math.max(this.castTime || 0, flightMs);
      this.flightDurationMs = flightMs;
      this.impactAtProjectileLanding = true;
    }else{
      this.castTime = 0;
      this.flightDurationMs = 0;
      this.impactAtProjectileLanding = false;
    }
  }

  private static parseTimeMs(value: unknown, fallback: number): number {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    if(isNaN(n) || n < 0){
      return fallback;
    }
    // spells.2da values are milliseconds; tiny values treated as seconds
    if(n > 0 && n < 20){
      return n * 1000;
    }
    return n;
  }

  private static pickGrenadeSoundRowField(
    row: Record<string, any> | undefined,
    ...keys: string[]
  ): string {
    if(!row) return '';
    const lowerMap: Record<string, any> = {};
    for(const key of Object.keys(row)){
      lowerMap[key.toLowerCase()] = row[key];
    }
    for(let i = 0; i < keys.length; i++){
      const value = lowerMap[keys[i].toLowerCase()];
      if(value != null && String(value).trim() !== '' && String(value) !== '****'){
        return String(value).trim();
      }
    }
    return '';
  }

  static getGrenadeSoundBySurfaceId(surfaceId: number): SWGrenadeSound | undefined {
    if(!Number.isFinite(surfaceId) || surfaceId < 0) return undefined;
    const fromRules = GameState.SWRuleSet?.grenadeSounds?.[surfaceId | 0];
    if(fromRules) return fromRules;

    const table = GameState.TwoDAManager?.datatables?.get('grenadesnd');
    if(!table) return undefined;
    const row =
      table.getByID?.(surfaceId) ||
      table.rows?.[surfaceId] ||
      table.rows?.[String(surfaceId)];
    return row ? SWGrenadeSound.From2DA(row) : undefined;
  }

  static getGrenadeSoundByLabel(label: string): SWGrenadeSound | undefined {
    const needle = String(label || '').trim().toLowerCase();
    if(!needle) return undefined;

    const list = GameState.SWRuleSet?.grenadeSounds;
    if(list?.length){
      for(let i = 0; i < list.length; i++){
        if((list[i]?.label || '').toLowerCase() === needle) return list[i];
      }
    }

    const table = GameState.TwoDAManager?.datatables?.get('grenadesnd');
    if(!table?.rows) return undefined;
    const keys = Object.keys(table.rows);
    for(let i = 0; i < keys.length; i++){
      const row = table.rows[keys[i]];
      if(SpellCastInstance.pickGrenadeSoundRowField(row, 'label').toLowerCase() === needle){
        return SWGrenadeSound.From2DA(row);
      }
    }
    return undefined;
  }

  static resolveSurfaceIdAtPosition(position: THREE.Vector3): number {
    const rooms = GameState.module?.area?.rooms;
    if(!rooms?.length || !position) return -1;
    for(let i = 0; i < rooms.length; i++){
      const faces = rooms[i]?.collisionManager?.walkmesh?.walkableFaces;
      if(!faces) continue;
      for(let j = 0; j < faces.length; j++){
        const face = faces[j];
        if(face?.triangle?.containsPoint?.(position)){
          return face.walkIndex | 0;
        }
      }
    }
    return -1;
  }

  static playGrenadeBounceSoundAt(
    surfaceId: number,
    position: THREE.Vector3,
    emitterOwner?: ModuleObject
  ): void {
    const resref = SpellCastInstance.getGrenadeSoundBySurfaceId(surfaceId)?.getSoundResRef();
    if(!resref) return;

    const emitter = emitterOwner?.audioEmitter;
    if(emitter && typeof emitter.playSound === 'function'){
      emitter.setPosition?.(position.x, position.y, position.z);
      emitter.playSound(resref);
      return;
    }

    const area = GameState.module?.area as any;
    if(area?.audioEmitter?.playSound){
      area.audioEmitter.setPosition?.(position.x, position.y, position.z);
      area.audioEmitter.playSound(resref);
    }
  }

  static playGrenadeBounceAtPosition(
    position: THREE.Vector3,
    emitterOwner?: ModuleObject
  ): void {
    const surfaceId = SpellCastInstance.resolveSurfaceIdAtPosition(position);
    if(surfaceId < 0) return;
    SpellCastInstance.playGrenadeBounceSoundAt(surfaceId, position, emitterOwner);
  }

  /**
   * Stamp spell-target fields so GetSpellTargetLocation / GetSpellTargetObject
   * work for item casts that never called useTalentOnObject.
   */
  stampSpellTarget(){
    if(this.spell){
      // Keep undefined / invalid for location casts — do not stamp the caster
      this.spell.oTarget = this.target;
    }
    const owner = this.owner as ModuleCreature;
    if(owner?.combatData){
      owner.combatData.lastSpellTarget = this.target;
    }
    // Object target (incl. self): keep location in sync for GetSpellTargetLocation
    if(this.target){
      this.targetLocation.copy(this.target.position);
      this.projectileTarget.copy(this.target.position);
      if(this.target !== this.owner && this.target.combatData){
        this.target.combatData.lastSpellAttacker = this.owner;
      }
    }
    this.owner.spellTargetPosition.copy(this.targetLocation);
  }

  /**
   * Notify the single-process BroadcastSafeProjectile path. Only skip the
   * event spawn when this instance already attached a projectile mesh.
   */
  private notifySafeProjectileBroadcast(alreadySpawned: boolean){
    const flightMs = Math.max(1, this.castTime | 0);
    const pathType = this.resolveProjectilePathType();
    const evt = new EventBroadcastSafeProjectile();
    evt.setCaller(this.owner);
    evt.setObject(this.owner);
    evt.spellId = this.spell?.id ?? -1;
    evt.targetId = this.target?.id ?? 0x7F000000;
    evt.flightMs = flightMs;
    evt.projectilePath = pathType;
    evt.itemId =
      this.castItem?.id ??
      (this.owner as ModuleCreature)?.spellCastItem?.id ??
      0;
    const hookPos = new THREE.Vector3();
    if(this.projectileHook?.getWorldPosition){
      this.projectileHook.getWorldPosition(hookPos);
      evt.origin.copy(hookPos);
    }else{
      evt.origin.copy(this.owner.position);
    }
    evt.destination.copy(this.projectileTarget || this.targetLocation);
    evt.alreadySpawned = alreadySpawned;
    evt.execute();
  }

  private resolveProjectilePathType(): number {
    if(this.projectilePathOverride >= 0){
      return this.projectilePathOverride | 0;
    }
    const fromType = resolveSpellProjectilePathType(this.spell?.projtype);
    if(fromType !== ProjectilePath.DEFAULT){
      return fromType;
    }
    // Delayed throws / item casts default to grenade ground-ballistic path
    if(shouldDelaySpellImpactToLanding(this.spell, this.impactAtProjectileLanding)){
      return ProjectilePath.GRENADE;
    }
    return ProjectilePath.DEFAULT;
  }

  /**
   * HandleServerToPlayerSafeProjectileSpell projspwnpoint byte:
   * 1/hand → handconjure, 2/head → headconjure, 3/rhand → rhand, else root.
   */
  private resolveProjectileHook(): any {
    const spawn = String(this.spell?.projspwnpoint ?? '').toLowerCase().trim();
    const model = this.owner?.model;
    if(!model) return undefined;
    const asNum = parseInt(spawn, 10);
    const kind = Number.isFinite(asNum) && String(asNum) === spawn
      ? asNum
      : spawn;
    if(kind === 1 || kind === 'hand' || kind === 'handconjure' || kind === 'throw' || !spawn || spawn === '****'){
      return model.handconjure || model.rhand || undefined;
    }
    if(kind === 2 || kind === 'head' || kind === 'headconjure'){
      return model.headconjure || model.head || model.rhand || undefined;
    }
    if(kind === 3 || kind === 'rhand' || kind === 'right'){
      return model.rhand || model.handconjure || undefined;
    }
    if(kind === 'lhand' || kind === 'left'){
      return model.lhand || model.rhand || undefined;
    }
    return model.rhand || model.handconjure || undefined;
  }

  init(){
    this.projectileHook = undefined;
    this.projectileOrigin = new THREE.Vector3();
    this.projectileTarget = new THREE.Vector3();
    this.projectileCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3( 0, 0, 0 ),
      new THREE.Vector3( 0, 0, 0 ),
      new THREE.Vector3( 0, 0, 0 )
    );

    if(this.target){
      this.projectileTarget.copy(this.target.position);
      this.projectileTarget.x += Math.random() * (0.25 - -0.25) + -0.25;
      this.projectileTarget.y += Math.random() * (0.25 - -0.25) + -0.25;
      this.projectileCurve.v2.copy(this.projectileTarget);
    }else if(this.targetLocation){
      this.projectileTarget.copy(this.targetLocation);
      this.projectileCurve.v2.copy(this.projectileTarget);
    }

    this.stampSpellTarget();

    // CalculateLastSpellProjectileTime for delayed-impact throws / L / W.
    // Hand-hold wind-up defers flight timing until releaseFromHandHold.
    // proj==0 only means no projectile delay — keep spells.2da casttime for VFX.
    if(this.holdOnHand){
      this.impactAtProjectileLanding = false;
      this.castTime = 0;
      this.conjureTime = 0;
    }else if(shouldDelaySpellImpactToLanding(this.spell, this.impactAtProjectileLanding)){
      this.impactAtProjectileLanding = true;
      const origin = this.owner.position;
      const dest = this.projectileTarget || this.targetLocation;
      const distance = origin.distanceTo(dest);
      // Delay uses spell path field (+2500 only when path==6); do not force 6
      const pathType =
        this.projectilePathOverride >= 0
          ? this.projectilePathOverride
          : resolveSpellProjectilePathType(this.spell?.projtype);
      const flightMs = calculateLastSpellProjectileTimeMs(distance, pathType);
      this.castTime = Math.max(this.castTime || 0, flightMs);
    }else if(typeof this.spell?.proj === 'number' && (this.spell.proj | 0) === 0){
      this.impactAtProjectileLanding = false;
    }

    const castItem =
      this.castItem ||
      (this.owner as ModuleCreature)?.spellCastItem as ModuleItem | undefined;
    if(castItem && isCreature(this.owner)){
      (this.owner as ModuleCreature).spellCastItem = castItem;
    }

    // Snapshot resrefs before DecrementUses may destroy the item object
    this.projectileModelCandidates = resolveSpellProjectileModelCandidates(
      this.spell,
      castItem
    );

    LOG('init', {
      spellId: this.spell?.id,
      impactscript: this.impactscript,
      proj: this.spell?.proj,
      projmodel: this.spell?.projmodel,
      projtype: this.spell?.projtype,
      candidates: this.projectileModelCandidates.slice(),
      castTime: this.castTime,
      impactAtLanding: this.impactAtProjectileLanding,
      conjureTime: this.conjureTime,
      targetId: this.target?.id,
      targetLoc: {
        x: this.projectileTarget?.x,
        y: this.projectileTarget?.y,
        z: this.projectileTarget?.z,
      },
      spellTargetPos: {
        x: this.owner.spellTargetPosition?.x,
        y: this.owner.spellTargetPosition?.y,
        z: this.owner.spellTargetPosition?.z,
      },
      hasEffectsGroup: !!this.owner.context?.group?.effects,
      castItemId: castItem?.id,
    });

    // Single-process: SpellCastInstance.castTime IS the AddEventDeltaTime
    // delay — run impactscript in impact at landing. Do not also queue
    // EventSpellImpact here (that path skipped impact and often never fired).
    this.spiralSign = Math.random() < 0.5 ? -1 : 1;
    void this.spawnProjectileModel();
  }

  /**
   * Load spells.2da projmodel, falling back to the thrown item MDL (grenades).
   * projectile loads projmodel; empty grenade rows use the item mesh.
   */
  private async spawnProjectileModel(){
    const candidates =
      this.projectileModelCandidates.length > 0
        ? this.projectileModelCandidates
        : resolveSpellProjectileModelCandidates(this.spell, this.castItem);

    LOG('spawnProjectileModel start', { candidates: candidates.slice() });

    for(const resRef of candidates){
      if(this.completed || this.interrupted){
        LOG('spawn aborted (completed/interrupted)', {
          completed: this.completed,
          interrupted: this.interrupted,
          resRef,
        });
        return;
      }
      try{
        const mdl = await MDLLoader.loader.load(resRef);
        if(!mdl || this.completed || this.interrupted){
          LOG('spawn mdl miss or aborted', {
            resRef,
            hasMdl: !!mdl,
            completed: this.completed,
            interrupted: this.interrupted,
          });
          continue;
        }
        const model = await OdysseyModel3D.FromMDL(mdl, {
          context: this.owner.context,
          lighting: true,
        });
        if(!model || this.completed || this.interrupted){
          LOG('spawn FromMDL miss or aborted', {
            resRef,
            hasModel: !!model,
            completed: this.completed,
            interrupted: this.interrupted,
          });
          model?.dispose?.();
          continue;
        }
        const group = this.owner.context?.group?.effects;
        if(!group){
          LOG('spawn FAIL no effects group', { resRef });
          model.dispose();
          continue;
        }
        this.projectile = model;
        group.add(model);
        TextureLoader.LoadQueue?.();
        this.attachProjectileToHook(model);
        playSpellProjectileTravelAnimation(model);
        this.playProjectileLaunchSound();
        LOG('spawn OK', {
          resRef,
          origin: {
            x: this.projectileOrigin?.x,
            y: this.projectileOrigin?.y,
            z: this.projectileOrigin?.z,
          },
          hook: !!this.projectileHook,
        });
        // Mesh attached — skip BroadcastSafeProjectile duplicate
        this.notifySafeProjectileBroadcast(true);
        return;
      }catch(e){
        LOG('spawn candidate error', { resRef, error: String(e) });
      }
    }

    if(!this.completed && !this.interrupted){
      LOG('spawn FALLBACK BroadcastSafeProjectile', {
        candidatesTried: candidates.slice(),
      });
      this.notifySafeProjectileBroadcast(false);
    }
  }

  private attachProjectileToHook(model: OdysseyModel3D){
    const hook = this.owner.model ? this.resolveProjectileHook() : undefined;
    if(hook){
      this.projectileHook = hook;
      hook.getWorldPosition(model.position);
      this.projectileOrigin.copy(model.position);
      this.projectileCurve.v0.copy(this.projectileOrigin);
    }else{
      this.projectileOrigin.copy(this.owner.position);
      this.projectileCurve.v0.copy(this.projectileOrigin);
      model.position.copy(this.projectileOrigin);
    }
  }

  /** HandleServerToPlayerSafeProjectileSpell Play3DOneShotSound(projsound). */
  private playProjectileLaunchSound(){
    const resRef = String(this.spell?.projsound ?? '').trim().toLowerCase();
    if(!resRef || resRef === '****') return;
    const emitter = (this.owner as ModuleCreature).audioEmitter;
    if(!emitter?.playSoundFireAndForget) return;
    const pos = this.projectileOrigin || this.owner.position;
    emitter.setPosition?.(pos.x, pos.y, pos.z);
    emitter.setPriorityGroupId?.(AudioPriorityGroup.NORMAL_SPELL_EFFECTS);
    emitter.playSoundFireAndForget(resRef);
  }

  private static isEmptyVisualResRef(value: unknown): boolean {
    const s = String(value ?? '').trim();
    return !s || s === '****';
  }

  /**
   * LoadCastVisual + castsound — once at cast-phase start.
   * Head → headconjure, hand → handconjure, ground → root; loop cast01.
   */
  private beginCastPhase(){
    if(this.castPhaseStarted || this.completed || this.interrupted) return;
    this.castPhaseStarted = true;
    this.playCastSound();
    void this.loadCastVisuals();
    LOG('beginCastPhase', {
      spellId: this.spell?.id,
      castsound: this.castsound,
      castheadvisual: this.castheadvisual,
      casthandvisual: this.casthandvisual,
      castgrndvisual: this.castgrndvisual,
      castTime: this.castTime,
    });
  }

  private playCastSound(){
    const resRef = String(this.castsound ?? '').trim().toLowerCase();
    if(SpellCastInstance.isEmptyVisualResRef(resRef)) return;
    const emitter = (this.owner as ModuleCreature).audioEmitter;
    if(!emitter?.playSoundFireAndForget) return;
    const pos = this.owner.position;
    emitter.setPosition?.(pos.x, pos.y, pos.z);
    emitter.setPriorityGroupId?.(AudioPriorityGroup.NORMAL_SPELL_EFFECTS);
    emitter.playSoundFireAndForget(resRef);
  }

  private async loadCastVisuals(){
    const model = this.owner?.model;
    if(!model) return;

    const specs: {
      resRef: string;
      hook: any;
      assign: (m: OdysseyModel3D) => void;
    }[] = [];

    if(!SpellCastInstance.isEmptyVisualResRef(this.castheadvisual)){
      specs.push({
        resRef: String(this.castheadvisual).trim().toLowerCase(),
        hook: model.headconjure || model.head || undefined,
        assign: (m) => { this.castheadmodel = m; },
      });
    }
    if(!SpellCastInstance.isEmptyVisualResRef(this.casthandvisual)){
      specs.push({
        resRef: String(this.casthandvisual).trim().toLowerCase(),
        hook: model.handconjure || model.rhand || model.lhand || undefined,
        assign: (m) => { this.casthandmodel = m; },
      });
    }
    if(!SpellCastInstance.isEmptyVisualResRef(this.castgrndvisual)){
      specs.push({
        resRef: String(this.castgrndvisual).trim().toLowerCase(),
        hook: model.root || model || undefined,
        assign: (m) => { this.castgrndmodel = m; },
      });
    }

    for(const spec of specs){
      if(this.completed || this.interrupted) return;
      try{
        const mdl = await MDLLoader.loader.load(spec.resRef);
        if(!mdl || this.completed || this.interrupted) continue;
        const visual = await OdysseyModel3D.FromMDL(mdl, {
          context: this.owner.context,
        });
        if(!visual || this.completed || this.interrupted){
          visual?.dispose?.();
          continue;
        }
        if(spec.hook?.add){
          spec.hook.add(visual);
        }else if(model.add){
          model.add(visual);
        }else{
          visual.dispose();
          continue;
        }
        TextureLoader.LoadQueue?.();
        // PlayAnimation("cast01", loop=1)
        visual.playAnimation('cast01', true);
        spec.assign(visual);
      }catch(e){
        LOG('cast visual load error', { resRef: spec.resRef, error: String(e) });
      }
    }
  }

  private syncProjectileOrientation(from: THREE.Vector3, to: THREE.Vector3){
    if(!this.projectile) return;
    if(to.distanceToSquared(from) > 0.0001){
      this.projectile.lookAt(to);
    }
  }

  /**
   * Cancel cast before impact. Skips impact script and cleans VFX.
   */
  interrupt(){
    if(this.completed || this.interrupted){
      return;
    }
    LOG('interrupt', {
      spellId: this.spell?.id,
      impacted: this.impacted,
      castTime: this.castTime,
      hasProjectile: !!this.projectile,
    });
    this.interrupted = true;
    this.conjuring = false;
    this.conjureTime = 0;
    this.castTime = 0;
    this.completed = true;
    this.clearOwnerSpellRound({ unpause: true });
    this.dispose();
  }

  private clearOwnerSpellRound(options: { unpause?: boolean } = {}){
    const round = (this.owner as any)?.combatRound;
    if(isCreature(this.owner)){
      (this.owner as ModuleCreature).itemSpellCastActive = false;
    }
    if(!round){
      return;
    }
    if(typeof round.removeSpellActionFromRound === 'function'){
      round.removeSpellActionFromRound();
    }else{
      round.spellCastRound = false;
    }
    // Interrupt aborts the cast pause; normal complete leaves pauseTimer for catch-time
    if(options.unpause && typeof round.unpauseRound === 'function'){
      round.unpauseRound(this.owner);
    }
  }

  /**
   * True if a living counterspeller is holding stance on this caster.
   */
  findCounterSpeller(): ModuleCreature | undefined {
    if(!this.allowCounterSpell || !this.owner?.area){
      return undefined;
    }
    const creatures = this.owner.area.creatures || [];
    const party = GameState.PartyManager?.party || [];
    const candidates = [...creatures];
    for(let i = 0; i < party.length; i++){
      if(candidates.indexOf(party[i]) < 0){
        candidates.push(party[i]);
      }
    }

    for(let i = 0; i < candidates.length; i++){
      const creature = candidates[i] as ModuleCreature;
      if(!isCreature(creature)){
        continue;
      }
      if(creature === this.owner || creature.isDead?.() || creature.isDebilitated?.()){
        continue;
      }
      if(creature.area !== this.owner.area){
        continue;
      }
      const action = creature.action || creature.actionQueue?.[0];
      if(!action || action.type !== ActionType.ActionCounterSpell){
        continue;
      }
      const focus = action.getParameter?.(0);
      const focusId = typeof focus === 'number' ? focus : (focus as ModuleObject)?.id;
      if(focus !== this.owner && focusId !== this.owner.id){
        continue;
      }
      if(Utility.Distance2D(creature.position, this.owner.position) > getCounterSpellRange()){
        continue;
      }
      return creature;
    }
    return undefined;
  }

  update(delta: number = 0){
    if(this.completed || this.interrupted){
      return;
    }

    // Grenade throw wind-up: mesh stays on handconjure/rhand until release.
    if(this.holdOnHand){
      if(this.projectile && this.projectileHook){
        this.projectileHook.getWorldPosition(this.projectile.position);
        this.projectileOrigin.copy(this.projectile.position);
        this.projectileCurve.v0.copy(this.projectileOrigin);
      }
      if(this.projectile){
        this.projectile.update(delta);
      }
      if(this.casthandmodel){
        this.casthandmodel.update(delta);
      }
      if(this.castheadmodel){
        this.castheadmodel.update(delta);
      }
      if(this.castgrndmodel){
        this.castgrndmodel.update(delta);
      }
      return;
    }

    const delayImpactToLanding = shouldDelaySpellImpactToLanding(
      this.spell,
      this.impactAtProjectileLanding
    );
    if(this.conjureTime > 0){
      this.conjuring = true;

      if(this.findCounterSpeller()){
        this.interrupt();
        return;
      }

      this.conjureTime -= (1000 * delta);

      if(this.projectile && this.projectileHook){
        this.projectileHook.getWorldPosition(this.projectile.position);
        this.projectileOrigin.copy(this.projectile.position);
        this.projectileCurve.v0.copy(this.projectileOrigin);
      }
    }else if(this.castTime > 0){
      this.conjuring = false;
      this.beginCastPhase();

      // Item casts skip conjure — keep mesh on handconjure until flight starts
      if(this.projectile && this.projectileHook && !this.projectileDistance){
        this.projectileHook.getWorldPosition(this.projectile.position);
        this.projectileOrigin.copy(this.projectile.position);
        this.projectileCurve.v0.copy(this.projectileOrigin);
      }

      const durationForProgress = Math.max(
        1,
        this.impactAtProjectileLanding
          ? this.castTime
          : SpellCastInstance.parseTimeMs(
              (this.spell.getCastTime?.() as any) || this.castTime || 1,
              this.castTime
            ) * 0.5
      );
      // Progress 1→0 as remaining castTime drains (curve uses 1 - progress)
      if(!this.impactAtProjectileLanding){
        this.castTimeProgress = this.castTime / durationForProgress;
        if(this.castTimeProgress > 1){
          this.castTimeProgress = 1;
        }
      }else{
        if(this.flightDurationMs <= 0){
          this.flightDurationMs = this.castTime;
        }
        const flight = Math.max(1, this.flightDurationMs);
        this.castTimeProgress = Math.min(1, Math.max(0, this.castTime / flight));
      }

      if(this.projectile && !this.projectileDistance){
        this.projectileDistance = this.projectileTarget.clone().sub(this.projectileOrigin);
      }

      // Instant non-projectile spells impact once at cast-start; throws / L on land
      if(!delayImpactToLanding && !this.impacted){
        this.impact();
      }

      if(this.projectile && this.projectileDistance){
        const t = 1 - this.castTimeProgress;
        const pathType = this.resolveProjectilePathType();
        const flightMs = this.flightDurationMs || this.castTime;
        sampleSpellProjectilePosition(
          pathType,
          this.projectileOrigin,
          this.projectileTarget,
          t,
          this.projectile.position,
          { totalMs: flightMs, spiralSign: this.spiralSign }
        );
        sampleSpellProjectilePosition(
          pathType,
          this.projectileOrigin,
          this.projectileTarget,
          Math.min(1, t + 0.05),
          _projLookAhead,
          { totalMs: flightMs, spiralSign: this.spiralSign }
        );
        this.syncProjectileOrientation(this.projectile.position, _projLookAhead);
      }

      this.castTime -= (1000 * delta);
    }else{
      this.conjuring = false;

      // Instant spells with casttime 0 still get castsound / cast visuals once
      this.beginCastPhase();

      // Delayed throws impact on landing; instant / proj==0 impact when conjure ends
      if(delayImpactToLanding || !this.impacted){
        this.impact();
      }

      this.completed = true;
      this.clearOwnerSpellRound({ unpause: false });
    }

    if(this.castheadmodel){
      this.castheadmodel.update(delta);
    }
    if(this.casthandmodel){
      this.casthandmodel.update(delta);
    }
    if(this.castgrndmodel){
      this.castgrndmodel.update(delta);
    }

    if(this.projectile){
      this.projectile.update(delta);
    }
  }

  impact(){
    if(this.impacted || this.interrupted){
      return;
    }
    this.impacted = true;
    // InstantUseItem / zero-casttime paths may call impact without update
    this.beginCastPhase();

    this.stampSpellTarget();

    const impactPos = this.projectileTarget || this.targetLocation;
    LOG('impact', {
      spellId: this.spell?.id,
      impactscript: this.impactscript,
      impactPos: impactPos
        ? { x: impactPos.x, y: impactPos.y, z: impactPos.z }
        : undefined,
      spellTargetPos: {
        x: this.owner.spellTargetPosition?.x,
        y: this.owner.spellTargetPosition?.y,
        z: this.owner.spellTargetPosition?.z,
      },
      talentTargetId: this.spell?.oTarget?.id,
    });

    // GrenadeSND bounce at impact point for grenade item casts
    const castItem =
      this.castItem ||
      (this.owner as ModuleCreature)?.spellCastItem as ModuleItem | undefined;
    if(isGrenadeItemType(castItem?.baseItem?.itemType)){
      SpellCastInstance.playGrenadeBounceAtPosition(
        this.projectileTarget || this.targetLocation,
        this.owner
      );
    }

    // EventSpellImpact (0x08) runs the impactscript after flight.
    // SpellCastInstance.castTime is that delay in-process — run it here.
    if(isCreature(this.owner)){
      const cd = (this.owner as ModuleCreature).combatData;
      if(cd){
        cd.lastForcePowerSuccess = true;
      }
    }
    const script = String(this.impactscript || '').trim();
    if(script && script !== '****'){
      const instance = GameState.NWScript.Load(script);
      if(instance) {
        LOG('impactscript run', { script });
        instance.talent = this.spell;
        instance.run(this.owner, 0);
      }else{
        LOG('impactscript LOAD FAILED', { script });
      }
    }else{
      LOG('impactscript empty — no AoE/VFX from NSS', {
        raw: this.impactscript,
      });
    }

    // Cast visuals are owned by beginCastPhase / LoadCastVisual for the full
    // casttime window — do not re-spawn a one-shot hand glow here.

    if(this.projectile){
      this.projectile.dispose();
      this.projectile = undefined as any;
    }

  }

  dispose(){
    try{
      if(this.castheadmodel) this.castheadmodel.dispose();
    }catch(_e){ /* already disposed */ }
    try{
      if(this.casthandmodel) this.casthandmodel.dispose();
    }catch(_e){ /* already disposed */ }
    try{
      if(this.castgrndmodel) this.castgrndmodel.dispose();
    }catch(_e){ /* already disposed */ }
    try{
      if(this.projectile) this.projectile.dispose();
    }catch(_e){ /* already disposed */ }
    this.castheadmodel = undefined as any;
    this.casthandmodel = undefined as any;
    this.castgrndmodel = undefined as any;
    this.projectile = undefined as any;
    if(this.container) this.container.removeFromParent();
  }

}
