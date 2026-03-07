import { GameState } from "../../../GameState";
import { KeyInput } from "../../../controls/KeyInput";
import { KeyCodeToLanguage0, KeyMapper, Keymap, language0ToKeyCode } from "../../../controls/KeyMapper";
import type { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { MenuKeyboardMapping as K1_MenuKeyboardMapping } from "../../kotor/KOTOR";
import { GUIKeyMapItem } from "../gui/GUIKeyMapItem";

/**
 * MenuKeyboardMapping class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuKeyboardMapping.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuKeyboardMapping extends K1_MenuKeyboardMapping {

  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LST_EventList: GUIListBox;
  declare LBL_Title: GUILabel;
  declare BTN_Filter_Move: GUIButton;
  declare BTN_Filter_Game: GUIButton;
  declare BTN_Filter_Mini: GUIButton;
  declare LBL_BAR3: GUILabel;
  declare BTN_Cancel: GUIButton;
  declare BTN_Accept: GUIButton;
  declare BTN_Default: GUIButton;

  page = 0;
  selectedKey: Keymap;
  selectedKeyControl: GUIKeyMapItem;

  constructor(){
    super();
    this.gui_resref = 'optkeymapping_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_Cancel.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_Accept.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_Filter_Move.addEventListener('click', (e) => {
        e.stopPropagation();
        this.page = 0;
        this.updateList();
      });

      this.BTN_Filter_Game.addEventListener('click', (e) => {
        e.stopPropagation();
        this.page = 1;
        this.updateList();
      });

      this.BTN_Filter_Mini.addEventListener('click', (e) => {
        e.stopPropagation();
        this.page = 2;
        this.updateList();
      });

      this.LST_EventList.GUIProtoItemClass = GUIKeyMapItem;
      this.LST_EventList.border.inneroffset = 5;
      this.LST_EventList.border.inneroffsety = 5;
      this.LST_EventList.onSelected = (node: any, control: GUIKeyMapItem) => {
        this.selectedKey = node;
        this.selectedKeyControl = control;
      }

      this.addEventListener('keyup', (e: KeyboardEvent) => {
        if(this.selectedKey){
          const lang0 = (KeyCodeToLanguage0 as any)[e.code];
          if(typeof lang0 === 'number' && lang0 != this.selectedKey.language0){
            const key = this.processKeyName(e.key);
            this.selectedKey.character = key;
            this.selectedKey.language0 = lang0;
            this.selectedKeyControl.setKeyText(key);

            const action: KeyInput = (GameState.controls.keyboard.action as any)[language0ToKeyCode(lang0)];
            if(action){
              this.selectedKey.keyboardInput = action;
            }
          }
        }

        this.selectedKey = undefined;
        this.LST_EventList.clearSelection();
      });

      resolve();
    });
  }

  processKeyName(key: string){
    const words = key.split(' ');
    for (let i = 0; i < words.length; i++) {
      words[i] = words[i][0].toUpperCase() + words[i].substr(1);
    }
    return words.join(' ');
  }

  show(): void {
    super.show();
    this.page = 0;
    this.updateList();
  }

  updateList(){
    this.selectedKey = undefined;
    this.selectedKeyControl = undefined;
    this.LST_EventList.clearSelection();
    const actions = KeyMapper.ACTIONS_ALL.filter( action => action.page == this.page && action.sortpos >= 0 ).sort( (a, b) => {
      return a.sortpos - b.sortpos;
    });
    this.LST_EventList.clearItems();
    for(let i = 0; i < actions.length; i++){
      this.LST_EventList.addItem(actions[i]);
    }
  }
  
}
