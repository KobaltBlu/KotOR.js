import type { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { MenuMessages as K1_MenuMessages } from "../../kotor/KOTOR";

enum MessageType {
  DIALOG = 1,
  FEEDBACK = 2,
  COMBAT = 3,
  EFFECTS = 4
}

/**
 * MenuMessages class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuMessages.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuMessages extends K1_MenuMessages {

  declare LBL_BAR6: GUILabel;
  declare LB_MESSAGES: GUIListBox;
  declare LBL_MESSAGES: GUILabel;
  declare LB_DIALOG: GUIListBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare BTN_DIALOG: GUIButton;
  declare BTN_FEEDBACK: GUIButton;
  declare LBL_FILTER: GUILabel;
  declare BTN_EXIT: GUIButton;
  declare BTN_COMBAT: GUIButton;
  declare BTN_EFFECTS: GUIButton;
  declare LB_COMBAT: GUIListBox;
  declare LB_EFFECTS_GOOD: GUIListBox;
  declare LB_EFFECTS_BAD: GUIListBox;
  declare LBL_EFFECTS_GOOD: GUILabel;
  declare LBL_EFFECTS_BAD: GUILabel;

  messageType: MessageType = MessageType.DIALOG;

  constructor(){
    super();
    this.gui_resref = 'messages_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_DIALOG.addEventListener('click', (e) => {
        e.stopPropagation();
        this.messageType = MessageType.DIALOG;
        this.updateListVisibility();
      });

      this.BTN_FEEDBACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.messageType = MessageType.FEEDBACK;
        this.updateListVisibility();
      });

      this.BTN_COMBAT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.messageType = MessageType.COMBAT;
        this.updateListVisibility();
      });

      this.BTN_EFFECTS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.messageType = MessageType.EFFECTS;
        this.updateListVisibility();
      });

      resolve();
    });
  }

  updateListVisibility(){
    this.LBL_EFFECTS_BAD.hide();
    this.LB_EFFECTS_BAD.hide();
    this.LBL_EFFECTS_GOOD.hide();
    this.LB_EFFECTS_GOOD.hide();
    this.LB_COMBAT.hide();
    this.LB_DIALOG.hide();
    this.LB_MESSAGES.hide();

    switch(this.messageType){
      case MessageType.DIALOG:
        this.LB_DIALOG.show();
      break;
      case MessageType.FEEDBACK:
        this.LB_MESSAGES.show();
      break;
      case MessageType.COMBAT:
        this.LB_COMBAT.show();
      break;
      default:
        this.LBL_EFFECTS_BAD.show();
        this.LB_EFFECTS_BAD.show();
        this.LBL_EFFECTS_GOOD.show();
        this.LB_EFFECTS_GOOD.show();
      break;
    }


  }
  
}
