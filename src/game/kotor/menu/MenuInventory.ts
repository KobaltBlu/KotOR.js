
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton, GUIControl } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { ModuleItem } from "../../../module";
import { GUIInventoryItem } from "../../../gui/protoitem/GUIInventoryItem";
import { GameState } from "../../../GameState";

/**
 * MenuInventory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuInventory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuInventory extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_INV: GUILabel;
  LBL_CREDITS_VALUE: GUILabel;
  LBL_CREDITS: GUILabel;
  LB_DESCRIPTION: GUIListBox;
  LBL_BGPORT: GUILabel;
  LBL_BGSTATS: GUILabel;
  LBL_PORT: GUILabel;
  LBL_VIT: GUILabel;
  LBL_DEF: GUILabel;
  BTN_QUESTITEMS: GUIButton;
  BTN_CHANGE1: GUIButton;
  BTN_CHANGE2: GUIButton;
  BTN_USEITEM: GUIButton;
  BTN_EXIT: GUIButton;

  selected: ModuleItem;

  constructor(){
    super();
    this.gui_resref = 'inventory';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;

      this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
      this.LB_ITEMS.onSelected = (item: ModuleItem) => {
        this.selected = item;
        this.UpdateSelected();
      }

      this.LB_ITEMS.padding = 5;
      this.LB_ITEMS.offset.x = 0;
      resolve();
    });
  }

  UpdateSelected(){
    if(this.selected instanceof ModuleItem){
      this.LB_DESCRIPTION?.clearItems();
      this.LB_DESCRIPTION?.addItem(this.selected.getDescription());
    }
  }

  filterInventory(){
    this.LB_ITEMS.clearItems();
    let inv = GameState.InventoryManager.getNonQuestInventory();
    for (let i = 0; i < inv.length; i++) {
      this.LB_ITEMS.addItem(inv[i]);
    }
    TextureLoader.LoadQueue();
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_INV.onHoverIn();
    this.filterInventory();
    this.BTN_CHANGE1?.hide();
    this.BTN_CHANGE2?.hide();
    let currentPC = GameState.PartyManager.party[0];
    if (currentPC) {
      this.LBL_VIT?.setText(currentPC.getHP() + '/' + currentPC.getMaxHP());
      this.LBL_DEF?.setText(currentPC.getAC());
    }
    this.LBL_CREDITS_VALUE.setText(GameState.PartyManager.Gold);

    let btn_change: GUIControl;
    for (let i = 0; i < GameState.PartyManager.party.length; i++) {
      btn_change = this.getControlByName('BTN_CHANGE' + i);
      if(btn_change){
        let partyMember = GameState.PartyManager.party[i];
        let portraitId = partyMember.getPortraitId();
        let portrait = GameState.TwoDAManager.datatables.get('portraits').rows[portraitId];
        if (!i) {
          if (this.LBL_PORT.getFillTextureName() != portrait.baseresref) {
            this.LBL_PORT.setFillTextureName(portrait.baseresref);
          }
        } else {
          btn_change.show();
          if (btn_change.getFillTextureName() != portrait.baseresref) {
            btn_change.setFillTextureName(portrait.baseresref);
          }
        }
      }
    }
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_EQU.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_CHAR.click();
  }
  
}

