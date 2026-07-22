import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ILayoutObstacle } from "@/interface/resource/ILayoutObstacle";
import { GFFObject } from "@/resource/GFFObject";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { GameState } from "@/GameState";
import { MiniGameObjectArray } from "@/module/minigame/MiniGameObjectArray";
import { ModuleObject } from "@/module/ModuleObject";
import type { ModuleMGPlayer } from "@/module/ModuleMGPlayer";
import { OdysseyModel3D } from "@/three/odyssey";
import { OdysseyModel, OdysseyModelAnimationManager } from "@/odyssey";
import { MDLLoader } from "@/loaders";
import type { OdysseyObject3D } from "@/three/odyssey";
import * as THREE from "three";

/**
* ModuleMGObstacle class.
* 
* Class representing a obstacle found in minigame modules.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleMGObstacle.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleMGObstacle extends ModuleObject {
  invince: number;
  hit_points: number;
  max_hps: number = 0;
  invince_period: number;
  layout: ILayoutObstacle;
  /** One-shot latch after DoObstacleHitCheck (accel pads, etc.). */
  hit: boolean = false;
  /** Retail last_follower_hit_index — player who last bumped this obstacle. */
  lastFollowerHit: ModuleMGPlayer | undefined;
  lastHPChange: number = 0;
  models: OdysseyModel3D[] = [];
  animationManagers: OdysseyModelAnimationManager[] = [];
  /** Retail OnAnimKeyEvent custom_* → OnAnimEvent (obstacles have no track loop). */
  private animPlayEventHandler = (e: { event?: string; target?: { name?: string } }) => {
    this.handleAnimPlayEvent(e);
  };
  private animPlayEventTargets: Array<{ target: THREE.Object3D; handler: typeof this.animPlayEventHandler }> = [];

  constructor(template: GFFObject, layout: ILayoutObstacle){
    super(template);
    this.objectType |= ModuleObjectType.ModuleMGObstacle;
    this.name = '';
    this.invince = 0;
    this.hit_points = 0;
    this.layout = layout;
    if(template){
      this.initProperties();
    }else if(layout?.name){
      this.name = String(layout.name).toLowerCase();
      if(layout.position){
        this.position.copy(layout.position);
      }
    }
    // Retail CSWMGObstacle ctor → CSWMiniGameObject @ 0066c540 registers in MGO array.
    MiniGameObjectArray.register(this);
  }

  setTemplate(template: GFFObject){
    this.template = template;
    this.initProperties();
  }

  update(delta: number = 0){

    this.invince -= delta;
    if(this.invince < 0) this.invince = 0;

    for(let i = 0; i < this.animationManagers.length; i++){
      this.animationManagers[i]?.update?.(delta);
    }
    for(let i = 0; i < this.models.length; i++){
      this.models[i]?.update?.(delta);
    }

    if(GameState.module){
      this.triggerHeartbeat();
    }
  }

  updatePaused(delta: number = 0){
    
  }

  damage(damage = 0){

  }

  /**
   * Obstacles are not TrackFollowers; Adjust still queues delta for script/default apply.
   * SetFollowerHitPoints → nAbsolute (only if nHP > 0, retail SetHitPoints).
   */
  adjustHitPoints(nHP = 0, nAbsolute = 0){
    if(nAbsolute){
      if(nHP > 0){
        this.hit_points = nHP;
      }
      return;
    }
    this.lastHPChange = nHP;
    this.applyQueuedHitPoints();
  }

  applyQueuedHitPoints(){
    this.hit_points += this.lastHPChange;
    if(this.max_hps > 0 && this.hit_points > this.max_hps){
      this.hit_points = this.max_hps;
    }
  }

  startInvulnerability(){
    this.invince = this.invince_period || 0;
  }

  /**
   * Named collision part on loaded Gob (`hitbullet` / `hitbump`).
   * Retail GetPart on obstacle aurora object.
   */
  getHitPart(partName: string): OdysseyObject3D | THREE.Object3D | undefined {
    const key = partName.toLowerCase();
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      if(!model){ continue; }
      const node = model.nodes?.get?.(key) || model.getObjectByName?.(partName);
      if(node){ return node; }
    }
    return undefined;
  }

  /**
   * Retail AddObstacle @ 00672250 — NewCAurObject(LYT name), SetPosition, PlayAnimation("ready").
   */
  async loadModel(): Promise<void> {
    const resref = (this.name || this.layout?.name || '')
      .replace(/\0[\s\S]*$/g, '')
      .toLowerCase()
      .trim();
    if(!resref){ return; }

    try{
      const mdl: OdysseyModel = await MDLLoader.loader.load(resref);
      const model = await OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        castShadow: true,
        receiveShadow: true,
      });
      model.name = resref;
      if(this.layout?.position){
        model.position.copy(this.layout.position);
        this.position.copy(this.layout.position);
      }
      this.models.push(model);
      this.container.add(model);
      GameState.scene?.add?.(this.container);
      this.bindAnimPlayEvent(model);

      const ready = model.odysseyAnimationMap?.get?.('ready');
      if(ready){
        model.playAnimation(ready, false);
      }
    }catch(e){
      console.warn(`ModuleMGObstacle.loadModel: failed to load [${resref}]`, e);
    }
  }

  /**
   * Retail OnAnimKeyEvent custom_* path — record suffix for SWMG_GetLastEvent, run OnAnimEvent.
   */
  handleAnimPlayEvent(e: { event?: string; target?: { name?: string } }){
    const raw = String(e?.event ?? '');
    if(!raw){ return; }
    if(!raw.toLowerCase().startsWith('custom_')){ return; }
    const modelName = e?.target?.name || this.models?.[0]?.name || this.name || '';
    GameState.module?.area?.miniGame?.recordAnimEvent?.(raw.substring(7), modelName);
    this.onAnimEvent();
  }

  bindAnimPlayEvent(target: THREE.Object3D | undefined | null){
    if(!target || typeof (target as any).addEventListener !== 'function'){ return; }
    for(let i = 0; i < this.animPlayEventTargets.length; i++){
      if(this.animPlayEventTargets[i].target === target){ return; }
    }
    (target as any).addEventListener('playEvent', this.animPlayEventHandler);
    this.animPlayEventTargets.push({ target, handler: this.animPlayEventHandler });
  }

  unbindAnimPlayEvents(){
    for(let i = 0; i < this.animPlayEventTargets.length; i++){
      const { target, handler } = this.animPlayEventTargets[i];
      (target as any).removeEventListener?.('playEvent', handler);
    }
    this.animPlayEventTargets.length = 0;
  }

  /**
   * Retail SWMG_PlayAnimation / TrackFollower::PlayAnimation @ 0066d550 —
   * loop/queue/overlay flags match player path.
   */
  playAnimation(name = '', bLooping = 0, bQueue = 0, bOverlay = 0){
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      if(!model){ continue; }
      const anim = model.odysseyAnimationMap?.get?.(name.toLowerCase().trim());
      if(!anim){ continue; }

      const existingIndex = this.animationManagers.findIndex(
        (am) => am?.currentAnimation?.name == name
      );
      if(existingIndex >= 0){
        this.animationManagers.splice(existingIndex, 1);
      }

      if(bOverlay){
        const animManager = new OdysseyModelAnimationManager(model);
        const state = animManager.createAnimationState();
        state.loop = !!bLooping;
        animManager.setCurrentAnimation(anim, state);
        this.animationManagers.push(animManager);
      }else{
        model.playAnimation(anim, !!bLooping);
      }
    }
  }

  onAnimEvent(){
    const onAnimEvent = this.scripts[ModuleObjectScript.MGObstacleOnAnimEvent];
    if(!onAnimEvent){ return; }
    onAnimEvent.run(this, 0);
  }

  onCreate(){
    const onCreate = this.scripts[ModuleObjectScript.MGObstacleOnCreate];
    if(!onCreate){ return; }
    onCreate.run(this, 0);
  }

  onHitBullet(){
    const onHitBullet = this.scripts[ModuleObjectScript.MGObstacleOnHitBullet];
    if(!onHitBullet){ return; }
    onHitBullet.run(this, 0);
  }

  /**
   * Retail CSWMiniGameObject::OnHitFollower @ 0066c2d0 —
   * run OnHitFollower script (accelpad.nss etc). `follower` is the player bumper.
   */
  onHitFollower(follower?: ModuleMGPlayer){
    const onHitFollower = this.scripts[ModuleObjectScript.MGObstacleOnHitFollower];
    if(!onHitFollower){ return; }
    if(follower){
      this.lastFollowerHit = follower;
      onHitFollower.mgFollower = follower;
    }
    onHitFollower.run(this, 0);
  }

  loadScripts(){
    const scriptKeys = [
      ModuleObjectScript.MGObstacleOnAnimEvent,
      ModuleObjectScript.MGObstacleOnCreate,
      ModuleObjectScript.MGObstacleOnHeartbeat,
      ModuleObjectScript.MGObstacleOnHitBullet,
      ModuleObjectScript.MGObstacleOnHitFollower,
    ];

    const scriptsNode = this.template?.getFieldByLabel?.('Scripts')?.getFieldStruct?.();
    if(!scriptsNode){ return; }

    for(const scriptKey of scriptKeys){
      if(!scriptsNode.hasField(scriptKey)){ continue; }
      const resRef = scriptsNode.getFieldByLabel(scriptKey).getValue();
      if(!resRef){ continue; }
      const nwscript = GameState.NWScript.Load(resRef);
      if(!nwscript){
        console.warn(`ModuleMGObstacle.loadScripts: Failed to load script [${scriptKey}]:${resRef} for object ${this.name}`);
        continue;
      }
      nwscript.caller = this;
      this.scripts[scriptKey] = nwscript;
    }
  }

  initProperties(){
    if(this.template?.RootNode?.hasField?.('Name'))
      this.name = this.template.getFieldByLabel('Name').getValue().toLowerCase();
    else if(this.layout?.name)
      this.name = String(this.layout.name).toLowerCase();

    if(this.template?.RootNode?.hasField?.('Hit_Points'))
      this.hit_points = this.template.getFieldByLabel('Hit_Points').getValue();
    if(this.template?.RootNode?.hasField?.('Max_Hit_Points'))
      this.max_hps = this.template.getFieldByLabel('Max_Hit_Points').getValue();
    if(this.template?.RootNode?.hasField?.('Invince_Period'))
      this.invince_period = this.template.getFieldByLabel('Invince_Period').getValue();

    if(this.layout?.position){
      this.position.copy(this.layout.position);
    }

    this.initialized = true;
  }

  /** Tear down for DestroyMiniGameObject / area dispose. */
  dispose(){
    this.unbindAnimPlayEvents();
    MiniGameObjectArray.unregister(this);
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      model?.parent?.remove(model);
      model?.dispose?.();
    }
    this.models.length = 0;
    this.container?.removeFromParent?.();
  }

}
