import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { TalentFeat } from "@/talents";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

/**
 * CharGenQuickOrCustom class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenQuickOrCustom.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, _reject) => {
      this.QUICK_CHAR_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        try{
          const class_data = GameState.SWRuleSet.classes[GameState.CharGenManager.selectedClass];
          const saving_throw_label = class_data['savingthrowtable'].toLowerCase();
          const saving_throw_data = GameState.TwoDAManager.datatables.get(saving_throw_label).rows[0];
          const feats_table = GameState.SWRuleSet.feats;

          GameState.CharGenManager.selectedCreature.str = class_data.str;
          GameState.CharGenManager.selectedCreature.dex = class_data.dex;
          GameState.CharGenManager.selectedCreature.con = class_data.con;
          GameState.CharGenManager.selectedCreature.wis = class_data.wis;
          GameState.CharGenManager.selectedCreature.int = class_data.int;
          GameState.CharGenManager.selectedCreature.cha = class_data.cha;
          GameState.CharGenManager.selectedCreature.str = class_data.str;

          GameState.CharGenManager.selectedCreature.fortbonus = Number.parseInt(String(saving_throw_data.fortsave), 10);
          GameState.CharGenManager.selectedCreature.willbonus = Number.parseInt(String(saving_throw_data.willsave), 10);
          GameState.CharGenManager.selectedCreature.refbonus = Number.parseInt(String(saving_throw_data.refsave), 10);

          for(let i = 0, len = feats_table.length; i < len; i++){
            const feat_data = feats_table[i];
            if(feat_data.getGranted(class_data) == 1){
              GameState.CharGenManager.selectedCreature.feats.push(new TalentFeat(i));
            }
          }

          this.manager.CharGenMain.close();
          this.manager.CharGenMain.childMenu = this.manager.CharGenQuickPanel;
          this.manager.CharGenQuickPanel.tGuiPanel.widget.position.x = 142.5;
          this.manager.CharGenQuickPanel.tGuiPanel.widget.position.y = 0;
          this.manager.CharGenMain.open();
        }catch(e){
          log.info(String(e));
        }
      });

      this.CUST_CHAR_BTN.addEventListener('click', (e) => {
        e.stopPropagation();
        //Game.CharGenMain.state = CharGenMain.STATES.CUSTOM;
        //Game.CharGenCustomPanel.Show();
        this.manager.CharGenMain.close();
        this.manager.CharGenMain.childMenu = this.manager.CharGenCustomPanel;
        this.manager.CharGenCustomPanel.tGuiPanel.widget.position.x = 142.5;
        this.manager.CharGenCustomPanel.tGuiPanel.widget.position.y = 0;
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
        }catch {
          return;
        }

        // this.manager.CharGenClass.getControlByName('_3D_MODEL'+(GameState.CharGenManager.selectedClass+1))
        //  .userData._3dView.scene.add(GameState.CharGenManager.selectedCreature.model);
        this.manager.CharGenMain.close();
      });

      //Hide because this submenu is very incomplete.
      //Comment out this line to work on the custom chargen screen
      this.CUST_CHAR_BTN.hide();

      this.tGuiPanel.offset.x = -180;
      this.tGuiPanel.offset.y = 100;
      this.recalculatePosition();
      resolve();
    });
  }

}
