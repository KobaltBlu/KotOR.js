import * as THREE from 'three';
import { GameEngineType } from '@core/enums/engine/GameEngineType';
import { GameEffectDurationType } from '@core/enums/effects/GameEffectDurationType';
import { ModuleCreatureArmorSlot } from '@core/enums/module/ModuleCreatureArmorSlot';
import { MDLLoader } from '@engine/loaders';
import type { Item } from '@engine/module/Item';
import { OdysseyModel } from '@engine/odyssey';
import { OdysseyModel3D, OdysseyObject3D } from '@engine/render/three/odyssey';
import {
  APPEARANCE_EVIL_BODY_ALIGN_MAX,
  SWCreatureAppearance,
} from '@engine/rules/SWCreatureAppearance';
import { GameState } from '@engine/runtime/GameState';
import type { Creature } from '@engine/module/Creature';
import { GameObject } from '@engine/module/GameObject';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class CreatureModelService {
  constructor(
    private readonly host: Creature,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  async loadModel (): Promise<OdysseyModel3D> {
    const generation = ++this.host.modelLoadGeneration;
    this.host.isReady = false;
    // Hide while rebuilding so bind/rest pose cannot flash if the container
    // is already in the scene (player path, equip / appearance reload).
    if(this.host.model instanceof OdysseyModel3D){
      this.host.model.visible = false;
    }
    await this.host.loadEquipmentModels();
    if(generation !== this.host.modelLoadGeneration){
      return this.host.model;
    }
    await this.host.loadBody(generation);
    if(generation !== this.host.modelLoadGeneration){
      return this.host.model;
    }
    if(this.host.model instanceof OdysseyModel3D){
      this.host.model.visible = false;
    }
    await this.host.loadHead(generation);
    if(generation !== this.host.modelLoadGeneration){
      return this.host.model;
    }
    this.host.isReady = true;
    this.host.settleWalkableAttachment();
    this.host.primeAnimationPose();
    this.host.update(0.0000000000000000000001);
    // updateModelVisibility is Mode-gated (INGAME); force visible after prime so a
    // stale room from the prior module cannot leave the mesh hidden under LOADING.
    if(this.host.model instanceof OdysseyModel3D){
      this.host.model.visible = true;
    }
    return this.host.model;
  }

  private detachEquippedModelsFromBody(){
    try{
      const rh = this.host.equipment.RIGHTHAND?.model;
      if(rh instanceof OdysseyModel3D){
        OdysseyModel3D.restoreAttachedEquipmentShadowCasting(rh);
      }
      if(rh?.parent) rh.parent.remove(rh);
    }catch(e){}
    try{
      const lh = this.host.equipment.LEFTHAND?.model;
      if(lh instanceof OdysseyModel3D){
        OdysseyModel3D.restoreAttachedEquipmentShadowCasting(lh);
      }
      if(lh?.parent) lh.parent.remove(lh);
    }catch(e){}
    try{
      const helm = this.host.equipment.HEAD?.model;
      if(helm instanceof OdysseyModel3D){
        OdysseyModel3D.restoreAttachedEquipmentShadowCasting(helm);
      }
      if(helm?.parent) helm.parent.remove(helm);
    }catch(e){}
    try{
      if(this.host.head?.parent) this.host.head.parent.remove(this.host.head);
    }catch(e){}
  }

  private syncCreatureShadowCasters(){
    if(!this.host.shadowsEnabled){ return; }
    const mark = (model?: OdysseyModel3D) => {
      if(model instanceof OdysseyModel3D){
        OdysseyModel3D.markAttachedEquipmentShadowCasting(model, true);
      }
    };
    mark(this.host.equipment.RIGHTHAND?.model as OdysseyModel3D);
    mark(this.host.equipment.LEFTHAND?.model as OdysseyModel3D);
    mark(this.host.equipment.HEAD?.model as OdysseyModel3D);
  }

  async loadBody(generation?: number) {
    let appearance = this.host.creatureAppearance;
    let bodyVariation: string = this.host.equipment.ARMOR?.getBodyVariation() || '';
    let textureVariation: number = this.host.equipment.ARMOR?.getTextureVariation() || 1;
    const hasBodyVariation = !!(bodyVariation && bodyVariation.length);
    const maxBodyIndex = SWCreatureAppearance.maxBodyVariationIndex(
      GameState.GameKey === GameEngineType.TSL
    );
    const { model: bodyModel, texture: bodyTexture } = appearance.getBodyModelInfo(
      bodyVariation,
      textureVariation,
      maxBodyIndex,
      this.host.getGoodEvil(),
      hasBodyVariation,
    );
    this.host.bodyModel = bodyModel;
    this.host.bodyTexture = bodyTexture;

    if(!this.host.bodyModel || this.host.bodyModel.length === 0){
      if(generation !== undefined && generation !== this.host.modelLoadGeneration){
        return this.host.model;
      }
      this.detachEquippedModelsFromBody();
      if(this.host.model){
        this.host.model.removeFromParent();
        try{ this.host.model.dispose(); }catch(e){}
      }
      this.host.model = new OdysseyModel3D();
      return this.host.model;
    }
    
    try{
      const mdl = await MDLLoader.loader.load(this.host.bodyModel);
      // CreateSimple / CreateBTypeBody — appearance.2da ENVMAP
      // is applied to all body parts via envmap assign, falling back to "DEFAULT" when blank.
      const envMapOverride = appearance.envmap?.length ? appearance.envmap : 'DEFAULT';
      const model = await OdysseyModel3D.FromMDL(mdl, {
        castShadow: true,
        receiveShadow: false,
        shadowsEnabled: this.host.shadowsEnabled,
        textureVar: this.host.bodyTexture,
        isHologram: this.host.isHologram,
        envMapOverride: envMapOverride,
        context: this.host.context,
      });

      if(generation !== undefined && generation !== this.host.modelLoadGeneration){
        try{ model.dispose(); }catch(e){}
        return this.host.model;
      }

      this.detachEquippedModelsFromBody();
      if(this.host.model){
        this.host.model.removeFromParent();
        try{ this.host.model.dispose(); }catch(e){}
      }
      
      model.addEventListener('playEvent' as any, this.host.playEvent.bind(this.host));

      this.host.model = model;
      this.host.model.userData.gameObject = this.host;
      this.host.container.add(this.host.model);
      this.host.markCollisionBoundsDirty('model');
      this.host.computeBoundingBox();

      try{
        if(this.host.model.lhand instanceof OdysseyObject3D){
          if(this.host.equipment.LEFTHAND && this.host.equipment.LEFTHAND.model instanceof OdysseyModel3D){
            this.host.model.lhand.add(this.host.equipment.LEFTHAND.model);
          }
        }
      }catch(e){
        console.error('Creature.LoadBody', e);
      }

      try{
        if(this.host.model.rhand instanceof OdysseyObject3D){
          if(this.host.equipment.RIGHTHAND && this.host.equipment.RIGHTHAND.model instanceof OdysseyModel3D){
            this.host.model.rhand.add(this.host.equipment.RIGHTHAND.model);
          }
        }
      }catch(e){
        console.error('Creature.LoadBody', e);
      }

      this.syncCreatureShadowCasters();

      this.host.model.disableMatrixUpdate();
      const sizeCat = appearance.sizecategory ?? 3;
      void this.host.applyShadowBlob(GameObject.shadowBlobResRefFromSizeCategory(sizeCat));
      return this.host.model;
    }catch(e){
      console.error(e);
      this.host.model = new OdysseyModel3D();
      return this.host.model;
    }
  }

  resolveAppearanceHeadId(): number {
    const appearance = this.host.creatureAppearance;
    if(!appearance) return -1;
    if(this.host.useBackupHead){
      return appearance.backuphead;
    }
    return appearance.normalhead;
  }

  playAppearanceDeathVFX(){
    const appearance = this.host.creatureAppearance;
    const vfxId = appearance?.deathvfx;
    if(!(typeof vfxId === 'number' && vfxId >= 0)) return;

    const vfx = new GameState.GameEffectFactory.EffectVisualEffect();
    vfx.setInt(0, vfxId);
    vfx.setDurationType(GameEffectDurationType.INSTANT);
    vfx.setCreator(this.host);
    const nodeName = (appearance.deathvfxnode || 'impact').replace(/\0[\s\S]*$/g, '').trim();
    if(nodeName){
      vfx.setString(0, nodeName);
    }
    this.host.addEffect(vfx);
  }

  async loadHead(generation?: number): Promise<OdysseyModel3D> {
    let appearance = this.host.creatureAppearance;
    let headId = this.host.resolveAppearanceHeadId();
    this.host.headModel = undefined;
    if(!( headId >= 0 && appearance.modeltype == 'B' )){
      return;
    }

    const headDetails = this.runtime.getSWRuleSet?.().heads[headId];
    if(!headDetails){
      return;
    }

    const headTexture = headDetails.getTextureGoodEvil(this.host.getGoodEvil());
    this.host.headModel = headDetails.head;
    const mdl = await MDLLoader.loader.load(this.host.headModel);
 
    const head = await OdysseyModel3D.FromMDL(mdl, {
      context: this.host.context,
      castShadow: true,
      receiveShadow: false,
      shadowsEnabled: this.host.shadowsEnabled,
      isHologram: this.host.isHologram,
      textureVar: headTexture,
    });

    try
    {
      if(generation !== undefined && generation !== this.host.modelLoadGeneration){
        try{ head.dispose(); }catch(e){}
        return this.host.head;
      }

      try{
        const helm = this.host.equipment.HEAD?.model;
        if(helm?.parent) helm.parent.remove(helm);
      }catch(e){}

      if(this.host.head instanceof OdysseyModel3D){
        try{ this.host.head.parent?.remove(this.host.head); }catch(e){}
        try{ this.host.head.dispose(); }catch(e){}
      }

      this.host.head = head;
      this.host.head.userData.gameObject = this.host;
      this.host.model.attachHead(head);

      try{
        if(this.host.head.gogglehook instanceof THREE.Object3D){
          if(this.host.equipment.HEAD && this.host.equipment.HEAD.model instanceof OdysseyModel3D){
            this.host.head.gogglehook.add(this.host.equipment.HEAD.model);
          }
        }
      }catch(e){
        console.error('Creature', e);
      }

      this.syncCreatureShadowCasters();
      
      this.host.head.disableMatrixUpdate();
      return this.host.head;
    }
    catch(e)
    {
      console.error(e);
    }
  }

  setAppearance(appearance: number){
    this.host.appearance = appearance;
    this.host.creatureAppearance = GameState.AppearanceManager.GetCreatureAppearanceById(this.host.appearance);
    if(!this.host.creatureAppearance) return;

    this.host.headTrackingEnabled = this.host.creatureAppearance.headtrack !== 0;
    this.host.headMaxHorizontalAngle = (this.host.creatureAppearance.head_arc_h * Math.PI) / 180;
    this.host.headMaxVerticalAngle = (this.host.creatureAppearance.head_arc_v * Math.PI) / 180;
  }

  async loadEquipmentModels(): Promise<void> {
    const array =  Object.keys(this.host.equipment);
    for(let i = 0; i < array.length; i++){
      const slot_key = array[i];
      let slot: Item = (this.host.equipment as any)[slot_key];
      if(!slot){
        continue;
      }
      const model = await slot.loadModel();
      if(slot_key == 'RIGHTHAND' || slot_key == 'LEFTHAND'){
        model.playAnimation('off', true);
      }
    }
  }
}
