/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { TextureType } from "../../../enums/loaders/TextureType";
import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, GUIButton, GUIProtoItem } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import { ModuleCreature, ModuleObject, ModulePlaceable } from "../../../module";
import { MenuContainer as K1_MenuContainer } from "../../kotor/KOTOR";
import * as THREE from "three";

/* @file
* The MenuContainer menu class.
*/

export class MenuContainer extends K1_MenuContainer {

  declare LBL_MESSAGE: GUILabel;
  declare LB_ITEMS: GUIListBox;
  declare BTN_OK: GUIButton;
  declare BTN_GIVEITEMS: GUIButton;
  declare BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'container_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
  
      this.BTN_CANCEL.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.LB_ITEMS.clearItems();
        this.Close();
      });

      this.BTN_OK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.LB_ITEMS.clearItems();
        
        if(this.container instanceof ModulePlaceable){
          this.container.retrieveInventory();
        }
        this.Close(true);
      });
      resolve();
    });
  }

  Close(onClosed = false) {
    super.Close();
    if (onClosed && this.container instanceof ModulePlaceable) {
      try {
        this.container.close(GameState.getCurrentPlayer() as any);
      } catch (e: any) {
      }
    }
    this.container = undefined as any;
  }

  Open() {
    // this.container = object;
    super.Open();
  }

  Show() {
    super.Show();
    if (this.container instanceof ModuleCreature || this.container instanceof ModulePlaceable) {
      let inventory = this.container.getInventory();
      for (let i = 0; i < inventory.length; i++) {
        let item = inventory[i];
        this.LB_ITEMS.addItem(item, undefined, (control: any, type: any) => {
          control.GetFieldByLabel('TEXT').GetChildStructs()[0].GetFieldByLabel('TEXT').SetValue(item.getName());
          let _ctrl2 = new GUIProtoItem(this.LB_ITEMS.menu, control, this.LB_ITEMS, this.LB_ITEMS.scale);
          _ctrl2.extent.width -= 52;
          _ctrl2.extent.left += 52;
          _ctrl2.setList(this.LB_ITEMS);
          this.LB_ITEMS.children.push(_ctrl2);
          let idx2 = this.LB_ITEMS.itemGroup.children.length;
          let item2 = _ctrl2.createControl();
          let iconMaterial = new THREE.SpriteMaterial({
            map: null,
            color: 16777215
          });
          iconMaterial.transparent = true;
          let iconSprite = new THREE.Sprite(iconMaterial);
          TextureLoader.enQueue(item.getIcon(), iconMaterial, TextureType.TEXTURE);
          item2.userData.spriteGroup = new THREE.Group();
          item2.userData.spriteGroup.position.x = -97;
          item2.userData.spriteGroup.position.z = 5;
          iconSprite.scale.x = 40;
          iconSprite.scale.y = 40;
          iconSprite.position.x = -10;
          for (let i = 0; i < 1; i++) {
            let hexMaterial = new THREE.SpriteMaterial({
              map: null,
              color: 16777215
            });
            hexMaterial.transparent = true;
            let hexSprite = new THREE.Sprite(hexMaterial);
            hexSprite.name = 'uibit_eqp_itm1';
            TextureLoader.enQueue('uibit_eqp_itm1', hexMaterial, TextureType.TEXTURE);
            hexSprite.visible = true;
            hexSprite.scale.x = hexSprite.scale.y = 40;
            hexSprite.position.x = -10;
            item2.userData.spriteGroup.add(hexSprite);
          }
          item2.add(item2.userData.spriteGroup);
          item2.userData.spriteGroup.add(iconSprite);
          this.LB_ITEMS.itemGroup.add(item2);
          _ctrl2.addEventListener('click', (e: any) => {
            e.stopPropagation();
          });
        });
      }
      TextureLoader.LoadQueue();
    }
  }
  
}
