import { GameObject } from "@engine/module/GameObject";
import { Item } from "@engine/module/Item";
import { GFFObject } from "@core/resource/GFFObject";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { getDefaultRuntimeContext } from "@engine/runtime/context";
import { GameObjectLoadPipeline } from "@engine/module/serialization/GameObjectLoadPipeline";
import { GameObjectInitFinalizer } from "@engine/module/serialization/GameObjectInitFinalizer";
import { storeSerializer } from "@engine/module/serialization/StoreSerializer";
import type { NestedItemEntry } from "@engine/module/serialization/NestedItemListSerializer";
// import { GameObjectManager } from "@engine/managers";

/**
* Store class.
*
* Class representing merchant stores found in modules areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file Store.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class Store extends GameObject {
  buySellFlag: number;
  markDown: number;
  markUp: number;
  onOpenStore: any;
  resref: any;

  constructor( gff = new GFFObject() ){
    super(gff);
    this.objectType |= GameObjectType.Store;
    
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

  load(){
    // GIT StoreList / UTM use ResRef (not TemplateResRef). Prefer ResRef; fall back for odd templates.
    this.seedResRefsFromTemplate();
    const resRef = this.getResRef() || this.getTemplateResRef();
    if(resRef){
      const merged = GameObjectLoadPipeline.mergeBlueprint(this.template, {
        refField: 'ResRef',
        resourceKey: 'utm',
        runtimeResRef: resRef,
      });
      if(!merged){
        console.error('Failed to load Store template', resRef);
      }
      if(this.template instanceof GFFObject){
        this.initProperties();
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
    }
  }

  initProperties(){
    const needsRegister = !this.initialized;
    const runtime = getDefaultRuntimeContext();
    storeSerializer.deserialize(this, this.template, runtime.toDeserializeContext());

    const pendingInventory = (this as any)._pendingInventoryEntries as NestedItemEntry[] | undefined;
    (this as any)._pendingInventoryEntries = undefined;
    if(pendingInventory){
      // Avoid duplicating stock if initProperties runs again after a template merge.
      while(this.inventory.length){
        this.inventory.pop();
      }
      for(let i = 0; i < pendingInventory.length; i++){
        const moduleItem = new Item(GFFObject.FromStruct(pendingInventory[i].struct));
        const stacked = this.addItem(moduleItem);
        stacked.setPossessor(this);
      }
    }


    GameObjectInitFinalizer.finalize(this, {
      needsRegister,
      register: () => runtime.register(this),
    });
  }

  destroy(): void {
    super.destroy();
    if(this.area) this.area.detachObject(this);

    while(this.inventory.length){
      const item = this.inventory[0];
      if(item){
        item.destroy();
      }
      this.inventory.splice(0, 1);
    }
  }

  save(){
    const gff = storeSerializer.serialize(this);
    this.template = gff;
    return gff;
  }

}
