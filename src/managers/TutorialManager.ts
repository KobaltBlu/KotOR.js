import { FeedbackOption } from "@/enums/engine/FeedbackOption";
import { GameState } from "@/GameState";

export { shouldShowTutorialWindow } from "@/managers/tutorial-window-gate";
import { shouldShowTutorialWindow } from "@/managers/tutorial-window-gate";

/**
 * TutorialManager — global tutorial.2da / NWScript path.
 *
 * Opcodes: SetTutorialWindowsEnabled (516), ShowTutorialWindow (517),
 * Get/SetButtonMashCheck (267/268). Seen bits: GameState.TutorialWindowTracker
 * (partytable PT_TUT_WND_SHOWN).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file TutorialManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TutorialManager {

  /** Opcode 516 — scripts may disable popups mid-game (default on). */
  static windowsEnabled = true;

  /** Opcodes 267/268 — Endar Spire combat tutorial mash gate. */
  static buttonMashCheck = false;

  /** @deprecated unused shell; prefer hasSeen/markSeen + TutorialWindowTracker */
  static state: boolean[] = [];

  static reset(){
    this.windowsEnabled = true;
    this.buttonMashCheck = false;
  }

  /** Script enable AND Options Tutorial Popups (INI / Feedback). */
  static isPopupAllowed(): boolean {
    const popups = GameState.FeedbackMessageManager?.GetFeedbackTypeEnabled?.(
      FeedbackOption.TutorialPopups
    );
    // Default ON when FeedbackMessageManager not wired yet.
    const tutorialPopups = popups !== false;
    return shouldShowTutorialWindow(this.windowsEnabled, tutorialPopups, false);
  }

  static canShow(id: number): boolean {
    return this.isPopupAllowed() && !this.hasSeen(id);
  }

  static hasSeen(id: number): boolean {
    if(id < 0){ return true; }
    const tracker = GameState.TutorialWindowTracker;
    if(!tracker){ return false; }
    return !!tracker[id];
  }

  static markSeen(id: number){
    if(id < 0){ return; }
    if(!GameState.TutorialWindowTracker){
      GameState.TutorialWindowTracker = [];
    }
    GameState.TutorialWindowTracker[id] = 1;
  }

  /**
   * Retail ShowTutorialWindow — show tutorial.2da row `id` once if allowed.
   * @returns true if a dialog was opened
   */
  static showWindow(id: number): boolean {
    if(!this.isPopupAllowed() || this.hasSeen(id)){
      return false;
    }
    const confirm = GameState.MenuManager?.InGameConfirm;
    if(!confirm?.ShowTutorialMessage){
      return false;
    }
    return confirm.ShowTutorialMessage(id, 0) === true;
  }

}
