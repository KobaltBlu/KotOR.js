import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";

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
  }

  setAmbientScale(scale: number){
    this.ambientScale = scale;
  }

  setEnvAudio(audio: number){
    this.envAudio = audio;
  }

  setRoomName(name: string){
    this.roomName = name;
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
  }

  async loadModel(resRef = ''): Promise<KotOR.OdysseyModel3D | undefined> {
    //Check if the room name is NULL
    if(KotOR.Utility.is2daNULL(this.roomName)){
      return this.model;
    }

    //Load the model
    const roomFile = await KotOR.MDLLoader.loader.load(this.roomName);
    const room: KotOR.OdysseyModel3D = await KotOR.OdysseyModel3D.FromMDL(roomFile, {
      context: this.context,
      castShadow: false,
      receiveShadow: true,
      mergeStatic: true
    });

    //Remove the old model
    if(this.model instanceof KotOR.OdysseyModel3D){
      this.model.removeFromParent();
      try{ this.model.dispose(); }catch(e){}
    }

    this.model = room;
    this.model.userData.moduleObject = this;
    this.container.add(this.model);
    this.box.setFromObject(this.container);

    //Load the animations
    if(this.model.odysseyAnimations.length){
      for(let animI = 0; animI < this.model.odysseyAnimations.length; animI++){
        if(this.model.odysseyAnimations[animI].name.indexOf('animloop') >= 0){
          this.model.animLoops.push(
            this.model.odysseyAnimations[animI]
          );
        }
      }
    }
  }

  async loadWalkmesh(resRef = ''): Promise<KotOR.OdysseyWalkMesh | undefined> {
    try {
      const buffer = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.wok, resRef);
      this.walkmesh = new KotOR.OdysseyWalkMesh(new KotOR.BinaryReader(buffer));
      this.walkmesh.name = resRef;
      if(this.model){
        this.model.wok = this.walkmesh;
      }
      return this.walkmesh;
    }catch(e){
      console.error(e);
    }
    return undefined;
  }

}