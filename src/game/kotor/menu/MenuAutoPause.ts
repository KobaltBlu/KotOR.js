import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "@/gui";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import { GameEngineType } from "@/enums/engine/GameEngineType";

const END_ROUND_DESC = 42445;
const ENEMY_SIGHTED_DESC = 42446;
const PARTY_KILLED_DESC = 42447;

const AUTOPAUSE_OPTIONS: ReadonlyArray<{
  control: keyof MenuAutoPause;
  ini: string;
  type: AutoPauseState;
  k1Desc: number;
  tslDesc: number;
}> = [
  { control: 'CB_ENDROUND', ini: 'Autopause Options.End Of Combat Round', type: AutoPauseState.CombatRoundEnd, k1Desc: END_ROUND_DESC, tslDesc: END_ROUND_DESC },
  { control: 'CB_ENEMYSIGHTED', ini: 'Autopause Options.Enemy Sighted', type: AutoPauseState.EnemySighted, k1Desc: ENEMY_SIGHTED_DESC, tslDesc: ENEMY_SIGHTED_DESC },
  { control: 'CB_MINESIGHTED', ini: 'Autopause Options.Mine Sighted', type: AutoPauseState.MineSighted, k1Desc: 49117, tslDesc: 48704 },
  { control: 'CB_PARTYKILLED', ini: 'Autopause Options.Party Killed', type: AutoPauseState.PartyMemberKilled, k1Desc: PARTY_KILLED_DESC, tslDesc: PARTY_KILLED_DESC },
  { control: 'CB_ACTIONMENU', ini: 'Autopause Options.Action Menu', type: AutoPauseState.ActionMenuUsed, k1Desc: 48416, tslDesc: 48705 },
  { control: 'CB_TRIGGERS', ini: 'Autopause Options.New Target Selected', type: AutoPauseState.NewTargetSelected, k1Desc: 48214, tslDesc: 48706 },
];

/**
 * MenuAutoPause class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuAutoPause.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuAutoPause extends GameMenu {

  LBL_TITLE: GUILabel;
  CB_ENEMYSIGHTED: GUICheckBox;
  CB_PARTYKILLED: GUICheckBox;
  CB_ACTIONMENU: GUICheckBox;
  LB_DETAILS: GUIListBox;
  CB_ENDROUND: GUICheckBox;
  CB_TRIGGERS: GUICheckBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  CB_MINESIGHTED: GUICheckBox;

  constructor(){
    super();
    this.gui_resref = 'optautopause';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      const isTSL = GameState.GameKey == GameEngineType.TSL;
      for(const entry of AUTOPAUSE_OPTIONS){
        const checkbox = this[entry.control] as GUICheckBox;
        checkbox.attachINIProperty(entry.ini);
        checkbox.onValueChanged = () => {
          GameState.AutoPauseManager.SetAutoPauseTypeEnabled(
            entry.type,
            GameState.iniConfig.getProperty(entry.ini) == 1
          );
        };
        checkbox.addEventListener('hover', () => {
          this.setDescription(isTSL ? entry.tslDesc : entry.k1Desc);
        });
      }

      this.BTN_DEFAULT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetToDefaults();
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        void GameState.iniConfig.save();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      resolve();
    });
  }

  show(): void {
    super.show();
    this.setupOptions();
    this.setDescription(
      GameState.GameKey == GameEngineType.TSL
        ? AUTOPAUSE_OPTIONS[0].tslDesc
        : AUTOPAUSE_OPTIONS[0].k1Desc
    );
  }

  setupOptions(){
    for(const entry of AUTOPAUSE_OPTIONS){
      const checkbox = this[entry.control] as GUICheckBox;
      const enabled = GameState.iniConfig.getProperty(entry.ini) == 1;
      checkbox.setValue(enabled);
      GameState.AutoPauseManager.SetAutoPauseTypeEnabled(entry.type, enabled);
    }
  }

  resetToDefaults(){
    const defaults = GameState.GameKey == GameEngineType.TSL
      ? [false, true, false, true, false, true]
      : [false, true, true, true, false, true];
    for(let i = 0; i < AUTOPAUSE_OPTIONS.length; i++){
      const entry = AUTOPAUSE_OPTIONS[i];
      const checkbox = this[entry.control] as GUICheckBox;
      checkbox.setValue(defaults[i]);
      GameState.AutoPauseManager.SetAutoPauseTypeEnabled(entry.type, defaults[i]);
    }
  }

  setDescription(strRef: number){
    this.LB_DETAILS.setItem(GameState.TLKManager.GetStringById(strRef)?.Value || '');
  }

}
