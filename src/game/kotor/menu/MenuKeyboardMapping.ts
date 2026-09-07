import { GameState } from "@/GameState";
import { KeyCodeToLanguage0, KeyMapper } from "@/controls/KeyMapper";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { GUIKeyMapItem } from "@/game/kotor/gui/GUIKeyMapItem";
import { TwoDAManager } from "@/managers/TwoDAManager";

/** colorYellow — active filter tab. */
const FILTER_YELLOW = { r: 0.980392, g: 1, b: 0 };
/** colorStandardBlue — inactive filter tab. */
const FILTER_BLUE = { r: 0, g: 0.658824, b: 0.980392 };

/**
 * MenuKeyboardMapping class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * (OPTKeyMapping).
 *
 * @file MenuKeyboardMapping.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuKeyboardMapping extends GameMenu {

  LST_EventList: GUIListBox;
  BTN_Default: GUIButton;
  BTN_Accept: GUIButton;
  BTN_Cancel: GUIButton;
  LBL_Title: GUILabel;
  BTN_Filter_Move: GUIButton;
  BTN_Filter_Game: GUIButton;
  BTN_Filter_Mini: GUIButton;

  /** filter_category: 0 Movement, 1 Game, 2 Minigame. */
  page = 0;
  capturing = false;
  captureItem: GUIKeyMapItem | undefined;

  constructor(){
    super();
    this.gui_resref = 'optkeymapping';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.BTN_Cancel.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancelAndClose();
      });
      this._button_b = this.BTN_Cancel;

      this.BTN_Accept.addEventListener('click', (e) => {
        e.stopPropagation();
        this.acceptAndClose();
      });

      this.BTN_Default.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetToDefaults();
      });

      this.BTN_Filter_Move.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFilterPage(0);
      });

      this.BTN_Filter_Game.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFilterPage(1);
      });

      this.BTN_Filter_Mini.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFilterPage(2);
      });

      this.LST_EventList.setProtoBuilder(GUIKeyMapItem);
      this.LST_EventList.border.inneroffset = 5;
      this.LST_EventList.border.inneroffsety = 5;

      this.addEventListener('keyup', (e: KeyboardEvent) => {
        this.onCaptureKeyUp(e);
      });

      resolve();
    });
  }

  show(): void {
    super.show();
    for(const action of KeyMapper.ACTIONS_ALL){
      action.beginEditSession();
    }
    this.page = 0;
    this.clearCapture();
    this.updateList();
    this.applyFilterColors();
  }

  setFilterPage(page: number){
    this.clearCapture();
    this.page = page;
    this.applyFilterColors();
    this.updateList();
  }

  applyFilterColors(){
    const set = (btn: GUIButton, active: boolean) => {
      if(!btn?.setTextColor) return;
      const c = active ? FILTER_YELLOW : FILTER_BLUE;
      btn.setTextColor(c.r, c.g, c.b);
      if(btn.defaultColor){
        btn.defaultColor.setRGB(c.r, c.g, c.b);
      }
    };
    set(this.BTN_Filter_Move, this.page === 0);
    set(this.BTN_Filter_Game, this.page === 1);
    set(this.BTN_Filter_Mini, this.page === 2);
  }

  updateList(){
    this.clearCapture();
    this.LST_EventList.clearSelection();
    const actions = KeyMapper.ACTIONS_ALL
      .filter((action) => action.page === this.page && action.isKeyMapperVisible() && action.sortpos >= 0)
      .sort((a, b) => a.sortpos - b.sortpos);
    this.LST_EventList.setItems(actions);
  }

  setCaptureItem(item: GUIKeyMapItem | undefined){
    if(this.captureItem && this.captureItem !== item){
      this.captureItem.setCapturing(false);
    }
    this.captureItem = item;
    this.capturing = !!item;
    if(item){
      item.setCapturing(true);
    }
  }

  clearCapture(){
    if(this.captureItem){
      this.captureItem.setCapturing(false);
    }
    this.captureItem = undefined;
    this.capturing = false;
    this.LST_EventList?.clearSelection();
  }

  onCaptureKeyUp(e: KeyboardEvent){
    if(!this.capturing || !this.captureItem) return;

    if(e.code === 'Escape'){
      this.clearCapture();
      GameState.guiAudioEmitter?.playSoundFireAndForget('gui_click');
      return;
    }

    const lang0 = (KeyCodeToLanguage0 as any)[e.code];
    if(typeof lang0 !== 'number'){
      // return 2 — not bindable; keep capturing.
      return;
    }

    if(!this.isKeyBindable(lang0)){
      return;
    }

    const key = this.processKeyName(e.key);
    this.assignKey(this.captureItem, lang0, key);
    this.clearCapture();
    GameState.guiAudioEmitter?.playSoundFireAndForget('gui_click');
  }

  /**
   * UpdateEvent bindablekeys check: row KEY{language0-6}, Bindable != 0.
   * If the table is missing, allow any KeyCodeToLanguage0 mapping.
   */
  isKeyBindable(language0: number): boolean {
    const table = TwoDAManager.datatables.get('bindablekeys');
    if(!table) return true;
    const rowLabel = `KEY${language0 - 6}`;
    const row = table.getByID(rowLabel as any) || table.getByID(rowLabel.toLowerCase() as any)
      || table.getByID((language0 - 6) as any);
    if(!row) return false;
    const bindable = row.Bindable ?? row.bindable;
    if(bindable === undefined || bindable === '****') return false;
    return !!parseInt(bindable);
  }

  /**
   * IsKeyUsedAlready + UpdateEvent: assign key, clear conflicts that share category flags.
   */
  assignKey(item: GUIKeyMapItem, language0: number, character: string){
    const target = item.node;
    const flags = target.getCategoryFlags();

    for(const action of KeyMapper.ACTIONS_ALL){
      if(action === target) continue;
      if(!action.isKeyMapperVisible()) continue;
      if((action.getCategoryFlags() & flags) === 0) continue;
      if(action.editLanguage0 === language0){
        action.editLanguage0 = 0;
        action.editCharacter = '';
        action.editDirty = action.editLanguage0 !== action.language0;
      }
    }

    target.editLanguage0 = language0;
    target.editCharacter = character;
    target.editDirty = target.editLanguage0 !== target.language0;

    for(const child of this.LST_EventList.children){
      const row = child as GUIKeyMapItem;
      if(row?.refreshKeyDisplay){
        row.refreshKeyDisplay();
      }
    }
  }

  /** OnDefaultClick / ResetToDefault — Language0 from keymap.2da. */
  resetToDefaults(){
    this.clearCapture();
    for(const action of KeyMapper.ACTIONS_ALL){
      if(!action.remappable) continue;
      action.editLanguage0 = action.defaultLanguage0;
      action.editCharacter = action.defaultCharacter;
      action.editDirty = action.editLanguage0 !== action.language0;
    }
    this.updateList();
  }

  /** OnAcceptClick / PostChangeToEvent — write INI Keymapping + apply bindings. */
  acceptAndClose(){
    this.clearCapture();
    for(const action of KeyMapper.ACTIONS_ALL){
      if(!action.remappable || !action.editDirty) continue;
      action.language0 = action.editLanguage0;
      action.character = action.editCharacter;
      action.editDirty = false;
      if(action.label){
        GameState.iniConfig.setProperty(`Keymapping.${action.label}`, action.language0);
      }
    }
    KeyMapper.BindKeyboard(GameState.controls.keyboard, GameState.iniConfig);
    void GameState.iniConfig.save();
    GameState.guiAudioEmitter?.playSoundFireAndForget('gui_click');
    this.close();
  }

  cancelAndClose(){
    this.clearCapture();
    for(const action of KeyMapper.ACTIONS_ALL){
      action.beginEditSession();
    }
    this.close();
  }

  processKeyName(key: string){
    const words = key.split(' ');
    for(let i = 0; i < words.length; i++){
      if(!words[i].length) continue;
      words[i] = words[i][0].toUpperCase() + words[i].substr(1);
    }
    return words.join(' ');
  }

}
