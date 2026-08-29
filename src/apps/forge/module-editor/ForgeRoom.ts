import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import { shouldBuildFromMdl } from "@/apps/forge/helpers/keyModelLoad";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import * as KotOR from "@/apps/forge/KotOR";
import { OdysseyModelNodeType } from "@/enums/odyssey/OdysseyModelNodeType";

export class ForgeRoom extends ForgeGameObject {

  ambientScale: number = 0;
  envAudio: number = 0;
  roomName: string;

  model: KotOR.OdysseyModel3D | undefined;
  walkmesh: KotOR.OdysseyWalkMesh | undefined;

  linkedRoomData: KotOR.IVISRoom[] = [];
  linkedRoomNames: string[] = [];
  linkedRooms: Map<string, ForgeRoom> = new Map<string, ForgeRoom>();

  constructor(roomName: string){
    super();
    this.roomName = roomName;
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }

  onPropertyChange(property: string, newValue: any, oldValue: any){
    if(property === 'roomName'){
      if(newValue !== oldValue){
        this.load();
      }
    }
  }

  setAmbientScale(scale: number){
    this.ambientScale = scale;
  }

  setEnvAudio(audio: number){
    this.envAudio = audio;
  }

  setRoomName(name: string){
    const oldName = this.roomName;
    this.roomName = name;
    // Invalidate walkmesh cache when room name changes
    if(oldName !== name && this.area){
      this.area.invalidateWalkmeshCache();
    }
  }

  getEditorName(): string {
    return this.roomName;
  }

  setLinkedRooms(array: KotOR.IVISRoom[] = []){
    this.linkedRoomData = array;
    this.linkedRoomNames = array.map(room => room.name);
  }

  linkRooms(){
    for(let i = 0, iLen = this.linkedRoomData.length; i < iLen; i++){
      const room = this.area?.getRoomByName(this.linkedRoomData[i].name);
      if(!room){ continue; }
      this.linkedRooms.set(this.linkedRoomData[i].name, room);
    }
  }

  async load(){
    await this.loadModel(this.roomName);
    await this.loadWalkmesh(this.roomName);
    this.applyEditorWalkmeshVisibility();
    this.updateBoundingBox();
  }

  /** Whether the module editor currently wants walkmeshes shown. */
  private editorWalkmeshVisible(): boolean {
    return this.context?.visibilityState?.walkmesh === true;
  }

  /**
   * Toggle both room walkmesh representations:
   * - `.wok` collision mesh
   * - MDL AABB / makmesh nodes inside the room model
   */
  applyEditorWalkmeshVisibility(visible = this.editorWalkmeshVisible()): void {
    if (this.walkmesh?.material) {
      this.walkmesh.material.visible = visible;
    }
    if (!this.model) {
      return;
    }
    this.model.traverse((obj) => {
      const node =
        (obj as { odysseyModelNode?: { nodeType?: number } }).odysseyModelNode ||
        (obj.userData?.odysseyModelNode as { nodeType?: number } | undefined);
      if (!node || typeof node.nodeType !== "number") {
        return;
      }
      if ((node.nodeType & OdysseyModelNodeType.AABB) === OdysseyModelNodeType.AABB) {
        obj.visible = visible;
      }
    });
  }

  async loadModel(resRef = ''): Promise<KotOR.OdysseyModel3D | undefined> {
    //Check if the room name is NULL
    if(KotOR.Utility.is2daNULL(this.roomName)){
      return this.model;
    }

    if(this.model instanceof KotOR.OdysseyModel3D){
      this.model.removeFromParent();
      try{ this.model.dispose(); }catch(e){}
      this.model = undefined;
    }

    if(!ForgeState.hasGameData){
      return undefined;
    }

    try {
      const roomFile = await KotOR.MDLLoader.loader.load(resRef || this.roomName);
      if(!shouldBuildFromMdl(roomFile, ForgeState.hasGameData)){
        return undefined;
      }
      const room: KotOR.OdysseyModel3D = await KotOR.OdysseyModel3D.FromMDL(roomFile, {
        context: this.context,
        castShadow: false,
        receiveShadow: true,
        mergeStatic: true,
        disableMatrixUpdate: false,
        editorMode: true,
        attachMdlAabbMesh: true,
      });

      this.model = room;
      this.model.userData.moduleObject = this;
      this.container.add(this.model);
      this.box.setFromObject(this.container);

      if(this.model.odysseyAnimations.length){
        for(let animI = 0; animI < this.model.odysseyAnimations.length; animI++){
          if(this.model.odysseyAnimations[animI].name.indexOf('animloop') >= 0){
            this.model.animLoops.push(
              this.model.odysseyAnimations[animI]
            );
          }
        }
      }
      // Hide MDL AABB/makmesh until the Layers → Walkmesh toggle enables them.
      this.applyEditorWalkmeshVisibility(false);
      return this.model;
    }catch(e){
      console.error(e);
      return undefined;
    }
  }

  async loadWalkmesh(resRef = ''): Promise<KotOR.OdysseyWalkMesh | undefined> {
    if(!ForgeState.hasGameData){
      return undefined;
    }
    try {
      const buffer = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.wok, resRef);
      this.walkmesh = new KotOR.OdysseyWalkMesh(new KotOR.BinaryReader(buffer));
      this.walkmesh.name = resRef;
      if(this.model){
        this.model.wok = this.walkmesh;
      }
      const mesh = this.walkmesh.mesh;
      if(mesh){
        mesh.position.z += 0.001;
        // Prefer parenting under the room model so it follows room transforms.
        if(this.model){
          this.model.add(mesh);
        }else{
          this.container.add(mesh);
        }
        this.walkmesh.material.visible = this.editorWalkmeshVisible();
        mesh.visible = true;
      }
      return this.walkmesh;
    }catch(e){
      console.error(e);
    }
    return undefined;
  }

}
