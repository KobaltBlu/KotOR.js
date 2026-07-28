import type { ModuleObject } from "@/module";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { TalentSpell } from "@/talents";
import * as THREE from "three";
import { OdysseyModel3D } from "@/three/odyssey";
import { OdysseyModel } from "@/odyssey";
import { GameState } from "@/GameState";
import { MDLLoader, TextureLoader } from "@/loaders";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { getCounterSpellRange } from "@/combat/spell-range";
import {
  calculateLastSpellProjectileTimeMs,
  resolveSpellProjectilePathType,
  shouldDelaySpellImpactToLanding,
} from "@/combat/spell-projectile-time";
import { resolveSpellProjectileModelCandidates } from "@/combat/spell-projectile-model";
import { sampleSpellProjectilePosition } from "@/combat/spell-projectile-motion";
import { playSpellProjectileTravelAnimation } from "@/combat/combat-projectile";
import { playGrenadeBounceAtPosition } from "@/combat/grenade-sound";
import { isGrenadeItemType } from "@/combat/item-cast-grenade";
import type { ModuleItem } from "@/module/ModuleItem";
import { EventBroadcastSafeProjectile } from "@/events/EventBroadcastSafeProjectile";
import { ProjectilePath } from "@/enums/combat/ProjectilePath";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";

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
  impactscript: string;
  casthandvisual: string;
  flags: number;

  impacted: boolean = false;
  completed: boolean = false;
  interrupted: boolean = false;
  /** When false, skip counterspell scan (fake / item casts may opt out). */
  allowCounterSpell: boolean = true;
  /**
   * When true, run impact at end of projectile flight (grenade / throw),
   * matching retail SpellCastAndImpact delayed impact — not at cast-start.
   */
  impactAtProjectileLanding: boolean = false;
  /** Initial flight duration when impactAtProjectileLanding (for progress 1→0). */
  private flightDurationMs = 0;
  /** Optional path override from ActionCastSpell param 9. */
  projectilePathOverride: number = -1;
  /** Item used for cast (grenade model fallback when projmodel empty). */
  castItem: ModuleItem | undefined;
  /** Snapshot of MDL resrefs at cast start — survives item destroy. */
  projectileModelCandidates: string[] = [];
  /** Retail SetBehaviorListSpiral rand handedness (±1). */
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

  /**
   * Stamp retail spell-target fields so GetSpellTargetLocation / GetSpellTargetObject
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
    // Only overwrite the throw location when we have a real object target
    if(this.target && this.target !== this.owner){
      this.targetLocation.copy(this.target.position);
      this.projectileTarget.copy(this.target.position);
      if(this.target.combatData){
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
    // Retail SpellCastAndImpact item/throw path defaults to 6 when spawning
    if(shouldDelaySpellImpactToLanding(this.spell, this.impactAtProjectileLanding)){
      return ProjectilePath.GRENADE;
    }
    return ProjectilePath.DEFAULT;
  }

  /**
   * Retail HandleServerToPlayerSafeProjectileSpell projspwnpoint byte:
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

    // Retail CalculateLastSpellProjectileTime for delayed-impact throws / L / W
    if(shouldDelaySpellImpactToLanding(this.spell, this.impactAtProjectileLanding)){
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
      this.castTime = 0;
    }

    const castItem =
      this.castItem ||
      (this.owner as ModuleCreature)?.spellCastItem as ModuleItem | undefined;
    if(castItem && BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
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

    // Single-process: SpellCastInstance.castTime IS the retail AddEventDeltaTime
    // delay — run impactscript in impact() at landing. Do not also queue
    // EventSpellImpact here (that path skipped impact() and often never fired).
    this.spiralSign = Math.random() < 0.5 ? -1 : 1;
    void this.spawnProjectileModel();
  }

  /**
   * Load spells.2da projmodel, falling back to the thrown item MDL (grenades).
   * Retail CSWCProjectile loads projmodel; empty grenade rows use the item mesh.
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

  /** Retail HandleServerToPlayerSafeProjectileSpell Play3DOneShotSound(projsound). */
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
    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
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
      if(!BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature)){
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

      // Instant non-projectile spells impact at cast-start; throws / L impact on land
      if(!delayImpactToLanding){
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

      if(delayImpactToLanding){
        this.impact();
      }

      this.completed = true;
      this.clearOwnerSpellRound({ unpause: false });
    }

    if(this.casthandmodel){
      this.casthandmodel.update(delta);
    }

    if(this.projectile){
      this.projectile.update(delta);
    }
  }

  impact(){
    if(this.impacted || this.interrupted){
      LOG('impact skipped', {
        impacted: this.impacted,
        interrupted: this.interrupted,
      });
      return;
    }
    this.impacted = true;

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

    // Retail GrenadeSND bounce at impact point for grenade item casts
    const castItem =
      this.castItem ||
      (this.owner as ModuleCreature)?.spellCastItem as ModuleItem | undefined;
    if(isGrenadeItemType(castItem?.baseItem?.itemType)){
      playGrenadeBounceAtPosition(this.projectileTarget || this.targetLocation, this.owner);
    }

    // Retail EventSpellImpact (0x08) runs the impactscript after flight.
    // SpellCastInstance.castTime is that delay in-process — run it here.
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

    if(this.casthandvisual != ''){
      MDLLoader.loader.load(this.casthandvisual)
      .then((mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          context: this.owner.context
        }).then((model: OdysseyModel3D) => {
          this.casthandmodel = model;

          if(this.owner.model){
            // Retail LoadCastVisual attaches to conjure hooks (handconjure / rhand)
            const hand =
              this.owner.model.handconjure ||
              this.owner.model.rhand ||
              this.owner.model.lhand;
            if(hand){
              hand.add(this.casthandmodel);

              const anim = this.casthandmodel.playAnimation('cast01', false);
              setTimeout(() => {
                this.casthandmodel.dispose();
              }, (anim ? anim.length * 1000 : 1500) )
            }else{
              this.casthandmodel.dispose();
            }
          }else{
            this.casthandmodel.dispose();
          }

        });
      });
    }

    if(this.projectile){
      this.projectile.dispose();
      this.projectile = undefined as any;
    }

  }

  dispose(){
    try{
      if(this.casthandmodel) this.casthandmodel.dispose();
    }catch(_e){ /* already disposed */ }
    try{
      if(this.projectile) this.projectile.dispose();
    }catch(_e){ /* already disposed */ }
    this.casthandmodel = undefined as any;
    this.projectile = undefined as any;
    if(this.container) this.container.removeFromParent();
  }

}
