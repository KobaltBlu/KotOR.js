import { GameState } from "@/GameState";
import { FeedbackOption } from "@/enums/engine/FeedbackOption";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "@/gui";

/**
 * Retail CSWGuiOptionsFeedback::PopulateOptionsListbox strrefs / custom_value.
 * Label TLK + description TLK + INI key + FeedbackOption + retail default.
 */
const FEEDBACK_OPTIONS: ReadonlyArray<{
  label: number;
  desc: number;
  ini: string;
  option: FeedbackOption;
  defaultOn: boolean;
}> = [
  { label: 0xa527, desc: 0xa52e, ini: 'Game Options.Hide Unequippable', option: FeedbackOption.HideUnequippable, defaultOn: false },
  { label: 0xa528, desc: 0xa52f, ini: 'Game Options.Tutorial Popups', option: FeedbackOption.TutorialPopups, defaultOn: true },
  { label: 0xa529, desc: 0xa530, ini: 'Game Options.Subtitles', option: FeedbackOption.Subtitles, defaultOn: true },
  { label: 0xa52b, desc: 0xa531, ini: 'Game Options.Mini Map', option: FeedbackOption.MiniMap, defaultOn: true },
  { label: 0xa52d, desc: 0xa533, ini: 'Game Options.Floating Numbers', option: FeedbackOption.FloatingNumbers, defaultOn: true },
  { label: 0xa5d2, desc: 0xa5d3, ini: 'Game Options.Status Summary', option: FeedbackOption.StatusSummary, defaultOn: true },
  { label: 0xbfa5, desc: 0xbfa9, ini: 'Game Options.Hide InGame GUI', option: FeedbackOption.HideQuickMenuButtons, defaultOn: false },
  { label: 0xbfa6, desc: 0xbfaa, ini: 'Game Options.Use Small Fonts', option: FeedbackOption.UseSmallFonts, defaultOn: false },
  { label: 0xbfdb, desc: 0xbfda, ini: 'Game Options.Enable Tooltips', option: FeedbackOption.EnableToolTips, defaultOn: true },
];

/**
 * MenuFeedback class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * Retail CSWGuiOptionsFeedback (optfeedback).
 *
 * @file MenuFeedback.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuFeedback extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  LB_OPTIONS: GUIListBox;

  private optionChecks: GUICheckBox[] = [];

  constructor(){
    super();
    this.gui_resref = 'optfeedback';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.populateOptionsListbox();

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        void GameState.iniConfig.save();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_DEFAULT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetToDefaults();
      });

      resolve();
    });
  }

  /**
   * Retail PopulateOptionsListbox — nine CSWGuiOptionsCheckbox rows.
   */
  populateOptionsListbox(){
    this.optionChecks = [];
    this.LB_OPTIONS.mutate((tx) => {
      tx.clear();
      for(const entry of FEEDBACK_OPTIONS){
        const label = GameState.TLKManager.GetStringById(entry.label)?.Value || '';
        const cb = tx.add(label) as GUICheckBox;
        cb.attachINIProperty(entry.ini);
        cb.onValueChanged = () => {
          const enabled = GameState.iniConfig.getProperty(entry.ini) == 1;
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(entry.option, enabled);
        };
        cb.addEventListener('hover', () => {
          this.setDescription(entry.desc);
        });
        this.optionChecks.push(cb);
      }
    });
  }

  show(): void {
    super.show();
    this.setupOptions();
    if(FEEDBACK_OPTIONS.length){
      this.setDescription(FEEDBACK_OPTIONS[0].desc);
    }
  }

  /** Retail SetUpOptions — sync checkbox state from INI / client options. */
  setupOptions(){
    for(let i = 0; i < FEEDBACK_OPTIONS.length; i++){
      const entry = FEEDBACK_OPTIONS[i];
      const cb = this.optionChecks[i];
      if(!cb) continue;
      const on = GameState.iniConfig.getProperty(entry.ini) == 1;
      cb.setValue(on);
      GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(entry.option, on);
    }
  }

  /** Retail OnDefault / SetDefaultFeedbackOptions (bit_flags_2 defaults). */
  resetToDefaults(){
    for(let i = 0; i < FEEDBACK_OPTIONS.length; i++){
      const entry = FEEDBACK_OPTIONS[i];
      const cb = this.optionChecks[i];
      if(!cb) continue;
      cb.setValue(entry.defaultOn);
      GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(entry.option, entry.defaultOn);
    }
  }

  setDescription(strRef: number){
    this.LB_DESC.setItem(GameState.TLKManager.GetStringById(strRef)?.Value || '');
  }

}
