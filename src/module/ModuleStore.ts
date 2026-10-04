import { ModuleObject } from "@/module/ModuleObject";
import { ModuleItem } from "@/module/ModuleItem";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { ResourceLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
// import { ModuleObjectManager } from "@/managers";

/**
* ModuleStore class.
* 
* Class representing merchant stores found in modules areas.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleStore.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleStore extends ModuleObject {
  buySellFlag: number;
  markDown: number;
  markUp: number;
  onOpenStore: any;
  resref: any;

  constructor( gff = new GFFObject() ){
    super(gff);
    this.objectType |= ModuleObjectType.ModuleStore;
    
    this.template = gff;
    this.buySellFlag = -1;
    this.markDown = 0;
    this.markUp = 0;
    this.onOpenStore = null;
    this.tag = '';
    this.inventory = [];

  }

  getInventory(){
    return this.inventory;
  }

  getMarkDown(){
    return this.markDown * .01;
  }

  getMarkUp(){
    return this.markUp * .01;
  }

  canSellToCustomer(){
    switch(Number(this.buySellFlag)){
      case 1:
        return true;
      case 2:
        return false;
      case 3:
        return true;
      default:
        return true;
    }
  }

  canBuyFromCustomer(){
    switch(Number(this.buySellFlag)){
      case 1:
        return false;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  }

  loadScripts(){
    if(typeof this.onOpenStore !== 'string' || !this.onOpenStore.length){
      return;
    }

    const nwscript = GameState.NWScript.Load(this.onOpenStore);
    if(!nwscript){
      return;
    }

    nwscript.caller = this;
    this.scripts['OnOpenStore'] = nwscript;
  }

  runOnOpenStore(customer?: ModuleObject){
    let instance = this.scripts['OnOpenStore']?.nwscript?.newInstance();
    if(!instance && typeof this.onOpenStore === 'string' && this.onOpenStore.length){
      instance = GameState.NWScript.Load(this.onOpenStore);
    }

    if(!instance){
      return;
    }

    instance.listenPatternSpeaker = customer;
    instance.lastSpeaker = customer;
    instance.enteringObject = customer;
    instance.run(this);
  }

  load(){
    const templateResRef = this.getTemplateResRef() || this.getResRef();
    if(templateResRef){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utm'], templateResRef);
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.templateResRef = templateResRef;
        this.initProperties();
        this.loadScripts();
      }else{
        console.error('Failed to load ModuleStore template');
        if(this.template instanceof GFFObject){
          this.templateResRef = templateResRef;
          this.initProperties();
          this.loadScripts();
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      this.loadScripts();
    }
  }

  initProperties(){
    
    if(!this.initialized){
      if(this.template.RootNode.hasField('ObjectId')){
        this.id = this.template.getFieldByLabel('ObjectId').getValue();
      }else if(this.template.RootNode.hasField('ID')){
        this.id = this.template.getFieldByLabel('ID').getValue();
      }
      
      GameState.ModuleObjectManager.AddObjectById(this);
    }

    if(this.template.RootNode.hasField('BuySellFlag'))
      this.buySellFlag = this.template.getFieldByLabel('BuySellFlag').getValue()

    if(this.template.RootNode.hasField('LocName'))
      this.locName = this.template.getFieldByLabel('LocName').getCExoLocString();

    if(this.template.RootNode.hasField('MarkDown'))
      this.markDown = this.template.getFieldByLabel('MarkDown').getValue();

    if(this.template.RootNode.hasField('MarkUp'))
      this.markUp = this.template.getFieldByLabel('MarkUp').getValue();

    if(this.template.RootNode.hasField('OnOpenStore'))
      this.onOpenStore = this.template.getFieldByLabel('OnOpenStore').getValue();

    if(this.template.RootNode.hasField('TemplateResRef'))
      this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();
    else if(this.template.RootNode.hasField('ResRef'))
      this.templateResRef = this.template.getFieldByLabel('ResRef').getValue();
      
    if(this.template.RootNode.hasField('Tag'))
      this.tag = this.template.getFieldByLabel('Tag').getValue(); 
    
    if(this.template.RootNode.hasField('XPosition'))
      this.position.x = this.template.RootNode.getFieldByLabel('XPosition').getValue();

    if(this.template.RootNode.hasField('YPosition'))
      this.position.y = this.template.RootNode.getFieldByLabel('YPosition').getValue();

    if(this.template.RootNode.hasField('ZPosition'))
      this.position.z = this.template.RootNode.getFieldByLabel('ZPosition').getValue();
    
    if(this.template.RootNode.hasField('XOrientation'))
      this.rotation.x = this.template.RootNode.getFieldByLabel('XOrientation').getValue();

    if(this.template.RootNode.hasField('YOrientation'))
      this.rotation.y = this.template.RootNode.getFieldByLabel('YOrientation').getValue();

    if(this.template.RootNode.hasField('ZOrientation'))
      this.rotation.z = this.template.RootNode.getFieldByLabel('ZOrientation').getValue();

    if(this.template.RootNode.hasField('SWVarTable')){
      let swVarTableStruct = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0];
      if(swVarTableStruct){
        if(swVarTableStruct.hasField('BitArray')){
          let localBools = swVarTableStruct.getFieldByLabel('BitArray').getChildStructs();
          for(let i = 0; i < localBools.length; i++){
            let data = localBools[i].getFieldByLabel('Variable').getValue();
            for(let bit = 0; bit < 32; bit++){
              this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
            }
          }
        }

        if(swVarTableStruct.hasField('ByteArray')){
          let localNumbers = swVarTableStruct.getFieldByLabel('ByteArray').getChildStructs();
          for(let i = 0; i < localNumbers.length; i++){
            let data = localNumbers[i].getFieldByLabel('Variable').getValue();
            this.setLocalNumber(i, data);
          }
        }
      }
    }

    try{
      if(this.template.RootNode.hasField('ActionList') && !this.actionQueue.length){
        const actionStructs = this.template.RootNode.getFieldByLabel('ActionList').getChildStructs();
        for(let i = 0, len = actionStructs.length; i < len; i++){
          const action = GameState.ActionFactory.FromStruct(actionStructs[i]);
          if(action){
            this.actionQueue.add(action);
          }
        }
      }
    }catch(e: any){
      console.error(e);
    }
            
    if(this.template.RootNode.hasField('ItemList')){
      let items = this.template.RootNode.getFieldByLabel('ItemList').getChildStructs() || [];
      for(let i = 0; i < items.length; i++){
        const moduleItem = new ModuleItem(GFFObject.FromStruct(items[i]));
        this.inventory.push(moduleItem)
        moduleItem.load();
      }
    }
    
    this.initialized = true;

  }

  destroy(): void {
    if(this.destroyed || this.destroying){
      return;
    }
    super.destroy();

    const inventory = this.inventory.splice(0, this.inventory.length);
    for(let i = 0; i < inventory.length; i++){
      inventory[i]?.destroy();
    }
  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTM ';
    gff.RootNode.type = 6;

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') ).setValue(this.locName);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'MarkDown') ).setValue(this.markDown);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'MarkUp') ).setValue(this.markUp);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnOpenStore') ).setValue (
      this.onOpenStore instanceof NWScriptInstance ? this.onOpenStore.name : (typeof this.onOpenStore === 'string' ? this.onOpenStore : '')
    );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BuySellFlag') ).setValue(this.buySellFlag);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'TemplateResRef') ).setValue(this.templateResRef || '');

    let itemList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'ItemList') );
    for(let i = 0; i < this.inventory.length; i++){
      itemList.addChildStruct( this.inventory[i].save() );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue(this.rotation.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue(this.rotation.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue(this.rotation.z);

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(1);


    this.template = gff;
    return gff;
  }

}
