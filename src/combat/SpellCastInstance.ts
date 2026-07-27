import type { ModuleObject } from "@/module";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { TalentSpell } from "@/talents";
import * as THREE from "three";
import { OdysseyModel3D } from "@/three/odyssey";
import { OdysseyModel } from "@/odyssey";
import { GameState } from "@/GameState";
import { MDLLoader } from "@/loaders";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { getCounterSpellRange } from "@/combat/spell-range";
import { playGrenadeBounceAtPosition } from "@/combat/grenade-sound";
import { isGrenadeItemType } from "@/combat/item-cast-grenade";
import type { ModuleItem } from "@/module/ModuleItem";
import { EventBroadcastSafeProjectile } from "@/events/EventBroadcastSafeProjectile";

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
  projectileOrigin: THREE.Vector3;
  projectileTarget: THREE.Vector3;
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
   * Notify the single-process BroadcastSafeProjectile path. SpellCastInstance
   * already owns the projmodel when one loaded — mark alreadySpawned so the
   * event does not double-spawn.
   */
  private notifySafeProjectileBroadcast(){
    const flightMs = Math.max(1, this.castTime | 0);
    const hasProjModel = !!(this.spell?.projmodel && String(this.spell.projmodel).trim() && this.spell.projmodel !== '****');
    const evt = new EventBroadcastSafeProjectile();
    evt.setCaller(this.owner);
    evt.setObject(this.owner);
    evt.spellId = this.spell?.id ?? -1;
    evt.targetId = this.target?.id ?? 0x7F000000;
    evt.flightMs = flightMs;
    evt.projectilePath = 6;
    evt.origin.copy(this.owner.position);
    evt.destination.copy(this.projectileTarget || this.targetLocation);
    // SpellCastInstance loads projmodel asynchronously — skip the event spawn
    // whenever the spell has a projectile model so we do not double-draw.
    evt.alreadySpawned = hasProjModel;
    evt.execute();
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

    if(this.spell?.projmodel != ''){
      MDLLoader.loader.load(this.spell.projmodel.toLowerCase())
      .then((mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          context: this.owner.context
        }).then((model: OdysseyModel3D) => {
          this.projectile = model;
          if(this.owner.model){
            if(this.owner.model.rhand){
              this.owner.context.group.effects.add(model);
              this.projectileHook = this.owner.model.rhand;
            }else{
              this.projectile.dispose();
            }
          }else{
            this.projectile.dispose();
          }
        });
      });
    }

    this.notifySafeProjectileBroadcast();
  }

  /**
   * Cancel cast before impact. Skips impact script and cleans VFX.
   */
  interrupt(){
    if(this.completed || this.interrupted){
      return;
    }
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

    const delayImpactToLanding =
      this.impactAtProjectileLanding ||
      this.spell?.range === 'L' ||
      this.spell?.range === 'W';

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

      // Item casts skip conjure — sample rhand origin once before flight
      if(this.projectile && this.projectileHook && this.projectileOrigin.lengthSq() === 0){
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
        this.projectileCurve.v1.copy(this.projectileDistance).multiplyScalar(0.25).add(this.projectileOrigin);
        this.projectileCurve.v1.z += 2
      }

      // Instant non-projectile spells impact at cast-start; throws / L impact on land
      if(!delayImpactToLanding){
        this.impact();
      }

      if(this.projectile && this.projectileDistance){
        this.projectile.position.copy( this.projectileCurve.getPoint((1 - this.castTimeProgress)) );
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
    if(this.impacted || this.interrupted) return;
    this.impacted = true;

    this.stampSpellTarget();

    // Retail GrenadeSND bounce at impact point for grenade item casts
    const castItem = (this.owner as ModuleCreature)?.spellCastItem as ModuleItem | undefined;
    if(isGrenadeItemType(castItem?.baseItem?.itemType)){
      playGrenadeBounceAtPosition(this.projectileTarget || this.targetLocation, this.owner);
    }

    if(this.impactscript != ''){
      const instance = GameState.NWScript.Load(this.impactscript);
      if(instance) {
        instance.talent = this.spell;
        instance.run(this.owner, 0);
      };
    }

    if(this.casthandvisual != ''){
      MDLLoader.loader.load(this.casthandvisual)
      .then((mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          context: this.owner.context
        }).then((model: OdysseyModel3D) => {
          this.casthandmodel = model;

          if(this.owner.model){
            if(this.owner.model.lhand){
              this.owner.model.lhand.add(this.casthandmodel);

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
