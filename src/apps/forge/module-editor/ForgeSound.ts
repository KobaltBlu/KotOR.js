import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";

export class ForgeSound extends ForgeGameObject {
  generatedType: number = 0;

  constructor(){
    super();
  }

  async load(){
    
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(6);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'GeneratedType', this.generatedType));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.generatedType = strt.getFieldByLabel('GeneratedType').getValue() as number;
    this.templateResRef = strt.getFieldByLabel('TemplateResRef').getValue() as string;
    this.position.x = strt.getFieldByLabel('X').getValue() as number;
    this.position.y = strt.getFieldByLabel('Y').getValue() as number;
    this.position.z = strt.getFieldByLabel('Z').getValue() as number;
  }

}