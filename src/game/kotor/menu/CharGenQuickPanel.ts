import { CurrentGame } from "../../../CurrentGame";
import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIControl, GUILabel, GUIButton } from "../../../gui";

/**
 * CharGenQuickPanel class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenQuickPanel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenQuickPanel extends GameMenu {

  LBL_DECORATION: GUILabel;
  BTN_BACK: GUIButton;
  BTN_CANCEL: GUIButton;
  LBL_3: GUIControl;
  LBL_2: GUIControl;
  LBL_1: GUIControl;
  BTN_STEPNAME1: GUIButton;
  LBL_NUM1: GUILabel;
  BTN_STEPNAME2: GUIButton;
  LBL_NUM2: GUILabel;
  BTN_STEPNAME3: GUIButton;
  LBL_NUM3: GUILabel;
  step1: boolean;
  step2: boolean;

  constructor(){
    super();
    this.gui_resref = 'quickpnl';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.step1 = false;
      this.step2 = false;

      this.BTN_STEPNAME1.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.CharGenPortCust.open();
      });

      this.BTN_STEPNAME2.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.CharGenName.open();
      });

      this.BTN_STEPNAME3.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.selectedCreature.equipment.ARMOR = undefined;
        GameState.CharGenManager.selectedCreature.template.getFieldByLabel('Equip_ItemList').childStructs = [];
        GameState.GlobalVariableManager.Init();
        GameState.PartyManager.PlayerTemplate = GameState.CharGenManager.selectedCreature.save();
        GameState.PartyManager.ActualPlayerTemplate = GameState.PartyManager.PlayerTemplate;
        GameState.PartyManager.AddPortraitToOrder(GameState.CharGenManager.selectedCreature.getPortraitResRef());
        CurrentGame.InitGameInProgressFolder(true).then( () => {
          GameState.LoadModule('end_m01aa');
        });
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.CharGenMain.close();
        this.manager.CharGenMain.childMenu = this.manager.CharGenQuickOrCustom;
        this.manager.CharGenMain.open();
      });

      this.BTN_BACK.reattach(this.tGuiPanel);

      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 85;
      this.recalculatePosition();
      resolve();
    });
  }

  show() {
    super.show();
    this.BTN_STEPNAME2.hide();
    this.LBL_2.hide();
    this.LBL_NUM2.hide();
    this.BTN_STEPNAME3.hide();
    this.LBL_3.hide();
    this.LBL_NUM3.hide();
    if (this.step1) {
      this.BTN_STEPNAME2.show();
      this.LBL_2.show();
      this.LBL_NUM2.show();
    }
    if (this.step2) {
      this.BTN_STEPNAME3.show();
      this.LBL_3.show();
      this.LBL_NUM3.show();
    }
  }
  
}
