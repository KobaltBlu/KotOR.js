import type { EventListenerCallback } from "@/apps/forge/EventListenerModel";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";

export interface StoreItemEntry {
  inventoryRes: string;
  reposPosX: number;
  reposPosY: number;
}

export class ForgeStore extends ForgeGameObject {
  //GIT Instance Properties
  templateResType: typeof KotOR.ResourceTypes = KotOR.ResourceTypes.utm;
  resref: string = '';

  //Blueprint Properties
  buySellFlag: number = 0;
  comment: string = '';
  id: number = 0;
  itemList: StoreItemEntry[] = [];
  locName: KotOR.CExoLocString = new KotOR.CExoLocString();
  markDown: number = 0;
  markUp: number = 0;
  onOpenStore: string = '';
  tag: string = '';

  constructor(buffer?: Uint8Array){
    super();
    if(buffer){
      this.loadFromBuffer(buffer);
    }
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }

  onPropertyChange(property: string, newValue: any, oldValue: any){
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

    if(root.hasField('BuySellFlag')){
      this.buySellFlag = root.getFieldByLabel('BuySellFlag').getValue() || 0;
    }
    if(root.hasField('Comment')){
      this.comment = root.getFieldByLabel('Comment').getValue() || '';
    }
    if(root.hasField('ID')){
      this.id = root.getFieldByLabel('ID').getValue() || 0;
    }
    if(root.hasField('ItemList')){
      const itemListField = root.getFieldByLabel('ItemList');
      const structs = itemListField.getChildStructs() || [];
      this.itemList = structs.map((struct: KotOR.GFFStruct) => {
        return {
          inventoryRes: struct.hasField('InventoryRes') ? struct.getFieldByLabel('InventoryRes').getValue() || '' : '',
          reposPosX: struct.hasField('Repos_PosX') ? struct.getFieldByLabel('Repos_PosX').getValue() || 0 : 0,
          reposPosY: struct.hasField('Repos_Posy') ? struct.getFieldByLabel('Repos_Posy').getValue() || 0 : 0,
        } as StoreItemEntry;
      });
    }
    if(root.hasField('LocName')){
      this.locName = root.getFieldByLabel('LocName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('MarkDown')){
      this.markDown = root.getFieldByLabel('MarkDown').getValue() || 0;
    }
    if(root.hasField('MarkUp')){
      this.markUp = root.getFieldByLabel('MarkUp').getValue() || 0;
    }
    if(root.hasField('OnOpenStore')){
      this.onOpenStore = root.getFieldByLabel('OnOpenStore').getValue() || '';
    }
    if(root.hasField('ResRef')){
      this.templateResRef = root.getFieldByLabel('ResRef').getValue() || '';
      this.resref = this.templateResRef;
    }
    if(root.hasField('Tag')){
      this.tag = root.getFieldByLabel('Tag').getValue() || '';
    }
  }

  exportToBlueprint(): KotOR.GFFObject {
    this.blueprint = new KotOR.GFFObject();
    this.blueprint.FileType = 'UTM ';
    this.blueprint.RootNode.type = -1;
    const root = this.blueprint.RootNode;
    if(!root) return this.blueprint;

    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'BuySellFlag', this.buySellFlag) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'ID', this.id) );

    const itemListField = root.addField( new KotOR.GFFField(KotOR.GFFDataType.LIST, 'ItemList') );
    for(let i = 0; i < this.itemList.length; i++){
      if(itemListField){
        const itemStruct = new KotOR.GFFStruct(0);
        const item = this.itemList[i];
        itemStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'InventoryRes', item.inventoryRes || '') );
        itemStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Repos_PosX', item.reposPosX || 0) );
        itemStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Repos_Posy', item.reposPosY || 0) );
        itemListField.addChildStruct(itemStruct);
      }
    }

    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocName', this.locName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'MarkDown', this.markDown) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'MarkUp', this.markUp) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnOpenStore', this.onOpenStore) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ResRef', this.templateResRef || '') );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag) );

    return this.blueprint;
  }

  async load(){
    this.updateBoundingBox();
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(11);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ResRef', this.resref));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XOrientation', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YOrientation', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.resref = strt.getFieldByLabel('ResRef').getValue() as string;
    this.rotation.z = strt.getFieldByLabel('XOrientation').getValue() as number;
    this.position.x = strt.getFieldByLabel('XPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('YOrientation').getValue() as number;
    this.position.y = strt.getFieldByLabel('YPosition').getValue() as number;
    this.position.z = strt.getFieldByLabel('ZPosition').getValue() as number;
  }

}