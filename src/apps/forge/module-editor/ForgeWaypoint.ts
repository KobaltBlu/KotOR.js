import type { EventListenerCallback } from "@/apps/forge/EventListenerModel";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";

export class ForgeWaypoint extends ForgeGameObject {
  //GIT Instance Properties
  templateResType: number = KotOR.ResourceTypes.utw;

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
    const onPropChange: EventListenerCallback = (...args: unknown[]) => {
      this.onPropertyChange(
        args[0] as string,
        args[1] as string | number | boolean | object | undefined,
        args[2] as string | number | boolean | object | undefined
      );
    };
    this.addEventListener('onPropertyChange', onPropChange);
  }

  onPropertyChange(property: string, newValue: string | number | boolean | object | undefined, oldValue: string | number | boolean | object | undefined): void {
    if(property === 'templateResRef'){
      if(newValue !== oldValue){
        this.loadBlueprint().then(() => {
          this.load();
        });
      }
    }
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
      this.appearance = root.getNumberByLabel('Appearance');
    }
    if(root.hasField('Comment')){
      this.comment = root.getStringByLabel('Comment');
    }
    if(root.hasField('Description')){
      this.description = root.getFieldByLabel('Description').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('HasMapNote')){
      this.hasMapNote = root.getBooleanByLabel('HasMapNote');
    }
    if(root.hasField('LinkedTo')){
      this.linkedTo = root.getStringByLabel('LinkedTo');
    }
    if(root.hasField('LocalizedName')){
      this.localizedName = root.getFieldByLabel('LocalizedName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('MapNote')){
      this.mapNote = root.getFieldByLabel('MapNote').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('MapNoteEnabled')){
      this.mapNoteEnabled = root.getBooleanByLabel('MapNoteEnabled');
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getNumberByLabel('PaletteID');
    }
    if(root.hasField('Tag')){
      this.tag = root.getStringByLabel('Tag');
    }
    if(root.hasField('TemplateResRef')){
      this.templateResRef = root.getStringByLabel('TemplateResRef');
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
    this.updateBoundingBox();
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
    this.appearance = strt.getNumberByLabel('Appearance');
    this.description = strt.getFieldByLabel('Description').getCExoLocString() || new KotOR.CExoLocString();
    this.hasMapNote = strt.getBooleanByLabel('HasMapNote');
    this.linkedTo = strt.getStringByLabel('LinkedTo');
    this.mapNote = strt.getFieldByLabel('MapNote').getCExoLocString() || new KotOR.CExoLocString();
    this.mapNoteEnabled = strt.getBooleanByLabel('MapNoteEnabled');
    this.tag = strt.getStringByLabel('Tag');
    this.templateResRef = strt.getStringByLabel('TemplateResRef');
    this.rotation.z = strt.getNumberByLabel('XOrientation');
    this.position.x = strt.getNumberByLabel('XPosition');
    this.position.y = strt.getNumberByLabel('YPosition');
    this.position.z = strt.getNumberByLabel('ZPosition');
  }
}
