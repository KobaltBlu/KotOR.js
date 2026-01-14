import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";

export class ForgeDoor extends ForgeGameObject {
  linkedTo: string = '';
  linkedToFlags: number = 0;
  linkedToModule: string = '';
  tag: string = '';
  transitionDestin: string = '';

  /**
   * The walkmesh for the closed state
   */
  walkmeshClosed: KotOR.OdysseyWalkMesh;

  /**
   * The walkmesh for the open state (side 1)
   */
  walkmeshOpen1: KotOR.OdysseyWalkMesh;

  /**
   * The walkmesh for the open state (side 2)
   */
  walkmeshOpen2: KotOR.OdysseyWalkMesh;

  constructor(){
    super();
  }

  async load(){
    
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(8);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Bearing', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'LinkedTo', this.linkedTo));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'LinkedToFlags', this.linkedToFlags));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'LinkedToModule', this.linkedToModule));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'TransitionDestin', this.transitionDestin));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'X', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Y', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Z', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.rotation.z = strt.getFieldByLabel('Bearing').getValue() as number;
    this.linkedTo = strt.getFieldByLabel('LinkedTo').getValue() as string;
    this.linkedToFlags = strt.getFieldByLabel('LinkedToFlags').getValue() as number;
    this.linkedToModule = strt.getFieldByLabel('LinkedToModule').getValue() as string;
    this.tag = strt.getFieldByLabel('Tag').getValue() as string;
    this.templateResRef = strt.getFieldByLabel('TemplateResRef').getValue() as string;
    this.transitionDestin = strt.getFieldByLabel('TransitionDestin').getValue() as string;
    this.position.x = strt.getFieldByLabel('X').getValue() as number;
    this.position.y = strt.getFieldByLabel('Y').getValue() as number;
    this.position.z = strt.getFieldByLabel('Z').getValue() as number;
  }

}