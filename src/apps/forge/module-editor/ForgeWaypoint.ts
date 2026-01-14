import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";

export class ForgeWaypoint extends ForgeGameObject {
  appearance: number = 0;
  description: string = '';
  hasMapNote: boolean = false;
  linkedTo: string = '';
  mapNote: string = '';
  mapNoteEnabled: boolean = false;
  tag: string = '';

  constructor(){
    super();
  }

  async load(){
    
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(5);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Appearance', this.appearance));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Description', this.description));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'HasMapNote', this.hasMapNote ? 1 : 0));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'LinkedTo', this.linkedTo));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'MapNote', this.mapNote));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'MapNoteEnabled', this.mapNoteEnabled ? 1 : 0));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Tag', this.tag));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XOrientation', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YOrientation', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.appearance = strt.getFieldByLabel('Appearance').getValue() as number;
    this.description = strt.getFieldByLabel('Description').getValue() as string;
    this.hasMapNote = strt.getFieldByLabel('HasMapNote').getValue() as boolean;
    this.linkedTo = strt.getFieldByLabel('LinkedTo').getValue() as string;
    this.mapNote = strt.getFieldByLabel('MapNote').getValue() as string;
    this.mapNoteEnabled = strt.getFieldByLabel('MapNoteEnabled').getValue() as boolean;
    this.tag = strt.getFieldByLabel('Tag').getValue() as string;
    this.templateResRef = strt.getFieldByLabel('TemplateResRef').getValue() as string;
    this.rotation.z = strt.getFieldByLabel('XOrientation').getValue() as number;
    this.position.x = strt.getFieldByLabel('XPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('YOrientation').getValue() as number;
    this.position.y = strt.getFieldByLabel('YPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('ZOrientation').getValue() as number;
    this.position.z = strt.getFieldByLabel('ZPosition').getValue() as number;
  }
}