import { GameEffect } from "@/effects/GameEffect";
import { GameState } from "@/GameState";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { MDLLoader } from "@/loaders";
import { OdysseyModel } from "@/odyssey";
import { OdysseyModel3D, OdysseyObject3D } from "@/three/odyssey";
import type { ModuleObject } from "@/module/ModuleObject";
import type * as THREE from "three";

/**
 * EffectBeam class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file EffectBeam.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectBeam extends GameEffect {
  modelName: string;
  model: OdysseyModel3D;
  visualEffect: any;

  constructor(){
    super();
    this.type = GameEffectType.EffectBeam;

    //intList[0] : visualeffects.2da id
    //intList[1] : BODY_NODE_* on oEffector (beam origin)
    //intList[2] : hit or miss

    //objectList[0] : caster / oEffector
  }

  initialize() {
    if(this.initialized)
      return this;

    const visualeffects2DA = GameState.TwoDAManager.datatables.get('visualeffects');
    if(visualeffects2DA){
      this.visualEffect = visualeffects2DA.getByID(this.getInt(0));
    }

    super.initialize();

    switch(this.visualEffect.progfx_duration){
      case 616:
        this.modelName = 'v_coldray_dur';
      break;
      case 612:
        this.modelName = 'v_deathfld_dur';
      break;
      case 613:
        this.modelName = 'v_drain_dur';
      break;
      case 611:
        this.modelName = 'v_drdkill_dur';
      break;
      case 610:
        this.modelName = 'v_drddisab_dur';
      break;
      case 620:
        this.modelName = 'v_drdstun_dur';
      break;
      case 614:
        this.modelName = 'v_flame_dur';
      break;
      case 619:
        this.modelName = 'v_fstorm_dur';
      break;
      case 617:
        this.modelName = 'v_ionray01_dur';
      break;
      case 618:
        this.modelName = 'v_ionray02_dur';
      break;
      case 609:
        this.modelName = 'v_lightnx_dur';
      break;
      case 608:
        this.modelName = 'v_lightns_dur';
      break;
      case 621:
        this.modelName = 'v_fshock_dur';
      break;
      case 615:
        this.modelName = 'v_stunray_dur';
      break;
      default:
        this.modelName = 'v_coldray_dur';
      break;
    }
    return this;
  }

  loadModel(): Promise<void> {
    return new Promise<void>( ( resolve ) => {
      MDLLoader.loader.load(this.modelName)
      .then((mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          context: this.object.context,
          onComplete: (model: OdysseyModel3D) => {
            this.model = model;
            resolve();
          }
        });
      }).catch(() => {
        resolve();
      });
    });
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();

    if(!(this.model instanceof OdysseyModel3D))
      return;

    const caster = this.getCaster();
    if(!(caster?.model instanceof OdysseyModel3D))
      return;

    // nwscript: nBodyPart is the origin on oEffector (BODY_NODE_HAND → handconjure).
    const origin = this.resolveBodyNode(caster, this.getInt(1)) || caster.model;
    origin.add(this.model);

    // Beam end = ApplyEffectToObject target. MDL omenref (v_coldray_dur omenref01)
    // is the default preview hook; EffectBeam retargets Lightning via setReferenceNode.
    const targetModel = this.object?.model;
    if(targetModel){
      this.model.setEmitterTarget(targetModel);
    }
  }

  /**
   * Map BODY_NODE_* (nwscript.nss) → named hooks on the effector model.
   * BODY_NODE_HAND (0) → handconjure per Bioware note on the constant.
   */
  private resolveBodyNode(
    obj: ModuleObject,
    bodyNode: number
  ): OdysseyObject3D | THREE.Object3D | undefined {
    const model = obj?.model;
    if(!(model instanceof OdysseyModel3D)) return undefined;

    const byName = (name: string) =>
      (obj as ModuleObject).getModelNodeByName?.(name) ||
      (model as any)[name] ||
      model.nodes?.get(name);

    switch(bodyNode | 0){
      case 0: // BODY_NODE_HAND
        return byName('handconjure') || byName('rhand');
      case 1: // BODY_NODE_CHEST
        return byName('impact') || byName('lookathook') || byName('rootdummy');
      case 2: // BODY_NODE_HEAD
        return byName('headhook') || byName('headconjure');
      case 3: // BODY_NODE_HAND_LEFT
        return byName('lhand');
      case 4: // BODY_NODE_HAND_RIGHT
        return byName('rhand');
      default:
        return undefined;
    }
  }

  update(delta = 0){
    super.update(delta);

    if(this.durationEnded && this.getDurationType() == GameEffectDurationType.TEMPORARY){
      return;
    }
  }

  getCaster(){
    return this.getObject(0);
  }

}
