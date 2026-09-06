import type { GUILabel, GUIListBox, GUIButton } from "@/gui";
import { FeedbackOption } from "@/enums/engine/FeedbackOption";
import { MenuFeedback as K1_MenuFeedback } from "@/game/kotor/KOTOR";

/**
 * Retail PopulateOptionsListbox strrefs / custom_value (TSL).
 * Eight rows — no Use Small Fonts (K1-only).
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
  { label: 0xbe35, desc: 0xbe3c, ini: 'Game Options.Hide InGame GUI', option: FeedbackOption.HideQuickMenuButtons, defaultOn: false },
  { label: 0xbe38, desc: 0xbe3f, ini: 'Game Options.Enable Tooltips', option: FeedbackOption.EnableToolTips, defaultOn: true },
];

/**
 * MenuFeedback class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuFeedback.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuFeedback extends K1_MenuFeedback {

  declare LBL_TITLE: GUILabel;
  declare LB_DESC: GUIListBox;
  declare LB_OPTIONS: GUIListBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optfeedback_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  protected getFeedbackOptions() {
    return FEEDBACK_OPTIONS;
  }

}
