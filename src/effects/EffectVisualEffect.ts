import { AudioEmitter } from "@/audio/AudioEmitter";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import { MDLLoader, TextureLoader } from "@/loaders";
// import { TwoDAManager } from "@/managers";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { OdysseyModel } from "@/odyssey";
import { OdysseyModel3D } from "@/three/odyssey";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { GameEffect } from "@/effects/GameEffect";
import {
  MOTION_BLUR_PROGFX_ENABLE,
  isMotionBlurProgFX,
} from "@/shaders/pass/FrameBufferEffectGates";

/**
 * EffectVisualEffect class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectVisualEffect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectVisualEffect extends GameEffect {
  visualEffect: any;
  model: OdysseyModel3D;
  impact_model: OdysseyModel3D;
  impact_root_model: OdysseyModel3D;
  impact_head_model: OdysseyModel3D;
  impactTimer: number;
  impactRootTimer: number;
  impactHeadTimer: number;
  /** Set in onRemove — async MDL loads must not attach after dispose. */
  private disposed: boolean = false;
  /** In-flight impact/root/head/progFX model loads. */
  private pendingImpactLoads: number = 0;
  /** ApplyBumpedOutShell — shell lives on creature model, not this.model. */
  private bumpedOutShell: boolean = false;
  /**
   * impact-phase hardcoded VFX timer.
   * Default 1000ms in — then RemoveBumpedOutShell for type_fd 'F'.
   * Undefined = inactive; <0 = already fired.
   */
  private impactProgFXTimerMs: number | undefined = undefined;
  /** ApplyMotionBlur — this effect holds a motionBlurVFXCount ref. */
  private motionBlurActive: boolean = false;

  constructor(){
    super();
    this.type = GameEffectType.EffectVisualEffect;

    //intList[0] : VisualEffect.2da Id

  }

  initialize(){
    super.initialize();

    const visualeffects2DA = GameState.TwoDAManager.datatables.get('visualeffects');
    if(visualeffects2DA){
      this.visualEffect = visualeffects2DA.getByID(this.getInt(0));
    }

    return this;
  }

  update(delta = 0){
    super.update(delta);

    if(this.disposed){
      return;
    }

    if(this.durationEnded && this.getDurationType() == GameEffectDurationType.TEMPORARY){
      return;
    }

    // Update — impact progFX expires after ~1s
    if(this.impactProgFXTimerMs != null && this.impactProgFXTimerMs >= 0){
      this.impactProgFXTimerMs -= 1000 * delta;
      if(this.impactProgFXTimerMs <= 0){
        this.impactProgFXTimerMs = -1;
        this.removeBumpedOutShell();
        this.tryFinishFireAndForget();
      }
    }

    //Impact Node
    if(this.impact_model){
      if(this.impactTimer == undefined){
        this.impactTimer = 3000;
        if(this.visualEffect?.type_fd == 'D'){
          this.impact_model.playAnimation('duration', true);
        }else if(this.visualEffect?.type_fd == 'F'){
          this.impact_model.playAnimation('impact');
        }
      }

      if(this.impactTimer <= 0){
        this.disposeImpactModel('impact_model');
        this.tryFinishFireAndForget();
      }else{
        this.impact_model.update(delta);
        this.impactTimer -= 1000 * delta;
      }
    }

    //Root Node
    if(this.impact_root_model){
      if(this.impactRootTimer == undefined){
        this.impactRootTimer = 3000;
        if(this.visualEffect?.type_fd == 'D'){
          this.impact_root_model.playAnimation('duration', true);
        }else if(this.visualEffect?.type_fd == 'F'){
          this.impact_root_model.playAnimation('impact');
        }
      }

      if(this.impactRootTimer <= 0){
        this.disposeImpactModel('impact_root_model');
        this.tryFinishFireAndForget();
      }else{
        this.impact_root_model.update(delta);
        this.impactRootTimer -= 1000 * delta;
      }
    }

    //Head Conjure
    if(this.impact_head_model){
      if(this.impactHeadTimer == undefined){
        this.impactHeadTimer = 3000;
        if(this.visualEffect?.type_fd == 'D'){
          this.impact_head_model.playAnimation('duration', true);
        }else if(this.visualEffect?.type_fd == 'F'){
          this.impact_head_model.playAnimation('impact');
        }
      }

      if(this.impactHeadTimer <= 0){
        this.disposeImpactModel('impact_head_model');
        this.tryFinishFireAndForget();
      }else{
        this.impact_head_model.update(delta);
        this.impactHeadTimer -= 1000 * delta;
      }
    }

    if(this.model){

      this.model.animationManager.currentAnimation = undefined;

      if(this.object.model && this.model){
        for(let node of this.object.model.nodes){
          let c_node = this.model.nodes.get(node[0]);
          c_node.position.copy(node[1].position);
          c_node.quaternion.copy(node[1].quaternion);
          c_node.scale.copy(node[1].scale);
        }
      }

      // Facing lives on the object container (rotation.z), not model.rotation.
      this.model.position.copy(this.object.position);
      this.model.rotation.copy(this.object.rotation);
      this.model.quaternion.copy(this.object.quaternion);

      this.model.update(delta);

    }

  }

  private disposeImpactModel(key: 'impact_model' | 'impact_root_model' | 'impact_head_model'){
    const model = this[key];
    if(model instanceof OdysseyModel3D){
      try{ model.dispose(); }catch(_e){ /* ignore */ }
    }
    this[key] = undefined;
  }

  /** Fire-and-forget (type_fd 'F'): remove effect once all impact models / impact progFX finish. */
  private tryFinishFireAndForget(){
    if(this.disposed) return;
    if(this.visualEffect?.type_fd != 'F') return;
    if(this.pendingImpactLoads > 0) return;
    if(this.impactProgFXTimerMs != null && this.impactProgFXTimerMs >= 0) return;
    if(this.impact_model || this.impact_root_model || this.impact_head_model || this.model) return;
    if(this.object){
      this.object.removeEffect(this);
    }else{
      this.onRemove();
    }
  }

  private beginImpactLoad(){
    this.pendingImpactLoads++;
  }

  private endImpactLoad(){
    this.pendingImpactLoads = Math.max(0, this.pendingImpactLoads - 1);
  }

  onApply(){
    if(this.applied)
      return;

    super.onApply();

    if(!this.visualEffect){
      this.applied = true;
      return;
    }

    if(BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature)){

      //FireAndForget
      if(this.visualEffect.type_fd == 'F'){
        //Handle progfx_Impact
        this.progFX_Impact();
      }

      this.impact();

      //Duration
      if(this.visualEffect.type_fd == 'D'){
        //Handle progfx_Duration
        this.progFX_Duration();
      }

      //Beam
      if(this.visualEffect.type_fd == 'B'){
      }

      // F-type with no impact models / only progFX: finish once impact timer clears.
      this.tryFinishFireAndForget();

    }else if(typeof this.object != 'undefined'){
      this.impact();
    }

    this.applied = true;
  }

  getImpactRootModel(){
    if(BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature)){
      const creature = this.object as ModuleCreature;
      switch(creature.getAppearance().sizecategory){
        case 1: //TINY
          return this.visualEffect.imp_root_s_node;
        case 2: //SMALL
          return this.visualEffect.imp_root_s_node;
        case 3: //MEDIUM
          return this.visualEffect.imp_root_m_node;
        case 4: //LARGE
          return this.visualEffect.imp_root_l_node;
        case 5: //HUGE
          return this.visualEffect.imp_root_h_node;
      }
      return '****';
    }else{
      return this.visualEffect.imp_root_m_node;
    }
  }

  impact(){
    if(this.visualEffect.imp_impact_node != '****'){
      this.beginImpactLoad();
      MDLLoader.loader.load(this.visualEffect.imp_impact_node)
      .then(
        (mdl: OdysseyModel) => {
          if(this.disposed){
            this.endImpactLoad();
            return;
          }
          OdysseyModel3D.FromMDL(mdl, {
            context: this.object.context
          }).then(
            (model: OdysseyModel3D) => {
              this.endImpactLoad();
              if(this.disposed){
                model.dispose();
                return;
              }
              this.impact_model = model;
              if(this.object.model){
                const attachNodeName = (this.getString(0) || 'impact').toLowerCase();
                const namedNode =
                  (this.object.model as any)[attachNodeName] ||
                  this.object.model.nodes?.get?.(attachNodeName) ||
                  this.object.getModelNodeByName?.(attachNodeName);
                if(namedNode?.add){
                  namedNode.add(this.impact_model);
                  TextureLoader.LoadQueue();
                }else if(this.object.model.impact){
                  this.object.model.impact.add(this.impact_model);
                  TextureLoader.LoadQueue();
                }else{
                  this.object.model.add(this.impact_model);
                  TextureLoader.LoadQueue();
                }
              }else{
                this.impact_model.dispose();
                this.impact_model = undefined;
              }
            }
          ).catch(() => { this.endImpactLoad(); });
        }
      ).catch(() => { this.endImpactLoad(); });
    }

    this.impactRoot();
    this.impactHead();

    if(this.visualEffect.soundimpact != '***'){
      if(BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature) || this.object?.audioEmitter instanceof AudioEmitter){
        this.object.audioEmitter.playSound(this.visualEffect.soundimpact);
      }
    }
  }

  impactRoot(){
    if(this.getImpactRootModel() != '****'){
      this.beginImpactLoad();
      MDLLoader.loader.load(this.getImpactRootModel())
      .then((mdl: OdysseyModel) => {
        if(this.disposed){
          this.endImpactLoad();
          return;
        }
        OdysseyModel3D.FromMDL(mdl, {
          context: this.object.context,
        }).then((model: OdysseyModel3D) => {
          this.endImpactLoad();
          if(this.disposed){
            model.dispose();
            return;
          }
          this.impact_root_model = model;
          if(this.object.model){
            this.object.model.add(this.impact_root_model);
            TextureLoader.LoadQueue();
          }else{
            this.impact_root_model.dispose();
            this.impact_root_model = undefined;
          }
        }).catch(() => { this.endImpactLoad(); });
      }).catch(() => { this.endImpactLoad(); });
    }
  }

  impactHead(){
    if(this.visualEffect.imp_headcon_node != '****'){
      this.beginImpactLoad();
      MDLLoader.loader.load(this.visualEffect.imp_headcon_node).then(
        (mdl: OdysseyModel) => {
          if(this.disposed){
            this.endImpactLoad();
            return;
          }
          OdysseyModel3D.FromMDL(mdl, {
            context: this.object.context,
          }).then((model: OdysseyModel3D) => {
            this.endImpactLoad();
            if(this.disposed){
              model.dispose();
              return;
            }
            this.impact_head_model = model;
            if(this.object.model.headconjure){
              this.object.model.headconjure.add(this.impact_head_model);
              TextureLoader.LoadQueue();
            }else if(this.object.model.headhook){
              this.object.model.headhook.add(this.impact_head_model);
              TextureLoader.LoadQueue();
            }else{
              this.impact_head_model.dispose();
              this.impact_head_model = undefined;
            }
          }).catch(() => { this.endImpactLoad(); });
        }
      ).catch(() => { this.endImpactLoad(); });
    }
  }

  getProgFXTexture(progFX = 1400){
    let fxNumber = progFX - 1400;
    switch(fxNumber){
      case 26:
        return 'fx_tex_stealth';
      default:
        //Skips 13 for some reason
        if(fxNumber >= 13)
          fxNumber += 1;

        return 'fx_tex_' + Utility.PadInt(fxNumber, 2);
    }
  }

  /**
   * ApplyBumpedOutShell / EnableBumpedOutShell.
   * ProgFX 1400–1499 attaches a normal-offset shell to the target creature (and head
   * item) so it inherits transform + skinning — not a separate scene-rooted model.
   */
  private applyBumpedOutShell(progFX: number | string){
    if(progFX == '****' || progFX == null)
      return;
    const id = Number(progFX);
    if(!(id > 1400 && id < 1500))
      return;
    if(!BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature))
      return;

    const creature = this.object as ModuleCreature;
    if(!(creature.model instanceof OdysseyModel3D))
      return;

    const fx_tex = this.getProgFXTexture(id);
    creature.model.generateForceShieldGeometry(fx_tex);
    // also EnableBumpedOutShell on equipped Head item
    const headItem = creature.equipment?.HEAD;
    if(headItem?.model instanceof OdysseyModel3D){
      headItem.model.generateForceShieldGeometry(fx_tex);
    }
    this.bumpedOutShell = true;
    TextureLoader.LoadQueue();
  }

  /** RemoveBumpedOutShell */
  private removeBumpedOutShell(){
    if(!this.bumpedOutShell) return;
    this.bumpedOutShell = false;
    if(!BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature))
      return;
    const creature = this.object as ModuleCreature;
    if(creature.model instanceof OdysseyModel3D){
      creature.model.disposeForceShieldGeometry();
    }
    const headItem = creature.equipment?.HEAD;
    if(headItem?.model instanceof OdysseyModel3D){
      headItem.model.disposeForceShieldGeometry();
    }
  }

  progFX_Impact(){
    if(this.visualEffect.progfx_impact == '****')
      return;
    this.applyBumpedOutShell(this.visualEffect.progfx_impact);
    this.applyMotionBlurProgFX(this.visualEffect.progfx_impact);
    // default — impact hardcoded VFX lasts 1000ms
    if(this.bumpedOutShell){
      this.impactProgFXTimerMs = 1000;
    }
  }

  progFX_Duration(){
    if(this.visualEffect.progfx_duration == '****')
      return;
    this.applyBumpedOutShell(this.visualEffect.progfx_duration);
    this.applyMotionBlurProgFX(this.visualEffect.progfx_duration);
  }

  /**
   * ApplyHardCodedVisualEffect → ApplyMotionBlur
   * for progFX in [0x640, 0x6a4). Only 0x641/0x642 enable speed blur
   * (VFX_DUR_SPEED progfx_duration = 1601).
   */
  private applyMotionBlurProgFX(progFX: number | string){
    if(progFX == '****' || progFX == null)
      return;
    const id = Number(progFX);
    if(!isMotionBlurProgFX(id))
      return;
    if(!MOTION_BLUR_PROGFX_ENABLE.has(id))
      return;
    if(this.motionBlurActive)
      return;
    if(!BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature))
      return;
    GameState.applyMotionBlurVFX(this.object as ModuleCreature, id);
    this.motionBlurActive = true;
  }

  /** RemoveHardCodedVisualEffect → RemoveMotionBlur. */
  private removeMotionBlurProgFX(){
    if(!this.motionBlurActive) return;
    this.motionBlurActive = false;
    GameState.removeMotionBlurVFX();
  }

  onRemove(){
    this.disposed = true;
    this.impactProgFXTimerMs = -1;
    this.removeBumpedOutShell();
    this.removeMotionBlurProgFX();

    if(this.model instanceof OdysseyModel3D){
      this.model.dispose();
      this.model = undefined;
    }

    if(this.impact_model instanceof OdysseyModel3D){
      this.impact_model.dispose();
      this.impact_model = undefined;
    }

    if(this.impact_root_model instanceof OdysseyModel3D){
      this.impact_root_model.dispose();
      this.impact_root_model = undefined;
    }

    if(this.impact_head_model instanceof OdysseyModel3D){
      this.impact_head_model.dispose();
      this.impact_head_model = undefined;
    }
  }

}
