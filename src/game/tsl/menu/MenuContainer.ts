/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { TextureType } from "../../../enums/loaders/TextureType";
import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, GUIButton, GUIProtoItem } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { ModuleCreature, ModuleObject, ModulePlaceable } from "../../../module";
import { MenuContainer as K1_MenuContainer } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";
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
        if(this.container instanceof ModulePlaceable){
          this.container.close(GameState.player);
        }
        this.Close();
      });
      this._button_b = this.BTN_CANCEL;

      this.BTN_OK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.LB_ITEMS.clearItems();
        if(this.container instanceof ModulePlaceable){
          this.container.retrieveInventory();
          this.container.close(GameState.player);
        }else if(this.container instanceof ModuleCreature){
          this.container.retrieveInventory();
          //this.container.close(Game.player);
        }
        this.Close();
      });
      this._button_a = this.BTN_OK;
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
  }
  
}
