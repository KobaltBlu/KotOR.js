import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";

export class ForgeWaypoint extends ForgeGameObject {
  //GIT Instance Properties
  templateResType: typeof KotOR.ResourceTypes = KotOR.ResourceTypes.utw;

  //Blueprint Properties
  appearance: number = 0;
  comment: string = '';
  description: KotOR.CExoLocString = new KotOR.CExoLocString();
  hasMapNote: boolean = false;
  linkedTo: string = '';
  localizedName: KotOR.CExoLocString = new KotOR.CExoLocString();
  mapNote: KotOR.CExoLocString = new KotOR.CExoLocString();
  mapNoteEnabled: boolean = false;
  paletteID: number = 0;
  tag: string = '';

  constructor(buffer?: Uint8Array){
    super();
    if(buffer){
      this.loadFromBuffer(buffer);
    }
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }

  onPropertyChange(property: string, newValue: any, oldValue: any){
    // Add any property change handlers here if needed
  }

  loadFromBuffer(buffer: Uint8Array){
    this.blueprint = new KotOR.GFFObject(buffer);
    this.loadFromBlueprint();
  }

  loadFromBlueprint(){
    if(!this.blueprint) return;
    const root = this.blueprint.RootNode;
    if(!root) return;

    if(root.hasField('Appearance')){
      this.appearance = root.getFieldByLabel('Appearance').getValue() || 0;
    }
    if(root.hasField('Comment')){
      this.comment = root.getFieldByLabel('Comment').getValue() || '';
    }
    if(root.hasField('Description')){
      this.description = root.getFieldByLabel('Description').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('HasMapNote')){
      this.hasMapNote = root.getFieldByLabel('HasMapNote').getValue() || false;
    }
    if(root.hasField('LinkedTo')){
      this.linkedTo = root.getFieldByLabel('LinkedTo').getValue() || '';
    }
    if(root.hasField('LocalizedName')){
      this.localizedName = root.getFieldByLabel('LocalizedName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('MapNote')){
      this.mapNote = root.getFieldByLabel('MapNote').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('MapNoteEnabled')){
      this.mapNoteEnabled = root.getFieldByLabel('MapNoteEnabled').getValue() || false;
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getFieldByLabel('PaletteID').getValue() || 0;
    }
    if(root.hasField('Tag')){
      this.tag = root.getFieldByLabel('Tag').getValue() || '';
    }
    if(root.hasField('TemplateResRef')){
      this.templateResRef = root.getFieldByLabel('TemplateResRef').getValue() || '';
    }
  }

  exportToBlueprint(): KotOR.GFFObject {
    this.blueprint = new KotOR.GFFObject();
    this.blueprint.FileType = 'UTW ';
    this.blueprint.RootNode.type = -1;
    const root = this.blueprint.RootNode;
    if(!root) return this.blueprint;
    
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Appearance', this.appearance) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Description', this.description) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'HasMapNote', this.hasMapNote ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'LinkedTo', this.linkedTo) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocalizedName', this.localizedName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'MapNote', this.mapNote) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'MapNoteEnabled', this.mapNoteEnabled ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Tag', this.tag) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef || '') );

    return this.blueprint;
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
    this.description = strt.getFieldByLabel('Description').getCExoLocString() || new KotOR.CExoLocString();
    this.hasMapNote = strt.getFieldByLabel('HasMapNote').getValue() as boolean;
    this.linkedTo = strt.getFieldByLabel('LinkedTo').getValue() as string;
    this.mapNote = strt.getFieldByLabel('MapNote').getCExoLocString() || new KotOR.CExoLocString();
    this.mapNoteEnabled = strt.getFieldByLabel('MapNoteEnabled').getValue() as boolean;
    this.tag = strt.getFieldByLabel('Tag').getValue() as string;
    this.templateResRef = strt.getFieldByLabel('TemplateResRef').getValue() as string;
    this.rotation.z = strt.getFieldByLabel('XOrientation').getValue() as number;
    this.position.x = strt.getFieldByLabel('XPosition').getValue() as number;
    this.position.y = strt.getFieldByLabel('YPosition').getValue() as number;
    this.position.z = strt.getFieldByLabel('ZPosition').getValue() as number;
  }
}