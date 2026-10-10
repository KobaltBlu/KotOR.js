import { GameObjectType } from "@core/enums/module/GameObjectType";
import { ILayoutObstacle } from "@core/interface/resource/ILayoutObstacle";
import { GFFObject } from "@core/resource/GFFObject";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { GameState } from "@engine/runtime/GameState";
import { MiniGameObjectArray } from "@engine/module/minigame/MiniGameObjectArray";
import { GameObject } from "@engine/module/GameObject";
import type { MiniGamePlayer } from "@engine/module/MiniGamePlayer";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import { OdysseyModel, OdysseyModelAnimationManager } from "@engine/odyssey";
import { MDLLoader } from "@engine/loaders";
import type { OdysseyObject3D } from "@engine/render/three/odyssey";
import * as THREE from "three";

/**
* MiniGameObstacle class.
*
* Class representing a obstacle found in minigame modules.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file MiniGameObstacle.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class MiniGameObstacle extends GameObject {
  invince: number;
  hit_points: number;
  max_hps: number = 0;
  invince_period: number;
  layout: ILayoutObstacle;
  /** One-shot latch after DoObstacleHitCheck (accel pads, etc.). */
  hit: boolean = false;
  /** last_follower_hit_index — player who last bumped this obstacle. */
  lastFollowerHit: MiniGamePlayer | undefined;
  lastHPChange: number = 0;
  models: OdysseyModel3D[] = [];
  animationManagers: OdysseyModelAnimationManager[] = [];
  /** OnAnimKeyEvent custom_* → OnAnimEvent (obstacles have no track loop). */
  private animPlayEventHandler = (e: { event?: string; target?: { name?: string } }) => {
    this.handleAnimPlayEvent(e);
  };
  private animPlayEventTargets: Array<{ target: THREE.Object3D; handler: typeof this.animPlayEventHandler }> = [];

  constructor(template: GFFObject, layout: ILayoutObstacle){
    super(template);
    this.objectType |= GameObjectType.MiniGameObstacle;
    // Match MiniGamePlayer / MiniGameEnemy — GameObject ctor leaves template undefined.
    this.template = template;
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
    // ctor → registers in MGO array.
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

    // Update — OnHeartbeat every frame.
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
   * SetFollowerHitPoints → nAbsolute (only if nHP > 0, SetHitPoints).
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
   * GetPart on obstacle aurora object.
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
   * AddObstacle — NewCAurObject(LYT name), SetPosition once on Gob,
   * AttachToScene(main_scene), PlayAnimation("ready"). Model stays at local origin.
   */
  async loadModel(): Promise<void> {
    const resref = (this.name || this.layout?.name || '')
      .replace(/\0[\s\S]*$/g, '')
      .toLowerCase()
      .trim();
    if(!resref){ return; }

    try{
      const mdl: OdysseyModel = await MDLLoader.loader.load(resref);
      // Same lit path as placeables / MG player & enemies — nearest light selection via
      // collectLightingModels. Authored flagShadow still selects casters.
      const model = await OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        castShadow: true,
        receiveShadow: true,
      });
      model.name = resref;
      // Single SetPosition on the container (this.position === container.position).
      // Do not also offset the child model — that doubled LYT coords past Far_Clip.
      if(this.layout?.position){
        this.position.copy(this.layout.position);
      }
      // model.position.set(0, 0, 0);
      this.models.push(model);
      this.container.add(model);
      GameState.scene?.add?.(this.container);
      this.bindAnimPlayEvent(model);

      const ready = model.odysseyAnimationMap?.get?.('ready');
      if(ready){
        model.playAnimation(ready, false);
      }
    }catch(e){
      console.warn(`MiniGameObstacle.loadModel: failed to load [${resref}]`, e);
    }
  }

  /**
   * OnAnimKeyEvent custom_* path — record suffix for SWMG_GetLastEvent, run OnAnimEvent.
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
   * SWMG_PlayAnimation / PlayAnimation
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
    const onAnimEvent = this.scripts[ScriptHook.MGObstacleOnAnimEvent];
    if(!onAnimEvent){ return; }
    onAnimEvent.run(this, 0);
  }

  onCreate(){
    this.spawned = true;
    const onCreate = this.scripts[ScriptHook.MGObstacleOnCreate];
    if(!onCreate){ return; }
    onCreate.run(this, 0);
  }

  override triggerHeartbeat(){
    if(!this.canProcessHeartbeat()){ return; }
    const onHeartbeat = this.scripts[ScriptHook.MGObstacleOnHeartbeat];
    if(!onHeartbeat){ return; }
    onHeartbeat.run(this);
  }

  onHitBullet(){
    const onHitBullet = this.scripts[ScriptHook.MGObstacleOnHitBullet];
    if(!onHitBullet){ return; }
    onHitBullet.run(this, 0);
  }

  /**
   * OnHitFollower
   * run OnHitFollower script (accelpad.nss etc). `follower` is the player bumper.
   */
  onHitFollower(follower?: MiniGamePlayer){
    const onHitFollower = this.scripts[ScriptHook.MGObstacleOnHitFollower];
    if(!onHitFollower){ return; }
    if(follower){
      this.lastFollowerHit = follower;
      onHitFollower.mgFollower = follower;
    }
    onHitFollower.run(this, 0);
  }

  static readonly SCRIPT_KEYS = [
    ScriptHook.MGObstacleOnAnimEvent,
    ScriptHook.MGObstacleOnCreate,
    ScriptHook.MGObstacleOnHeartbeat,
    ScriptHook.MGObstacleOnHitBullet,
    ScriptHook.MGObstacleOnHitFollower,
  ];

  loadScripts(){
    this.bindScriptsFromResRefs(MiniGameObstacle.SCRIPT_KEYS, 'MiniGameObstacle.loadScripts');
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

    this.hydrateScriptResRefsFromStruct(
      this.template?.getFieldByLabel?.('Scripts')?.getFieldStruct?.(),
      MiniGameObstacle.SCRIPT_KEYS
    );

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
