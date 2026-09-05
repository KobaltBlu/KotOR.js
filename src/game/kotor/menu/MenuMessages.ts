import { GameState } from "@/GameState";
import { GUIMessageItem } from "@/game/kotor/gui/GUIMessageItem";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";

/** Retail TLK 0x61b — "Journal" title prefix. */
const TLK_JOURNAL = 0x61b;
/** Retail TLK 0x173 — Dialog mode suffix. */
const TLK_DIALOG = 0x173;
/** Retail TLK 0xa4b7 — Feedback mode suffix. */
const TLK_FEEDBACK = 0xa4b7;
/** Retail BTN_SHOW Show Dialog (0xa49e). */
const TLK_SHOW_DIALOG = 0xa49e;
/** Retail BTN_SHOW Show Feedback (0xa49f). */
const TLK_SHOW_FEEDBACK = 0xa49f;

/**
 * MenuMessages class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuMessages.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuMessages extends GameMenu {

  LB_MESSAGES: GUIListBox;
  LBL_MESSAGES: GUILabel;
  BTN_EXIT: GUIButton;
  LB_DIALOG: GUIListBox;
  BTN_SHOW: GUIButton;

  mode: number = 0;

  /**
   * Retail HandleInputEvent
   * key sequence)/') → "Punch it, Chewie!" + hsMode=1.
   */
  static readonly HS_MODE_CHEAT_KEYS = [')', '/', "'", ')'] as const;
  hsModeCheatIdx = 0;

  constructor(){
    super();
    this.gui_resref = 'messages';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    // Retail LabelHilight rows — run for K1 and TSL (TSL passes skipInit=true).
    if(this.LB_DIALOG && this.LB_MESSAGES){
      this.LB_DIALOG.setProtoBuilder(GUIMessageItem);
      this.LB_MESSAGES.setProtoBuilder(GUIMessageItem);
      this.LB_DIALOG.bitFlags.clipPartiallyVisibleItems = true;
      this.LB_MESSAGES.bitFlags.clipPartiallyVisibleItems = true;
      this.LB_DIALOG.setVariableItemHeight(true);
      this.LB_MESSAGES.setVariableItemHeight(true);
      // Messages lists hover-select like retail list ctor (not inventory click-select).
      this.LB_DIALOG.protoClickSelects = false;
      this.LB_MESSAGES.protoClickSelects = false;
    }
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;
      this.BTN_SHOW.addEventListener('click', (e) => {
        if(this.mode == 0){
          this.mode = 1;
        }else{
          this.mode = 0;
        }
        this.updateListVisibility();
      });

      this.addEventListener('keydown', (e: KeyboardEvent) => {
        this.handleHsModeCheatKey(e);
      });

      resolve();
    });
  }

  /**
   * Retail HandleInputEvent sequence)/') decrypts "Pvpfh!kw,!Ekexkh!" →
   * "Punch it, Chewie!", AppendToMsgBuffer type 0x80, hsMode=1.
   */
  handleHsModeCheatKey(e: KeyboardEvent){
    const key = e.key;
    const seq = MenuMessages.HS_MODE_CHEAT_KEYS;
    if(key !== seq[this.hsModeCheatIdx]){
      this.hsModeCheatIdx = 0;
      if(key !== seq[0]) return;
    }
    this.hsModeCheatIdx++;
    if(this.hsModeCheatIdx < seq.length) return;

    this.hsModeCheatIdx = 0;
    // Encrypted retail bytes: each char -= (i & 3)
    const encrypted = 'Pvpfh!kw,!Ekexkh!';
    let decoded = '';
    for(let i = 0; i < 0x11; i++){
      decoded += String.fromCharCode(encrypted.charCodeAt(i) - (i & 3));
    }
    GameState.FeedbackMessageManager.AddMessage(
      decoded,
      FeebackMessageColor.INFO,
      0x80,
      { bypassStatusSummary: true }
    );
    GameState.cameraHsMode = 1;
    this.show();
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_MSG.onHoverIn();

    // Retail buffer order: chronological oldest→newest; select last (newest).
    const dlg_entries = GameState.DialogMessageManager.Entries.slice(0);
    this.LB_DIALOG.setItems(dlg_entries);
    if(dlg_entries.length > 0){
      this.LB_DIALOG.setSelectedControl(dlg_entries.length - 1, false);
    }

    const fb_entries = GameState.FeedbackMessageManager.Entries.slice(0);
    this.LB_MESSAGES.setItems(fb_entries);
    if(fb_entries.length > 0){
      this.LB_MESSAGES.setSelectedControl(fb_entries.length - 1, false);
    }

    this.updateListVisibility();
  }

  updateListVisibility(){
    this.LB_MESSAGES.hide();
    this.LB_DIALOG.hide();
    if(this.mode == 0){
      this.LB_DIALOG.show();
      this.BTN_SHOW.setText(GameState.TLKManager.GetStringById(TLK_SHOW_DIALOG).Value);
      this.setMessagesTitle(TLK_DIALOG);
    }else{
      this.LB_MESSAGES.show();
      this.BTN_SHOW.setText(GameState.TLKManager.GetStringById(TLK_SHOW_FEEDBACK).Value);
      this.setMessagesTitle(TLK_FEEDBACK);
    }
  }

  /**
   * Retail ShowDialogMessages / ShowFeedbackMessages —
   * LBL_MESSAGES = TLK(0x61b) + " - " + TLK(dialog|feedback).
   */
  private setMessagesTitle(suffixStrRef: number){
    const journal = GameState.TLKManager.GetStringById(TLK_JOURNAL)?.Value || '';
    const suffix = GameState.TLKManager.GetStringById(suffixStrRef)?.Value || '';
    this.LBL_MESSAGES.setText(`${journal} - ${suffix}`);
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_ABI.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_JOU.click();
  }
  
}
