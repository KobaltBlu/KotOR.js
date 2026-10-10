import * as THREE from 'three';
import { CutsceneMode } from '@core/enums/dialog/CutsceneMode';
import type { SWAnimation } from '@engine/rules/SWAnimation';
import { EngineMode } from '@engine/enums/engine/EngineMode';
import type { AreaRoom } from '@engine/module/AreaRoom';
import type { GameObject } from '@engine/module/GameObject';
import { MDLLoader } from '@engine/loaders';
import { OdysseyModel3D } from '@engine/render/three/odyssey';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';
import { resolveDialogModelVisibility } from './dialogModelVisibility';

export class GameObjectPresentationService {
  private readonly cameraHookPosition = new THREE.Vector3();
  private readonly shadowBlobUp = new THREE.Vector3(0, 0, 1);
  private readonly shadowBlobNormal = new THREE.Vector3();
  private readonly shadowBlobNormalMatrix = new THREE.Matrix3();
  private readonly shadowBlobQuaternion = new THREE.Quaternion();

  constructor(
    private readonly host: GameObject,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  setContext(ctx: any){
    this.host.context = ctx;
    if(this.host.model instanceof OdysseyModel3D){
      this.host.model.emitters.forEach((emitter) => emitter.context = ctx);
    }
  }

  getModel(){
    if(this.host.model instanceof THREE.Object3D) return this.host.model;
    return this.host.model = new OdysseyModel3D();
  }

  isVisible(){
    return this.host.getModel().visible;
  }

  attachToRoom(room: AreaRoom){
    this.host.detachFromRoom(this.host.room);
    this.host.room = room;
    this.host.room.attachChildObject(this.host);
    this.host.markCollisionBoundsDirty();
  }

  detachFromRoom(room: AreaRoom){
    if(!room) return;
    room.removeChildObject(this.host);
    this.host.room = undefined;
    this.host.markCollisionBoundsDirty();
  }

  updateRoomAttachment(_delta: number = 0){
    if(this.host.spawned) this.host.updateModelVisibility();
  }

  updatePaused(_delta: number = 0){
    if(this.host.spawned) this.host.updateModelVisibility();
  }

  updateModelVisibility(){
    const model = this.host.model;
    if(!model) return;
    model.wasOffscreen = !model.visible;
    const mode = this.runtime.getMode();
    if(mode == EngineMode.FREELOOK){
      const player = this.runtime.getCurrentPlayer?.();
      if(player && this.host.id === player.id){
        model.visible = false;
        return;
      }
    }
    if(mode == EngineMode.INGAME){
      if(!this.host.room) model.visible = true;
      else model.visible = !!this.host.room.model?.userData?.visActive;
      if(!this.host.isOnScreen()) model.visible = false;
      return;
    }
    if(mode == EngineMode.DIALOG || mode == EngineMode.MINIGAME){
      model.visible = resolveDialogModelVisibility({
        mode,
        cutsceneMode: this.runtime.getCutsceneMode?.() ?? CutsceneMode.DIALOG,
        isPartyMember: this.host.isPartyMember(),
        objectCutsceneMode: !!this.host.cutsceneMode,
        hasRoom: !!this.host.room,
        roomModelVisible: this.host.room?.model?.userData?.visActive,
      });
    }
  }

  async applyShadowBlob(resref: string): Promise<void> {
    this.host.removeShadowBlob();
    if(!resref || !(this.host.model instanceof OdysseyModel3D)) return;
    try{
      const mdl = await MDLLoader.loader.load(resref);
      if(!mdl || !(this.host.model instanceof OdysseyModel3D)) return;
      const blob = await OdysseyModel3D.FromMDL(mdl, {
        context: this.host.context,
        castShadow: false,
        receiveShadow: false,
        manageLighting: true,
        static: true,
      });
      blob.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if(mesh.isMesh){
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        }
      });
      this.host.shadowBlobModel = blob;
      this.host.model.add(blob);
      this.host.updateShadowBlobOrientation();
      this.host.updateShadowBlobVisibility();
    }catch(_error){}
  }

  updateShadowBlobVisibility(){
    if(!this.host.shadowBlobModel) return;
    if(this.runtime.getMode() == EngineMode.FREELOOK){
      const player = this.runtime.getCurrentPlayer?.();
      if(player && this.host.id === player.id){
        this.host.shadowBlobModel.visible = false;
        return;
      }
    }
    this.host.shadowBlobModel.visible =
      (this.runtime.areShadowsEnabled?.() ?? false) && this.host.shadowsEnabled;
  }

  updateShadowBlobOrientation(){
    if(!this.host.shadowBlobModel) return;
    const normal = this.host.getGroundNormalForShadowBlob();
    if(normal.lengthSq() < 1e-8) return;
    this.shadowBlobQuaternion.setFromUnitVectors(this.shadowBlobUp, normal);
    this.host.shadowBlobModel.quaternion.copy(this.shadowBlobQuaternion);
  }

  getGroundNormalForShadowBlob(): THREE.Vector3 {
    const face = this.host.collisionManager.groundFace;
    if(face?.normal){
      this.shadowBlobNormal.copy(face.normal);
      if(this.host.room?.model?.matrixWorld){
        this.shadowBlobNormal.applyMatrix3(
          this.shadowBlobNormalMatrix.getNormalMatrix(this.host.room.model.matrixWorld),
        );
      }
      return this.shadowBlobNormal.normalize();
    }
    return this.shadowBlobUp;
  }

  setShadowsEnabled(enabled: boolean){
    this.host.shadowsEnabled = !!enabled;
    this.host.updateShadowBlobVisibility();
  }

  removeShadowBlob(){
    if(!this.host.shadowBlobModel) return;
    this.host.shadowBlobModel.removeFromParent();
    try{ this.host.shadowBlobModel.dispose(); }catch(_error){}
    this.host.shadowBlobModel = undefined;
  }

  getCameraHookPosition(){
    if(this.host.model?.camerahook){
      this.host.model.updateMatrixWorld(true);
      this.host.model.camerahook.getWorldPosition(this.cameraHookPosition);
      if(this.cameraHookPosition.lengthSq() < 1e-6 && this.host.position.lengthSq() > 1e-4){
        this.cameraHookPosition.copy(this.host.position);
        this.cameraHookPosition.z += 1.5;
      }
      return this.cameraHookPosition;
    }
    this.cameraHookPosition.copy(this.host.position);
    this.cameraHookPosition.z += 1.5;
    return this.cameraHookPosition;
  }

  getCameraHeight(){
    return this.host.model?.camerahook ? this.host.model.camerahook.position.z : 1.5;
  }

  getReticleNode(){
    const model = this.host.model;
    if(!model) return undefined;
    return model.lookathook || model.talkdummy || model.headhook ||
      model.rootdummy || model.camerahook || model;
  }

  getModelNodeByName(name: string){
    if(!this.host.model || !name) return undefined;
    const key = name.toLowerCase();
    if((this.host.model as any)[key]) return (this.host.model as any)[key];
    return this.host.model.nodes?.get(key) || this.host.model.nodes?.get(name);
  }

  dialogPlayAnimation(anim: SWAnimation = {} as SWAnimation){
    console.log('dialogPlayAnimation', anim);
    if(!this.host.model){
      console.warn('dialogPlayAnimation failed');
      console.log(this.host, anim);
      return;
    }
    const animation = this.host.model.odysseyAnimations.find(
      (candidate) => candidate.name.toLocaleLowerCase() == anim.name.toLocaleLowerCase(),
    );
    if(!animation) return;
    this.host.dialogAnimation = { animation, data: anim, started: false };
  }

  dialogResetAnimationState(){
    this.host.dialogAnimationState = {
      animationIndex: -1,
      animation: undefined,
      data: undefined,
      started: false,
    };
  }

  computeBoundingBox(force: boolean = false){
    if(!force && !this.host.collisionBoundsDirty && !this.host.collisionMatrixDirty){
      return this.host.box;
    }
    if(this.host.collisionManager?.refreshObjectBounds){
      this.host.collisionManager.refreshObjectBounds(force);
      return this.host.box;
    }
    if(this.host.container) this.host.container.updateMatrixWorld(force);
    else if(this.host.model) this.host.model.updateMatrixWorld(force);
    if(this.host.model instanceof THREE.Object3D) this.host.box.setFromObject(this.host.model);
    this.host.collisionBoundsDirty = false;
    this.host.collisionMatrixDirty = false;
    return this.host.box;
  }

  isOnScreen(frustum: THREE.Frustum){
    const cameraPosition = this.runtime.getCurrentCameraPosition?.();
    if(cameraPosition){
      this.host.distanceToCamera = this.host.position.distanceTo(cameraPosition);
    }
    if(this.host.area?.fog && this.host.distanceToCamera >= this.host.area.fog.far) return false;
    if(this.host.collisionMatrixDirty || this.host.collisionBoundsDirty){
      this.host.computeBoundingBox();
    }
    this.host.box.getBoundingSphere(this.host.sphere);
    return frustum.intersectsSphere(this.host.sphere);
  }

  setOpacity(opacity: number){
    if(this.host.model instanceof OdysseyModel3D) this.host.model.setOpacity(opacity);
  }

  static shadowBlobResRefFromSizeCategory(sizeCategory: number): string {
    switch(sizeCategory | 0){
      case 1:
      case 2: return 'Fx_Shadow_S';
      case 4:
      case 5: return 'Fx_Shadow_L';
      default: return 'Fx_Shadow_M';
    }
  }

  static shadowBlobResRefFromPlaceableShadowSize(shadowSize: number): string {
    switch(shadowSize | 0){
      case 0: return 'Fx_Shadow_S';
      case 2: return 'Fx_Shadow_L';
      default: return 'Fx_Shadow_M';
    }
  }
}
