import { UIIconTimerType } from "../enums/engine/UIIconTimerType";

const UI_TIMER_DURATION = 10;

/**
 * UINotificationManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file UINotificationManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class UINotificationManager {
  static notifications: any[] = [];

  static ItemLostTimer: number = 0;
  static ItemReceivedTimer: number = 0;
  static PlotXPReceivedTimer: number = 0;
  static CreditsReceivedTimer: number = 0;
  static StealthXPReceivedTimer: number = 0;
  static JournalEntryAddedTimer: number = 0;
  static LightShiftTimer: number = 0;
  static DarkShiftTimer: number = 0;

  static EnableUINotificationIconType(type: UIIconTimerType) {
    switch(type) {
      case UIIconTimerType.ITEM_LOST:
        this.ItemLostTimer = UI_TIMER_DURATION;
        break;
      case UIIconTimerType.ITEM_RECEIVED:
        this.ItemReceivedTimer = UI_TIMER_DURATION;
        break;
      case UIIconTimerType.CREDITS_RECEIVED:
        this.CreditsReceivedTimer = UI_TIMER_DURATION;
        break;  
      case UIIconTimerType.JOURNAL_ENTRY_ADDED:
        this.JournalEntryAddedTimer = UI_TIMER_DURATION;
        break;
      case UIIconTimerType.LIGHT_SHIFT:
        this.LightShiftTimer = UI_TIMER_DURATION;
        break;  
      case UIIconTimerType.DARK_SHIFT:
        this.DarkShiftTimer = UI_TIMER_DURATION;
        break;
      case UIIconTimerType.PLOT_XP_RECEIVED:
        this.PlotXPReceivedTimer = UI_TIMER_DURATION;
        break;  
      case UIIconTimerType.STEALTH_XP_RECEIVED:
        this.StealthXPReceivedTimer = UI_TIMER_DURATION;
        break;
    }
  }
  
}
