import { GameState } from "../../../GameState";
import { FeedbackOption } from "../../../enums/engine/FeedbackOption";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "../../../gui";

const LBL_HIDE_UNEQ = 42279;
const LBL_TUT_POPUPS = 42280;
const LBL_SUBS = 42281;
const LBL_MAP = 42283;
const LBL_FNUMBERS = 42285;
const LBL_STATUS = 42450;
const LBL_HIDE_MENU = 48693;
const LBL_TOOLTIPS = 48696;


const DESC_HIDE_UNEQ = 42286;
const DESC_TUT_POPUPS = 42287;
const DESC_SUBS = 42288;
const DESC_MAP = 42289;
const DESC_FNUMBERS = 42291;
const DESC_STATUS = 42451;
const DESC_HIDE_MENU = 48700;
const DESC_TOOLTIPS = 48703;

/**
 * MenuFeedback class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
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

  constructor(){
    super();
    this.gui_resref = 'optfeedback';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve, reject) => {
      const CB_HIDE_UNEQ = this.LB_OPTIONS.addItem(GameState.TLKManager.GetStringById(LBL_HIDE_UNEQ).Value) as GUICheckBox;
      CB_HIDE_UNEQ.attachINIProperty('Game Options.Hide Unequippable');
      CB_HIDE_UNEQ.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Game Options.Hide Unequippable') == 1){
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.HideUnequippable, true);
        }else{
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.HideUnequippable, false);
        }
      };

      const CB_TUT_POPUPS = this.LB_OPTIONS.addItem(GameState.TLKManager.GetStringById(LBL_TUT_POPUPS).Value) as GUICheckBox;
      CB_TUT_POPUPS.attachINIProperty('Game Options.Tutorial Popups');
      CB_TUT_POPUPS.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Game Options.Tutorial Popups') == 1){
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.TutorialPopups, true);
        }else{
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.TutorialPopups, false);
        }
      };

      const CB_SUBS = this.LB_OPTIONS.addItem(GameState.TLKManager.GetStringById(LBL_SUBS).Value) as GUICheckBox;
      CB_SUBS.attachINIProperty('Game Options.Subtitles');
      CB_SUBS.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Game Options.Subtitles') == 1){
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.Subtitles, true);
        }else{
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.Subtitles, false);
        }
      };

      const CB_MAP = this.LB_OPTIONS.addItem(GameState.TLKManager.GetStringById(LBL_MAP).Value) as GUICheckBox;
      CB_MAP.attachINIProperty('Game Options.Mini Map');
      CB_MAP.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Game Options.Mini Map') == 1){
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.MiniMap, true);
        }else{
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.MiniMap, false);
        }
      };

      const CB_FNUMBERS = this.LB_OPTIONS.addItem(GameState.TLKManager.GetStringById(LBL_FNUMBERS).Value) as GUICheckBox;
      CB_FNUMBERS.attachINIProperty('Game Options.Floating Numbers');
      CB_FNUMBERS.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Game Options.Floating Numbers') == 1){
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.FloatingNumbers, true);
        }else{
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.FloatingNumbers, false);
        }
      };

      const CB_STATUS = this.LB_OPTIONS.addItem(GameState.TLKManager.GetStringById(LBL_STATUS).Value) as GUICheckBox;
      CB_STATUS.attachINIProperty('Game Options.Status Summary');
      CB_STATUS.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Game Options.Status Summary') == 1){
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.StatusSummary, true);
        }else{
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.StatusSummary, false);
        }
      };

      const CB_HIDE_MENU = this.LB_OPTIONS.addItem(GameState.TLKManager.GetStringById(LBL_HIDE_MENU).Value) as GUICheckBox;
      CB_HIDE_MENU.attachINIProperty('Game Options.Hide InGame GUI');
      CB_HIDE_MENU.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Game Options.Hide InGame GUI') == 1){
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.HideQuickMenuButtons, true);
        }else{
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.HideQuickMenuButtons, false);
        }
      };

      const CB_TOOLTIPS = this.LB_OPTIONS.addItem(GameState.TLKManager.GetStringById(LBL_TOOLTIPS).Value) as GUICheckBox;
      CB_TOOLTIPS.attachINIProperty('Game Options.Enable Tooltips');
      CB_TOOLTIPS.onValueChanged = () => {
        if(GameState.iniConfig.getProperty('Game Options.Enable Tooltips') == 1){
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.EnableToolTips, true);
        }else{
          GameState.FeedbackMessageManager.SetFeedbackTypeEnabled(FeedbackOption.EnableToolTips, false);
        }
      };

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.iniConfig.save();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_DEFAULT.addEventListener('click', (e) => {
        e.stopPropagation();
        CB_HIDE_UNEQ.setValue(false);
        CB_TUT_POPUPS.setValue(true);
        CB_SUBS.setValue(true);
        CB_MAP.setValue(true);
        CB_FNUMBERS.setValue(true);
        CB_STATUS.setValue(true);
        CB_HIDE_MENU.setValue(false);
        CB_TOOLTIPS.setValue(true);
        GameState.iniConfig.save();
      });
      
      resolve();
    });
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_MSG.onHoverIn();
  }
  
}
