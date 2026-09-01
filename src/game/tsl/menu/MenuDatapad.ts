import { GameMenu } from "@/gui";
import type { GUIListBox, GUIButton } from "@/gui";
import type { ModuleItem } from "@/module/ModuleItem";

/** Retail SetLocalBoolean index on DisplayDatapad (ExecuteCommandDisplayDatapad). */
export const DATAPAD_SHOWN_LOCAL_BOOL = 0x5e;

/**
 * MenuDatapad — TSL datapad popup (`datapad_p`).
 *
 * Retail: GUI datapad mode ; opened by
 * ExecuteCommandDisplayDatapad (InGameGui panel).
 * Cancel is hidden (SetAllowCancel(0)); OK dismisses. Text = DescIdentified.
 *
 * @file MenuDatapad.ts
 */
export class MenuDatapad extends GameMenu {

  declare LB_MESSAGE: GUIListBox;
  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;

  currentItem: ModuleItem | undefined;

  constructor(){
    super();
    this.gui_resref = 'datapad_p';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BTN_OK?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_a = this.BTN_OK;

      // Retail SetAllowCancel(0) — cancel control exists in layout but stays hidden
      this.BTN_CANCEL?.hide();
      this.BTN_CANCEL?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      resolve();
    });
  }

  /**
   * Open datapad for an item. Sets local bool 0x5E and shows DescIdentified.
   */
  openDatapad(item: ModuleItem){
    if(!item) return;
    this.currentItem = item;
    item.setLocalBoolean(DATAPAD_SHOWN_LOCAL_BOOL, true);

    const text = this.resolveDatapadText(item);
    this.showDatapad(text);
  }

  /** Populate LB_MESSAGE and show the panel. */
  showDatapad(message: string){
    if(this.LB_MESSAGE){
      this.LB_MESSAGE.setItem(message || '');
      this.LB_MESSAGE.updateList?.();
    }
    this.BTN_CANCEL?.hide();
    this.BTN_OK?.show();
    this.open();
  }

  resolveDatapadText(item: ModuleItem): string {
    const desc = item.getDescription?.();
    if(typeof desc === 'string') return desc;
    if(desc && typeof (desc as any).getValue === 'function'){
      return String((desc as any).getValue() || '');
    }
    return String(desc || '');
  }

  close(){
    this.currentItem = undefined;
    super.close();
  }
}
