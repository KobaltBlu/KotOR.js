/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { CharGenName as K1_CharGenName, GUILabel, GUIButton } from "../../../gui";

/* @file
* The CharGenName menu class.
*/

export class CharGenName extends K1_CharGenName {

  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare NAME_BOX_EDIT: GUILabel;
  declare END_BTN: GUIButton;
  declare BTN_RANDOM: GUIButton;
  declare BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'name_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      this.NAME_BOX_EDIT.addEventListener('click', (e: any) => {
        e.stopPropagation();

      });

      this.NAME_BOX_EDIT.onKeyDown = (e: any) => {
        //e.stopPropagation();
        console.log(e);

        switch(e.which){
          case 8: //Backspace
            this.NAME_BOX_EDIT.setText(this.NAME_BOX_EDIT.text.text.slice(0, -1));
          break;
          case 32: //Spacebar
          this.NAME_BOX_EDIT.setText(
            this.NAME_BOX_EDIT.text.text + ' '
          );
          break;
          default:
            if(e.which >= 48 && e.which <= 90){
              if(e.shiftKey){
                this.NAME_BOX_EDIT.setText(
                  this.NAME_BOX_EDIT.text.text + String.fromCharCode(e.which).toLocaleUpperCase()
                );
              }else{
                this.NAME_BOX_EDIT.setText(
                  this.NAME_BOX_EDIT.text.text + String.fromCharCode(e.which)
                );
              }
            }
          break;
        }

      }

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });

      this.END_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        GameState.player.firstName = this.NAME_BOX_EDIT.text.text;
        this.Close();
      });
      resolve();
    });
  }

  Show() {
    super.Show();
    this.NAME_BOX_EDIT.setText(GameState.player.firstName);
  }
  
}
