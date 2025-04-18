import { GameState } from "../../../GameState";
import type { GUIListBox, GUIButton } from "../../../gui";
import { TalentFeat } from "../../../talents";
import { CharGenQuickOrCustom as K1_CharGenQuickOrCustom } from "../../kotor/KOTOR";

/**
 * CharGenQuickOrCustom class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenQuickOrCustom.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.QUICK_CHAR_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        try{
          const creatureClass = GameState.SWRuleSet.classes[GameState.CharGenManager.selectedClass];
          const saving_throw_label = creatureClass['savingthrowtable'].toLowerCase();
          const saving_throw_data = GameState.TwoDAManager.datatables.get(saving_throw_label).rows[0];
          const feats_table = GameState.SWRuleSet.feats;

          GameState.CharGenManager.selectedCreature.str = creatureClass.str;
          GameState.CharGenManager.selectedCreature.dex = creatureClass.dex;
          GameState.CharGenManager.selectedCreature.con = creatureClass.con;
          GameState.CharGenManager.selectedCreature.wis = creatureClass.wis;
          GameState.CharGenManager.selectedCreature.int = creatureClass.int;
          GameState.CharGenManager.selectedCreature.cha = creatureClass.cha;
          GameState.CharGenManager.selectedCreature.str = creatureClass.str;

          GameState.CharGenManager.selectedCreature.fortbonus = parseInt(saving_throw_data.fortsave);
          GameState.CharGenManager.selectedCreature.willbonus = parseInt(saving_throw_data.willsave);
          GameState.CharGenManager.selectedCreature.refbonus = parseInt(saving_throw_data.refsave);

          for(let i = 0, len = feats_table.length; i < len; i++){
            const feat_data = feats_table[i];
            if(feat_data.getGranted(creatureClass) == 1){
              GameState.CharGenManager.selectedCreature.feats.push(new TalentFeat(i));
            }
          }
          this.manager.CharGenMain.close();
          this.manager.CharGenMain.childMenu = this.manager.CharGenQuickPanel;
          this.manager.CharGenMain.open();
        }catch(e){
          console.log(e);
        }
      });

      this.CUST_CHAR_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        //GameState.CharGenMain.state = CharGenMain.STATES.CUSTOM;
        //GameState.CharGenCustomPanel.Show();
        this.manager.CharGenMain.close();
        this.manager.CharGenMain.childMenu = this.manager.CharGenCustomPanel;
        this.manager.CharGenMain.open();

        //Reset the Attributes window
        this.manager.CharGenAbilities.reset();

        //Reset the Skills window
        this.manager.CharGenSkills.reset();
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        //Game.CharGenMain.Hide();

        try{
          GameState.CharGenManager.selectedCreature.model.parent.remove(GameState.CharGenManager.selectedCreature.model);
        }catch(e){}

        // this.manager.CharGenClass.getControlByName('_3D_MODEL'+(CharGenManager.selectedClass+1))
        //  .userData._3dView.scene.add(CharGenManager.selectedCreature.model);
        this.manager.CharGenMain.close();
      });

      //Hide because this submenu is very incomplete.
      //Comment out this line to work on the custom chargen screen
      this.CUST_CHAR_BTN.hide();

      // this.tGuiPanel.offset.x = -180;
      // this.tGuiPanel.offset.y = 100;
      this.recalculatePosition();
      resolve();
    });
  }
  
}
