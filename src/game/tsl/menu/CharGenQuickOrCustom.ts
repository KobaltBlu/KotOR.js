/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUIButton, GUIListBox, MenuManager } from "../../../gui";
import { CharGenManager } from "../../../managers/CharGenManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { TalentFeat } from "../../../talents";
import { CharGenQuickOrCustom as K1_CharGenQuickOrCustom } from "../../kotor/KOTOR";

/* @file
* The CharGenQuickOrCustom menu class.
*/

export class CharGenQuickOrCustom extends K1_CharGenQuickOrCustom {

  declare BTN_BACK: GUIButton;
  declare LB_DESC: GUIListBox;
  declare QUICK_CHAR_BTN: GUIButton;
  declare CUST_CHAR_BTN: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'qorcpnl_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      this.QUICK_CHAR_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        try{
          let class_data = TwoDAManager.datatables.get('classes')?.rows[CharGenManager.selectedClass];
          let saving_throw_data = TwoDAManager.datatables.get(class_data['savingthrowtable'].toLowerCase())?.rows[0];
          let feats_table = TwoDAManager.datatables.get('feat');

          GameState.player.str = parseInt(class_data.str);
          GameState.player.dex = parseInt(class_data.dex);
          GameState.player.con = parseInt(class_data.con);
          GameState.player.wis = parseInt(class_data.wis);
          GameState.player.int = parseInt(class_data.int);
          GameState.player.cha = parseInt(class_data.cha);
          GameState.player.str = parseInt(class_data.str);

          GameState.player.fortbonus = parseInt(saving_throw_data.fortsave);
          GameState.player.willbonus = parseInt(saving_throw_data.willsave);
          GameState.player.refbonus = parseInt(saving_throw_data.refsave);

          let featstable_key = class_data['featstable'].toLowerCase();

          for(let i = 0, len = feats_table?.rows.length; i < len; i++){
            let feat_data = feats_table?.rows[i];
            if(feat_data[featstable_key+'_granted'] == 1){
              GameState.player.feats.push(new TalentFeat(i));
            }
          }
          console.log('boo');
          //GameState.CharGenMain.state = CharGenMain.STATES.QUICK;
          //GameState.CharGenQuickPanel.Show();
          MenuManager.CharGenMain.Close();
          MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickPanel;
          MenuManager.CharGenMain.Open();
        }catch(e){
          console.log(e);
        }
      });

      this.CUST_CHAR_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //GameState.CharGenMain.state = CharGenMain.STATES.CUSTOM;
        //GameState.CharGenCustomPanel.Show();
        MenuManager.CharGenMain.Close();
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenCustomPanel;
        MenuManager.CharGenMain.Open();
      });

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //GameState.CharGenMain.Hide();

        try{
          GameState.player.model.parent.remove(GameState.player.model);
        }catch(e){}

        (MenuManager.CharGenClass as any)['_3D_MODEL'+(CharGenManager.selectedClass+1)]._3dView.scene.add(GameState.player.model);

        MenuManager.CharGenMain.Close();
      });

      //Hide because this submenu is very incomplete.
      //Comment out this line to work on the custom chargen screen
      this.CUST_CHAR_BTN.hide();

      this.RecalculatePosition();
      resolve();
    });
  }
  
}
