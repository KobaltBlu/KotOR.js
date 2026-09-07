import { ModuleObject } from "@/module/ModuleObject";
import { GameState } from "@/GameState";
import { OdysseyModel3D } from "@/three/odyssey";
import { OdysseyModel } from "@/odyssey";
import { ILayoutTrack } from "@/interface/resource/ILayoutTrack";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { MDLLoader } from "@/loaders";

/**
* ModuleMGTrack class.
*
* LYT track prototype (name + world position). MiniGame stores proto tracks
* (AddTrack); each follower gets its own track Gob via ForceSetTrack / NewCAurObject.
*
* @file ModuleMGTrack.ts
*/
export class ModuleMGTrack extends ModuleObject {
  index: number;
  track: string;
  layout: ILayoutTrack;

  constructor(layout: ILayoutTrack){
    super();
    this.objectType |= ModuleObjectType.ModuleMGTrack;

    this.index = 0;
    this.track = ModuleMGTrack.normalizeName(layout?.name);
    this.position.copy(layout.position.clone());
    this.layout = layout;
  }

  static normalizeName(name: string | undefined | null): string {
    return String(name ?? '').replace(/\0[\s\S]*$/g, '').toLowerCase();
  }

  update(delta: number = 0){

  }

  updatePaused(delta: number = 0){
    
  }

  async load(){
    // Proto only — follower models are created in createFollowerModel.
  }

  /**
   * SetPlayer/AddEnemy path — NewCAurObject(trackResRef) per follower,
   * positioned from proto track Vector.
   */
  async createFollowerModel(): Promise<OdysseyModel3D> {
    const mdl = await MDLLoader.loader.load(this.track);
    const model = await OdysseyModel3D.FromMDL(mdl, {
      context: this.context,
      castShadow: false,
      receiveShadow: false
    });
    model.name = this.track;
    model.position.copy(this.position);
    model.hasCollision = true;
    model.userData.moduleObject = this;
    return model;
  }

  /** @deprecated Prefer createFollowerModel — shared proto model is not used for followers. */
  async loadModel (){
    const model = await this.createFollowerModel();
    this.model = model;
    return this.model;
  }

}
