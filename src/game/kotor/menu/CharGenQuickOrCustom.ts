/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIButton, GUIListBox, MenuManager } from "../../../gui";
import { CharGenManager } from "../../../managers/CharGenManager";
import { TwoDAManager } from "../../../managers/TwoDAManager";
import { TalentFeat } from "../../../talents";

/* @file
* The CharGenQuickOrCustom menu class.
*/

export class CharGenQuickOrCustom extends GameMenu {

  LBL_DECORATION: GUILabel;
  BTN_BACK: GUIButton;
  LBL_RBG: GUILabel;
  LB_DESC: GUIListBox;
  QUICK_CHAR_BTN: GUIButton;
  CUST_CHAR_BTN: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'qorcpnl';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.QUICK_CHAR_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        try{
          let class_data = TwoDAManager.datatables.get('classes').rows[CharGenManager.selectedClass];
          let saving_throw_label = class_data['savingthrowtable'].toLowerCase();
          let saving_throw_data = TwoDAManager.datatables.get(saving_throw_label).rows[0];
          let feats_table = TwoDAManager.datatables.get('feat');

          CharGenManager.selectedCreature.str = parseInt(class_data.str);
          CharGenManager.selectedCreature.dex = parseInt(class_data.dex);
          CharGenManager.selectedCreature.con = parseInt(class_data.con);
          CharGenManager.selectedCreature.wis = parseInt(class_data.wis);
          CharGenManager.selectedCreature.int = parseInt(class_data.int);
          CharGenManager.selectedCreature.cha = parseInt(class_data.cha);
          CharGenManager.selectedCreature.str = parseInt(class_data.str);

          CharGenManager.selectedCreature.fortbonus = parseInt(saving_throw_data.fortsave);
          CharGenManager.selectedCreature.willbonus = parseInt(saving_throw_data.willsave);
          CharGenManager.selectedCreature.refbonus = parseInt(saving_throw_data.refsave);

          let featstable_key = class_data['featstable'].toLowerCase();

          for(let i = 0, len = feats_table.rows.length; i < len; i++){
            let feat_data = feats_table.rows[i];
            if(feat_data[featstable_key+'_granted'] == 1){
              CharGenManager.selectedCreature.feats.push(new TalentFeat(i));
            }
          }
          MenuManager.CharGenMain.Close();
          MenuManager.CharGenMain.childMenu = MenuManager.CharGenQuickPanel;
          MenuManager.CharGenQuickPanel.tGuiPanel.widget.position.x = 142.5;
          MenuManager.CharGenQuickPanel.tGuiPanel.widget.position.y = 0;
          MenuManager.CharGenMain.Open();
        }catch(e){
          console.log(e);
        }
      });

      this.CUST_CHAR_BTN.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //Game.CharGenMain.state = CharGenMain.STATES.CUSTOM;
        //Game.CharGenCustomPanel.Show();
        MenuManager.CharGenMain.Close();
        MenuManager.CharGenMain.childMenu = MenuManager.CharGenCustomPanel;
        MenuManager.CharGenCustomPanel.tGuiPanel.widget.position.x = 142.5;
        MenuManager.CharGenCustomPanel.tGuiPanel.widget.position.y = 0;
        MenuManager.CharGenMain.Open();

        //Reset the Attributes window
        MenuManager.CharGenAbilities.reset();

        //Reset the Skills window
        MenuManager.CharGenSkills.reset();
      });

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //Game.CharGenMain.Hide();

        try{
          CharGenManager.selectedCreature.model.parent.remove(CharGenManager.selectedCreature.model);
        }catch(e){}

        // MenuManager.CharGenClass.getControlByName('_3D_MODEL'+(CharGenManager.selectedClass+1))
        //  .userData._3dView.scene.add(CharGenManager.selectedCreature.model);
        MenuManager.CharGenMain.Close();
      });

      //Hide because this submenu is very incomplete.
      //Comment out this line to work on the custom chargen screen
      this.CUST_CHAR_BTN.hide();

      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 100;
      this.RecalculatePosition();
      resolve();
    });
  }
  
}
