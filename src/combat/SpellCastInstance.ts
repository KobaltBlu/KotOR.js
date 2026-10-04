import type { ModuleObject } from "@/module";
import type { TalentSpell } from "@/talents";
import * as THREE from "three";
import { OdysseyModel3D } from "@/three/odyssey";
import { OdysseyModel } from "@/odyssey";
import { GameState } from "@/GameState";
import { MDLLoader } from "@/loaders";

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
  conjureTime = 3000;
  conjuring: boolean = false;
  castTime: number = 0;
  private disposed = false;
  private handEffectTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(caster: ModuleObject, target: ModuleObject, spell: TalentSpell){
    this.context = caster.context;
    this.owner = caster;
    this.target = target;
    this.spell = spell;
  }

  init(){
    if(this.disposed) return;
    this.projectileHook = undefined;
    this.projectileOrigin = new THREE.Vector3();
    this.projectileTarget = new THREE.Vector3();
    this.projectileCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    );

    if(this.target){
      this.projectileTarget.copy(this.target.position);
      this.projectileTarget.x += Math.random() * 0.5 - 0.25;
      this.projectileTarget.y += Math.random() * 0.5 - 0.25;
      this.projectileCurve.v2.copy(this.projectileTarget);
    }

    if(this.spell.projmodel){
      MDLLoader.loader.load(this.spell.projmodel.toLowerCase())
        .then((mdl: OdysseyModel) => {
          if(this.disposed || this.impacted || this.completed || this.owner.destroyed) return;
          return OdysseyModel3D.FromMDL(mdl, { context: this.owner.context });
        })
        .then((model: OdysseyModel3D | undefined) => {
          if(!model) return;
          if(this.disposed || this.impacted || this.completed || this.owner.destroyed || !this.owner.model?.rhand){
            model.dispose();
            return;
          }
          this.projectile = model;
          this.owner.context.group.effects.add(model);
          this.projectileHook = this.owner.model.rhand;
        })
        .catch(error => console.error('Unable to load spell projectile', error));
    }
  }

  update(delta: number = 0){
    if(this.disposed) return;
    if(this.conjureTime > 0){
      this.conjuring = true;
      this.conjureTime -= 1000 * delta;
      if(this.projectile && this.projectileHook){
        this.projectileHook.getWorldPosition(this.projectile.position);
        this.projectileOrigin.copy(this.projectile.position);
        this.projectileCurve.v0.copy(this.projectileOrigin);
      }
    }else if(this.castTime > 0){
      this.conjuring = false;
      this.castTimeProgress = Math.min(this.castTime / (this.spell.getCastTime() * 0.5), 1);
      if(this.projectile && !this.projectileDistance){
        this.projectileDistance = this.projectileTarget.clone().sub(this.projectileOrigin);
        this.projectileCurve.v1.copy(this.projectileDistance).multiplyScalar(0.25).add(this.projectileOrigin);
        this.projectileCurve.v1.z += 2;
      }
      if(this.spell.range != 'L') this.impact();
      if(this.projectile && this.projectileDistance){
        this.projectile.position.copy(this.projectileCurve.getPoint(1 - this.castTimeProgress));
      }
      this.castTime -= 1000 * delta;
    }else{
      this.conjuring = false;
      if(this.spell.range == 'L') this.impact();
      this.completed = true;
    }
    this.casthandmodel?.update(delta);
    this.projectile?.update(delta);
  }

  impact(){
    if(this.disposed || this.impacted) return;
    this.impacted = true;

    if(this.owner?.combatData) this.owner.combatData.lastForcePowerSuccess = true;
    if(this.target?.combatData) this.target.combatData.lastForcePowerSuccess = true;

    if(this.impactscript){
      const instance = GameState.NWScript.Load(this.impactscript);
      if(instance){
        instance.talent = this.spell;
        instance.run(this.owner, 0);
      }
    }

    if(this.casthandvisual){
      MDLLoader.loader.load(this.casthandvisual)
        .then((mdl: OdysseyModel) => {
          if(this.disposed || this.owner.destroyed) return;
          return OdysseyModel3D.FromMDL(mdl, { context: this.owner.context });
        })
        .then((model: OdysseyModel3D | undefined) => {
          if(!model) return;
          if(this.disposed || this.owner.destroyed || !this.owner.model?.lhand){
            model.dispose();
            return;
          }
          this.casthandmodel = model;
          this.owner.model.lhand.add(model);
          const anim = model.playAnimation('cast01', false);
          this.handEffectTimer = setTimeout(() => {
            this.handEffectTimer = undefined;
            model.dispose();
            if(this.casthandmodel === model) this.casthandmodel = undefined;
          }, anim ? anim.length * 1000 : 1500);
        })
        .catch(error => console.error('Unable to load spell hand effect', error));
    }

    this.projectile?.dispose();
    this.projectile = undefined;
  }

  dispose(){
    if(this.disposed) return;
    this.disposed = true;
    if(this.handEffectTimer !== undefined) clearTimeout(this.handEffectTimer);
    this.handEffectTimer = undefined;
    this.casthandmodel?.dispose();
    this.casthandmodel = undefined;
    this.projectile?.dispose();
    this.projectile = undefined;
    this.projectileHook = undefined;
    this.container?.removeFromParent();
  }
}
