import { GameMenu } from "../../../gui";
import type { GUIListBox } from "../../../gui";
import { GameState } from "../../../GameState";

/** Scroll speed in list-box units per second. */
const CREDITS_SCROLL_SPEED = 30;
/** First TLK strRef that contains K1 credits text. */
const CREDITS_START_STRREF = 7650;
/** Last TLK strRef to scan for credits text. */
const CREDITS_END_STRREF = 7900;

/**
 * MenuCredits class.
 *
 * Displays the KotOR I end-of-game credits as a scrolling text list.
 * When the list is exhausted (or the player clicks) the sequence ends,
 * the `creditsSequenceInProgress` flag is cleared, and the main menu
 * is re-opened so the player can start a new game or quit.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuCredits.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuCredits extends GameMenu {

  declare LB_CREDITS: GUIListBox;

  /** Accumulated fractional scroll offset (in list-box units). */
  private scrollOffset: number = 0;

  constructor(){
    super();
    this.gui_resref = 'credits';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      // Allow a click anywhere on the credits to skip to the end
      this.tGuiPanel?.widget?.addEventListener('click', () => {
        this.endCredits();
      });
      resolve();
    });
  }

  open(){
    super.open();
    this.scrollOffset = 0;
    this.populateCredits();
  }

  /**
   * Populates the credits list-box with strings from the game's TLK file.
   * K1 stores credits text in strRef range 7650-7800 (approximate).
   * We add whatever non-empty strings are found in that range.
   */
  private populateCredits(){
    if(!this.LB_CREDITS) return;
    this.LB_CREDITS.clearItems();
    for(let strRef = CREDITS_START_STRREF; strRef <= CREDITS_END_STRREF; strRef++){
      const entry = GameState.TLKManager.GetStringById(strRef);
      if(entry?.Value){
        this.LB_CREDITS.addItem(entry.Value);
      }
    }
    if(this.LB_CREDITS.offset !== undefined){
      this.LB_CREDITS.offset = 0;
    }
  }

  update(delta: number = 0){
    super.update(delta);
    if(!this.LB_CREDITS) return;

    this.scrollOffset += CREDITS_SCROLL_SPEED * delta;
    const scrollStep = Math.floor(this.scrollOffset);
    if(scrollStep > 0){
      this.scrollOffset -= scrollStep;
      if(this.LB_CREDITS.offset !== undefined){
        const maxOffset = Math.max(0, (this.LB_CREDITS.items?.length ?? 0) - 1);
        this.LB_CREDITS.offset = Math.min(
          (this.LB_CREDITS.offset || 0) + scrollStep,
          maxOffset
        );
        if(this.LB_CREDITS.offset >= maxOffset){
          this.endCredits();
        }
      }
    }
  }

  /** End the credits sequence and return to the main menu. */
  private endCredits(){
    GameState.creditsSequenceInProgress = false;
    this.close();
    GameState.MenuManager.MainMenu?.Start();
  }

}
