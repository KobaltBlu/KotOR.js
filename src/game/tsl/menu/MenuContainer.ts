import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { ModuleCreature, ModulePlaceable } from "../../../module";
import { MenuContainer as K1_MenuContainer } from "../../kotor/KOTOR";

/**
 * MenuContainer class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuContainer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_CANCEL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.LB_ITEMS.clearItems();
        if(this.container instanceof ModulePlaceable){
          this.container.close(GameState.PartyManager.party[0]);
        }
        this.close();
      });
      this._button_b = this.BTN_CANCEL;

      this.BTN_OK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.LB_ITEMS.clearItems();
        if(this.container instanceof ModulePlaceable){
          this.container.retrieveInventory();
          this.container.close(GameState.PartyManager.party[0]);
        }else if(this.container instanceof ModuleCreature){
          this.container.retrieveInventory();
          //this.container.close(Game.player);
        }
        this.close();
      });
      this._button_a = this.BTN_OK;
      resolve();
    });
  }

  close(onClosed = false) {
    super.close();
    if (onClosed && this.container instanceof ModulePlaceable) {
      try {
        this.container.close(GameState.getCurrentPlayer() as any);
      } catch (e: any) {
      }
    }
    this.container = undefined as any;
  }

  open() {
    // this.container = object;
    super.open();
  }

  show() {
    super.show();
  }
  
}
