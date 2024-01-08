import { GameMenu } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";

/**
 * MenuPazaakGame class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPazaakGame.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPazaakGame extends GameMenu {

  LBL_NPCSIDEDECK: GUILabel;
  LBL_PLRSIDEDECK: GUILabel;
  BTN_NPC0: GUIButton;
  BTN_NPC3: GUIButton;
  BTN_NPC6: GUIButton;
  BTN_PLR0: GUIButton;
  BTN_PLR3: GUIButton;
  BTN_PLR6: GUIButton;
  BTN_PLR7: GUIButton;
  BTN_PLR4: GUIButton;
  BTN_PLR1: GUIButton;
  BTN_NPC7: GUIButton;
  BTN_NPC4: GUIButton;
  BTN_NPC1: GUIButton;
  BTN_PLR5: GUIButton;
  BTN_PLR2: GUIButton;
  BTN_PLR8: GUIButton;
  BTN_NPC8: GUIButton;
  BTN_NPC5: GUIButton;
  BTN_NPC2: GUIButton;
  BTN_NPCSIDE2: GUIButton;
  BTN_NPCSIDE0: GUIButton;
  BTN_PLRSIDE2: GUIButton;
  BTN_PLRSIDE0: GUIButton;
  BTN_NPCSIDE3: GUIButton;
  BTN_NPCSIDE1: GUIButton;
  BTN_PLRSIDE3: GUIButton;
  BTN_PLRSIDE1: GUIButton;
  LBL_NPC0: GUILabel;
  LBL_NPC3: GUILabel;
  LBL_NPC6: GUILabel;
  LBL_PLR0: GUILabel;
  LBL_PLR3: GUILabel;
  LBL_PLR6: GUILabel;
  LBL_NPC1: GUILabel;
  LBL_NPC4: GUILabel;
  LBL_NPC7: GUILabel;
  LBL_PLR1: GUILabel;
  LBL_PLR4: GUILabel;
  LBL_PLR7: GUILabel;
  LBL_NPC2: GUILabel;
  LBL_NPC8: GUILabel;
  LBL_NPC5: GUILabel;
  LBL_PLR2: GUILabel;
  LBL_PLR5: GUILabel;
  LBL_PLR8: GUILabel;
  LBL_PLRSIDE0: GUILabel;
  LBL_PLRSIDE2: GUILabel;
  LBL_NPCSIDE0: GUILabel;
  LBL_NPCSIDE2: GUILabel;
  LBL_PLRSIDE1: GUILabel;
  LBL_PLRSIDE3: GUILabel;
  LBL_NPCSIDE1: GUILabel;
  LBL_NPCSIDE3: GUILabel;
  LBL_PLRNAME: GUILabel;
  LBL_NPCNAME: GUILabel;
  LBL_PLRTOTAL: GUILabel;
  LBL_NPCTOTAL: GUILabel;
  LBL_PLRSCORE0: GUILabel;
  LBL_PLRSCORE1: GUILabel;
  LBL_PLRSCORE2: GUILabel;
  LBL_NPCSCORE2: GUILabel;
  LBL_NPCSCORE1: GUILabel;
  LBL_NPCSCORE0: GUILabel;
  LBL_PLRTURN: GUILabel;
  LBL_NPCTURN: GUILabel;
  BTN_XTEXT: GUIButton;
  BTN_YTEXT: GUIButton;
  BTN_FLIP0: GUIButton;
  LBL_FLIPLEGEND: GUILabel;
  LBL_FLIPICON: GUILabel;
  BTN_FLIP1: GUIButton;
  BTN_FLIP2: GUIButton;
  BTN_FLIP3: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pazaakgame';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
}
  
}
