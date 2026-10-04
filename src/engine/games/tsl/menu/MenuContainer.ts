import { GameState } from "@engine/runtime/GameState";
import { GUILabel, GUIListBox, GUIButton } from "@engine/gui";
import { ModulePlaceable } from "@engine/module/ModulePlaceable";
import { MenuContainer as K1_MenuContainer } from "@engine/games/kotor/menu/MenuContainer";

/**
 * MenuContainer class.
 *
 * K2 loads container_p; behavior matches engine behavior via the K1 base.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuContainer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuContainer extends K1_MenuContainer {

  declare LBL_MESSAGE: GUILabel;
  declare LBL_OK: GUILabel;
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

  close() {
    super.close();
    if(this.container instanceof ModulePlaceable){
      try {
        this.container.close(GameState.PartyManager.getCurrentPlayer() as any);
      } catch (e: any) {
      }
    }
    this.container = undefined as any;
  }

}
