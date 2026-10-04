import { AudioEmitter } from "@/audio/AudioEmitter";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import { MDLLoader, TextureLoader } from "@/loaders";
// import { TwoDAManager } from "@/managers";
import type { ModuleCreature } from "@/module";
import { OdysseyModel } from "@/odyssey";
import { OdysseyModel3D } from "@/three/odyssey";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { GameEffect } from "@/effects/GameEffect";

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
  metadataApplied: boolean = false;
  pendingModelLoads: number = 0;
  private removed: boolean = false;
  private modelTimer: number = 3000;

  /** Reject and dispose models whose asynchronous request outlived this effect. */
  acceptLoadedModel(model: OdysseyModel3D): boolean {
    if(this.removed || !this.object || (this.durationEnded && this.getDurationType() == GameEffectDurationType.TEMPORARY)){
      this.disposeModelInstance(model);
      return false;
    }
    return true;
  }

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

  isEmptyEffectField(value: any){
    return value === undefined || value === null || value === '' || value === '***' || value === '****';
  }

  getEffectInteger(value: any, fallback = -1){
    const parsed = parseInt(`${value}`, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  beginModelLoad(){
    this.pendingModelLoads += 1;
  }

  endModelLoad(){
    this.pendingModelLoads = Math.max(0, this.pendingModelLoads - 1);
    this.tryCompleteInstantEffect();
  }

  disposeModelInstance(model?: OdysseyModel3D){
    if(model instanceof OdysseyModel3D){
      model.removeFromParent();
      model.dispose();
    }
  }

  tryCompleteInstantEffect(){
    if(this.removed || this.getDurationType() != GameEffectDurationType.INSTANT){
      return;
    }

    if(this.pendingModelLoads > 0){
      return;
    }

    if(this.model || this.impact_model || this.impact_root_model || this.impact_head_model){
      return;
    }

    this.object?.removeEffect?.(this);
  }

  applyMetadataEffects(){
    if(this.metadataApplied || !this.visualEffect){
      return;
    }

    this.metadataApplied = true;

    const rumblePattern = this.getEffectInteger(this.visualEffect.rumblepattern, -1);
    if(rumblePattern >= 0){
      GameState.CameraShakeManager.playRumblePattern(rumblePattern);
    }
  }

  playEffectAnimation(model: OdysseyModel3D | undefined, preferredAnimation: string, loop = false){
    if(!(model instanceof OdysseyModel3D)){
      return;
    }

    const triggerExplosionEmitters = () => {
      if(model.emitters.length > 0){
        console.log('EffectVisualEffect.playEffectAnimation: preparing emitters', {
          visualEffect: this.visualEffect?.label,
          emitterCount: model.emitters.length,
          emitterModes: model.emitters.map(emitter => ({ updateType: `${emitter.updateType || ''}`.trim(), renderMode: emitter.node?.renderMode, texture: emitter.node?.textureResRef })),
        });

        for(const emitter of model.emitters){
          if(emitter.mesh){
            emitter.mesh.frustumCulled = false;
          }
          emitter.detonate();
        }
      }
    };

    const animation = model.playAnimation(preferredAnimation, loop);
    if(animation){
      triggerExplosionEmitters();
      console.log('EffectVisualEffect.playEffectAnimation: using preferred animation', {
        visualEffect: this.visualEffect?.label,
        preferredAnimation,
        loop,
        availableAnimations: model.odysseyAnimations.map(anim => anim.name),
      });
      return;
    }

    if(model.odysseyAnimations.length > 0){
      triggerExplosionEmitters();
      console.log('EffectVisualEffect.playEffectAnimation: falling back to animation 0', {
        visualEffect: this.visualEffect?.label,
        preferredAnimation,
        loop,
        availableAnimations: model.odysseyAnimations.map(anim => anim.name),
      });
      model.playAnimation(0, loop);
    }else{
      console.warn('EffectVisualEffect.playEffectAnimation: model has no animations', {
        visualEffect: this.visualEffect?.label,
        preferredAnimation,
      });
    }
  }

  update(delta = 0){
    if(this.removed){ return; }
    super.update(delta);

    if(this.durationEnded && this.getDurationType() == GameEffectDurationType.TEMPORARY){
      return;
    }

    //Impact Node
    if(this.impact_model){
      if(this.impactTimer == undefined){
        this.impactTimer = 3000;
        if(this.visualEffect.type_fd == 'D'){
          this.playEffectAnimation(this.impact_model, 'duration', true);
        }else if(this.visualEffect.type_fd == 'F'){
          this.playEffectAnimation(this.impact_model, 'impact');
        }
      }

      if(this.impactTimer <= 0){
        this.disposeModelInstance(this.impact_model);
        this.impact_model = undefined;
        this.tryCompleteInstantEffect();
      }else{
        this.impact_model.update(delta);
      }

      this.impactTimer -= 1000 * delta;
    }

    //Root Node
    if(this.impact_root_model){
      if(this.impactRootTimer == undefined){
        this.impactRootTimer = 3000;
        if(this.visualEffect.type_fd == 'D'){
          this.playEffectAnimation(this.impact_root_model, 'duration', true);
        }else if(this.visualEffect.type_fd == 'F'){
          this.playEffectAnimation(this.impact_root_model, 'impact');
        }
      }

      if(this.impactRootTimer <= 0){
        this.disposeModelInstance(this.impact_root_model);
        this.impact_root_model = undefined;
        this.tryCompleteInstantEffect();
      }else{
        this.impact_root_model.update(delta);
      }

      this.impactRootTimer -= 1000 * delta;
    }

    //Head Conjure
    if(this.impact_head_model){
      if(this.impactHeadTimer == undefined){
        this.impactHeadTimer = 3000;
        if(this.visualEffect.type_fd == 'D'){
          this.playEffectAnimation(this.impact_head_model, 'duration', true);
        }else if(this.visualEffect.type_fd == 'F'){
          this.playEffectAnimation(this.impact_head_model, 'impact');
        }
      }

      if(this.impactHeadTimer <= 0){
        this.disposeModelInstance(this.impact_head_model);
        this.impact_head_model = undefined;
        this.tryCompleteInstantEffect();
      }else{
        this.impact_head_model.update(delta);
      }

      this.impactHeadTimer -= 1000 * delta;
    }

    if(this.model && this.getDurationType() == GameEffectDurationType.INSTANT){
      this.modelTimer -= 1000 * delta;
      if(this.modelTimer <= 0){
        this.disposeModelInstance(this.model);
        this.model = undefined;
      }
    }

    if(this.model){

      if(this.model.animationManager){
        this.model.animationManager.currentAnimation = undefined;
      }

      if(this.object?.model && this.model && (this.object.model as any).nodes && this.model.nodes){
        for(let node of (this.object.model as any).nodes){
          const c_node = this.model.nodes.get(node[0]);
          if(!c_node || !node?.[1]){ continue; }
          c_node.position.copy(node[1].position);
          c_node.quaternion.copy(node[1].quaternion);
          c_node.scale.copy(node[1].scale);
        }
      }

      if(this.object?.position){
        this.model.position.copy(this.object.position);
      }

      if(this.object?.model?.rotation){
        this.model.rotation.copy(this.object.model.rotation);
      }

      this.model.update(delta);

    }

    this.tryCompleteInstantEffect();

  }

  onApply(){
    if(this.applied || this.removed)
      return;

    super.onApply();

    if(!this.visualEffect){
      this.tryCompleteInstantEffect();
      return;
    }

    this.applyMetadataEffects();

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

    }else if(typeof this.object != 'undefined'){
      this.impact();
    }

    this.applied = true;
    this.tryCompleteInstantEffect();
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
    if(!this.isEmptyEffectField(this.visualEffect.imp_impact_node)){
      console.log('EffectVisualEffect.impact: loading impact node', {
        visualEffect: this.visualEffect?.label,
        node: this.visualEffect.imp_impact_node,
      });
      this.beginModelLoad();
      MDLLoader.loader.load(this.visualEffect.imp_impact_node)
      .then((mdl: OdysseyModel) => {
        return OdysseyModel3D.FromMDL(mdl, {
          context: this.object?.context
        }).then((model: OdysseyModel3D) => {
          if(!this.acceptLoadedModel(model)){ return; }
          this.impact_model = model;
          console.log('EffectVisualEffect.impact: impact node loaded', {
            visualEffect: this.visualEffect?.label,
            node: this.visualEffect.imp_impact_node,
            animations: model.odysseyAnimations.map(anim => anim.name),
            children: model.children.length,
            meshes: model.meshes.length,
            emitters: model.emitters.length,
          });
          if(this.object.model){
            if(this.object.model.impact){
              this.object.model.impact.add(this.impact_model);
              TextureLoader.LoadQueue();
            }else{
              this.object.model.add(this.impact_model);
              TextureLoader.LoadQueue();
            }
          }else{
            this.disposeModelInstance(this.impact_model);
            this.impact_model = undefined;
          }
        });
      })
      .catch((error) => {
        console.error('EffectVisualEffect.impact: Failed to load impact model', error);
      })
      .finally(() => {
        this.endModelLoad();
      });
    }

    this.impactRoot();
    this.impactHead();

    if(!this.isEmptyEffectField(this.visualEffect.soundimpact)){
      if(BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature) || this.object?.audioEmitter instanceof AudioEmitter){
        this.object.audioEmitter.playSound(this.visualEffect.soundimpact);
      }
    }
  }

  impactRoot(){
    if(!this.isEmptyEffectField(this.getImpactRootModel())){
      console.log('EffectVisualEffect.impactRoot: loading root node', {
        visualEffect: this.visualEffect?.label,
        node: this.getImpactRootModel(),
        attachedObjectHasModel: !!this.object?.model,
        attachedObjectPosition: this.object?.position,
      });
      this.beginModelLoad();
      MDLLoader.loader.load(this.getImpactRootModel())
      .then((mdl: OdysseyModel) => {
        return OdysseyModel3D.FromMDL(mdl, {
          context: this.object?.context,
        }).then((model: OdysseyModel3D) => {
          if(!this.acceptLoadedModel(model)){ return; }
          this.impact_root_model = model;
          console.log('EffectVisualEffect.impactRoot: root node loaded', {
            visualEffect: this.visualEffect?.label,
            node: this.getImpactRootModel(),
            animations: model.odysseyAnimations.map(anim => anim.name),
            children: model.children.length,
            meshes: model.meshes.length,
            emitters: model.emitters.length,
          });
          if(this.object.model){
            this.object.model.add(this.impact_root_model);
            console.log('EffectVisualEffect.impactRoot: root node attached', {
              visualEffect: this.visualEffect?.label,
              node: this.getImpactRootModel(),
              parentChildren: this.object.model.children.length,
            });
            TextureLoader.LoadQueue();
          }else{
            this.disposeModelInstance(this.impact_root_model);
            this.impact_root_model = undefined;
          }
        });
      })
      .catch((error) => {
        console.error('EffectVisualEffect.impactRoot: Failed to load root impact model', error);
      })
      .finally(() => {
        this.endModelLoad();
      });
    }
  }

  impactHead(){
    if(!this.isEmptyEffectField(this.visualEffect.imp_headcon_node)){
      this.beginModelLoad();
      MDLLoader.loader.load(this.visualEffect.imp_headcon_node)
      .then((mdl: OdysseyModel) => {
        return OdysseyModel3D.FromMDL(mdl, {
          context: this.object?.context,
        }).then((model: OdysseyModel3D) => {
          if(!this.acceptLoadedModel(model)){ return; }
          this.impact_head_model = model;
          if(this.object.model?.headconjure){
            this.object.model.headconjure.add(this.impact_head_model);
            TextureLoader.LoadQueue();
          }else if(this.object.model?.headhook){
            this.object.model.headhook.add(this.impact_head_model);
            TextureLoader.LoadQueue();
          }else{
            this.disposeModelInstance(this.impact_head_model);
            this.impact_head_model = undefined;
          }
        });
      })
      .catch((error) => {
        console.error('EffectVisualEffect.impactHead: Failed to load head impact model', error);
      })
      .finally(() => {
        this.endModelLoad();
      });
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

  progFX_Impact(){

    if(this.visualEffect.progfx_impact == '****')
      return;

    //ForceShield progFX_impact
    if(this.visualEffect.progfx_impact > 1400 && this.visualEffect.progfx_impact < 1500){
      let fx_tex = this.getProgFXTexture(this.visualEffect.progfx_impact);
      
      if(BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature)){
        const creature = this.object as ModuleCreature;
        this.beginModelLoad();
        MDLLoader.loader.load(creature.bodyModel)
        .then((mdl: OdysseyModel) => {
          return OdysseyModel3D.FromMDL(mdl, {
            textureVar: fx_tex,
            isForceShield: true,
            context: this.object?.context
          }).then((model: OdysseyModel3D) => {
            if(!this.acceptLoadedModel(model)){ return; }
            this.model = model;
            GameState.scene.add(model);
            model.position.copy(this.object.position);
            model.rotation.copy(this.object.rotation);
            model.quaternion.copy(this.object.quaternion);
            //model.disableMatrixUpdate();
            
            if(creature.headModel){
              this.beginModelLoad();
              MDLLoader.loader.load(creature.headModel)
              .then((mdl: OdysseyModel) => {
                return OdysseyModel3D.FromMDL(mdl, {
                  textureVar: fx_tex,
                  context: this.object?.context,
                  isForceShield: true,
                }).then((head: OdysseyModel3D) => {
                  if(!this.acceptLoadedModel(head)){ return; }
                  if(!this.model){ this.disposeModelInstance(head); return; }
                  this.model.attachHead(head);
                  //head.disableMatrixUpdate();
                  TextureLoader.LoadQueue();
                });
              }).catch((error) => {
                console.error('EffectVisualEffect.progFX_Impact: Failed to load head model', error);
              }).finally(() => {
                this.endModelLoad();
              });
            }else{
              TextureLoader.LoadQueue();
            }
          });
        }).catch((error) => {
          console.error('EffectVisualEffect.progFX_Impact: Failed to load body model', error);
        }).finally(() => {
          this.endModelLoad();
        });
      }

    }
  }

  progFX_Duration(){

    if(this.visualEffect.progfx_duration == '****')
      return;

    //ForceShield progFX_impact
    if(this.visualEffect.progfx_duration > 1400 && this.visualEffect.progfx_duration < 1500){
      let fx_tex = this.getProgFXTexture(this.visualEffect.progfx_duration);
      
      if(BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleCreature)){
        const creature = this.object as ModuleCreature;
        this.beginModelLoad();
        MDLLoader.loader.load(creature.bodyModel).then((mdl: OdysseyModel) => {
          return OdysseyModel3D.FromMDL(mdl, {
            textureVar: fx_tex,
            isForceShield: true,
            context: this.object?.context,
          }).then((model: OdysseyModel3D) => {
            if(!this.acceptLoadedModel(model)){ return; }
            this.model = model;
            GameState.scene.add(model);
            model.position.copy(this.object.position);
            model.rotation.copy(this.object.rotation);
            model.quaternion.copy(this.object.quaternion);
            //model.disableMatrixUpdate();
            if(creature.headModel){
              this.beginModelLoad();
              MDLLoader.loader.load(creature.headModel)
              .then((mdl: OdysseyModel) => {
                return OdysseyModel3D.FromMDL(mdl, {
                  textureVar: fx_tex,
                  context: this.object?.context,
                  isForceShield: true,
                }).then((head: OdysseyModel3D) => {
                  if(!this.acceptLoadedModel(head)){ return; }
                  if(!this.model){ this.disposeModelInstance(head); return; }
                  this.model.attachHead(head);
                  //head.disableMatrixUpdate();
                  TextureLoader.LoadQueue();
                }).catch(() => {
                  TextureLoader.LoadQueue();
                });
              }).catch(() => {
                TextureLoader.LoadQueue();
              }).finally(() => {
                this.endModelLoad();
              });
            }else{
              TextureLoader.LoadQueue();
            }
          });
        }).catch((error) => {
          console.error('EffectVisualEffect.progFX_Duration: Failed to load body model', error);
        }).finally(() => {
          this.endModelLoad();
        });
      }

    }
  }

  onRemove(){
    this.removed = true;
    this.disposeModelInstance(this.model);
    this.disposeModelInstance(this.impact_model);
    this.disposeModelInstance(this.impact_root_model);
    this.disposeModelInstance(this.impact_head_model);
    this.model = undefined;
    this.impact_model = undefined;
    this.impact_root_model = undefined;
    this.impact_head_model = undefined;
  }

}
