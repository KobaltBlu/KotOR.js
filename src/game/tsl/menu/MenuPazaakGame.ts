import type { GUILabel, GUIButton } from "../../../gui";
import { MenuPazaakGame as K1_MenuPazaakGame } from "../../kotor/KOTOR";

/**
 * MenuPazaakGame class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPazaakGame.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPazaakGame extends K1_MenuPazaakGame {

  declare LBL_NPCSIDEDECK: GUILabel;
  declare LBL_PLRSIDEDECK: GUILabel;
  declare BTN_NPC0: GUIButton;
  declare BTN_NPC3: GUIButton;
  declare BTN_NPC6: GUIButton;
  declare BTN_PLR0: GUIButton;
  declare BTN_PLR3: GUIButton;
  declare BTN_PLR6: GUIButton;
  declare BTN_PLR7: GUIButton;
  declare BTN_PLR4: GUIButton;
  declare BTN_PLR1: GUIButton;
  declare BTN_NPC7: GUIButton;
  declare BTN_NPC4: GUIButton;
  declare BTN_NPC1: GUIButton;
  declare BTN_PLR5: GUIButton;
  declare BTN_PLR2: GUIButton;
  declare BTN_PLR8: GUIButton;
  declare BTN_NPC8: GUIButton;
  declare BTN_NPC5: GUIButton;
  declare BTN_NPC2: GUIButton;
  declare BTN_NPCSIDE2: GUIButton;
  declare BTN_NPCSIDE0: GUIButton;
  declare BTN_PLRSIDE2: GUIButton;
  declare BTN_PLRSIDE0: GUIButton;
  declare BTN_NPCSIDE3: GUIButton;
  declare BTN_NPCSIDE1: GUIButton;
  declare BTN_PLRSIDE3: GUIButton;
  declare BTN_PLRSIDE1: GUIButton;
  declare LBL_NPC0: GUILabel;
  declare LBL_NPC3: GUILabel;
  declare LBL_NPC6: GUILabel;
  declare LBL_PLR0: GUILabel;
  declare LBL_PLR3: GUILabel;
  declare LBL_PLR6: GUILabel;
  declare LBL_NPC1: GUILabel;
  declare LBL_NPC4: GUILabel;
  declare LBL_NPC7: GUILabel;
  declare LBL_PLR1: GUILabel;
  declare LBL_PLR4: GUILabel;
  declare LBL_PLR7: GUILabel;
  declare LBL_NPC2: GUILabel;
  declare LBL_NPC8: GUILabel;
  declare LBL_NPC5: GUILabel;
  declare LBL_PLR2: GUILabel;
  declare LBL_PLR5: GUILabel;
  declare LBL_PLR8: GUILabel;
  declare LBL_PLRSIDE0: GUILabel;
  declare LBL_PLRSIDE2: GUILabel;
  declare LBL_NPCSIDE0: GUILabel;
  declare LBL_NPCSIDE2: GUILabel;
  declare LBL_PLRSIDE1: GUILabel;
  declare LBL_PLRSIDE3: GUILabel;
  declare LBL_NPCSIDE1: GUILabel;
  declare LBL_NPCSIDE3: GUILabel;
  declare LBL_PLRNAME: GUILabel;
  declare LBL_NPCNAME: GUILabel;
  declare LBL_PLRTOTAL: GUILabel;
  declare LBL_NPCTOTAL: GUILabel;
  declare LBL_PLRSCORE0: GUILabel;
  declare LBL_PLRSCORE1: GUILabel;
  declare LBL_PLRSCORE2: GUILabel;
  declare LBL_NPCSCORE2: GUILabel;
  declare LBL_NPCSCORE1: GUILabel;
  declare LBL_NPCSCORE0: GUILabel;
  declare LBL_PLRTURN: GUILabel;
  declare LBL_NPCTURN: GUILabel;
  declare BTN_XTEXT: GUIButton;
  declare BTN_YTEXT: GUIButton;
  declare BTN_FLIP0: GUIButton;
  declare BTN_CHANGE0: GUIButton;
  declare BTN_CHANGE1: GUIButton;
  declare BTN_CHANGE2: GUIButton;
  declare BTN_CHANGE3: GUIButton;
  declare LBL_FLIPLEGEND: GUILabel;
  declare LBL_CHANGELEGEND: GUILabel;
  declare LBL_FLIPICON: GUILabel;
  declare LBL_CHANGEICON: GUILabel;
  declare BTN_FLIP1: GUIButton;
  declare BTN_FLIP2: GUIButton;
  declare BTN_FLIP3: GUIButton;
  declare BTN_FORFEITGAME: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pazaakgame_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  hide(): void {
    super.hide();
  }
  
}
