import { MenuSaveLoadMode } from "../../../enums/gui/MenuSaveLoadMode";
import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import { GUISaveGameItem } from "../gui/GUISaveGameItem";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { TextureLoader } from "../../../loaders";
import { Module } from "../../../module";
import { OdysseyTexture } from "../../../three/odyssey/OdysseyTexture";
import { SaveGame } from "../../../SaveGame";

/**
 * MenuSaveLoad class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuSaveLoad.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSaveLoad extends GameMenu {

  LB_GAMES: GUIListBox;
  LBL_PANELNAME: GUILabel;
  LBL_SCREENSHOT: GUILabel;
  LBL_PLANETNAME: GUILabel;
  LBL_PM2: GUILabel;
  LBL_AREANAME: GUILabel;
  LBL_PM1: GUILabel;
  LBL_PM3: GUILabel;
  BTN_DELETE: GUIButton;
  BTN_BACK: GUIButton;
  BTN_SAVELOAD: GUIButton;

  mode: MenuSaveLoadMode;
  saves: SaveGame[] = [];
  selected: SaveGame;

  constructor(){
    super();
    this.gui_resref = 'saveload';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this._button_y = this.BTN_DELETE;

      this.BTN_SAVELOAD.setText('Load');
      this.BTN_SAVELOAD.addEventListener('click', (e) => {
        e.stopPropagation();
        const savegame = this.selected;
        if(this.mode == MenuSaveLoadMode.LOADGAME){
          if(savegame){
            this.manager.ClearMenus();
            if(GameState.module instanceof Module){
              GameState.module.dispose();
              GameState.module = undefined;
            }
            savegame.load();
          }
        }else{
          if(savegame instanceof NewSaveItem){
            this.manager.MenuSaveName.show();
            this.manager.MenuSaveName.onSave = ( name = '' ) => {
              console.log('SaveGame', name);
            };
          }else{

          }
        }
      });
      this._button_a = this.BTN_SAVELOAD;

      this.BTN_BACK = this.getControlByName('BTN_BACK');
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.LB_GAMES.GUIProtoItemClass = GUISaveGameItem;
      this.LB_GAMES.onSelected = (save: SaveGame) => {
        this.selected = save;
        this.UpdateSelected();
      }

      this.tGuiPanel.getFill().position.z = -1;
      resolve();
    });
  }

  show() {
    super.show();
    this.selectedControl = this.LB_GAMES;
    this.reloadSaves();
    if (this.mode == MenuSaveLoadMode.SAVEGAME) {
      this.BTN_SAVELOAD.setText(GameState.TLKManager.TLKStrings[1587].Value);
    }else{
      this.BTN_SAVELOAD.setText(GameState.TLKManager.TLKStrings[1589].Value);
    }
    TextureLoader.LoadQueue();
  }

  getSaveGames(): SaveGame[] {
    let saves: SaveGame[] = [];
    if (this.mode == MenuSaveLoadMode.SAVEGAME) {
      saves = SaveGame.saves.filter(save => {
        return !save.getIsQuickSave() && !save.getIsAutoSave();
      });
      saves.unshift(new NewSaveItem());
    }else{
      saves = SaveGame.saves;
    }
    return saves;
  }

  reloadSaves(){
    this.LB_GAMES.clearItems();
    let saves = this.getSaveGames();
    for (let i = 0; i < saves.length; i++) {
      let save = saves[i];
      this.LB_GAMES.addItem(save);
    }
    this.selected = saves[0];
    this.UpdateSelected();
    this.LB_GAMES.updateList();
  }

  UpdateSelected() {
    this.LBL_SCREENSHOT.setFillTexture(undefined);
    this.LBL_PM1.setFillTexture(undefined);
    this.LBL_PM2.setFillTexture(undefined);
    this.LBL_PM3.setFillTexture(undefined);
    this.LBL_PLANETNAME.setText('');
    this.LBL_AREANAME.setText('');
    if (this.selected instanceof SaveGame) {
      this.LB_GAMES.selectItem(this.selected);
      if (this.selected instanceof NewSaveItem) {

      }else{
        this.selected.getThumbnail().then((texture: OdysseyTexture) => {
          this.LBL_SCREENSHOT.setFillTexture(texture);
          (this.LBL_SCREENSHOT.getFill().material as THREE.ShaderMaterial).transparent = false;
        });
        this.selected.getPortrait(0).then((texture: OdysseyTexture) => {
          this.LBL_PM1.setFillTexture(texture);
          (this.LBL_PM1.getFill().material as THREE.ShaderMaterial).transparent = false;
        });
        this.selected.getPortrait(1).then((texture: OdysseyTexture) => {
          this.LBL_PM2.setFillTexture(texture);
          (this.LBL_PM2.getFill().material as THREE.ShaderMaterial).transparent = false;
        });
        this.selected.getPortrait(2).then((texture: OdysseyTexture) => {
          this.LBL_PM3.setFillTexture(texture);
          (this.LBL_PM3.getFill().material as THREE.ShaderMaterial).transparent = false;
        });
        let areaNames = this.selected.getAreaName().split(' - ');
        if (areaNames.length == 2) {
          this.LBL_PLANETNAME.setText(areaNames[0]);
          this.LBL_AREANAME.setText(areaNames[1]);
        } else {
          this.LBL_PLANETNAME.setText('');
          this.LBL_AREANAME.setText(areaNames[0]);
        }
      }
      this.BTN_SAVELOAD.show();
      this.BTN_DELETE.show();
    } else {
      this.BTN_SAVELOAD.hide();
      this.BTN_DELETE.hide();
    }
  }

  triggerControllerDUpPress() {
    this.LB_GAMES.directionalNavigate('up');
  }

  triggerControllerDDownPress() {
    this.LB_GAMES.directionalNavigate('down');
  }
  
}

export class NewSaveItem extends SaveGame {
  constructor(){
    super();
    this.isNewSave = true;
  }

  getFullName(){
    return GameState.TLKManager.TLKStrings[1586].Value;
  }

  async load(): Promise<void> {}
  async loadNFO(): Promise<void> {}
  async loadPIFO(): Promise<void> {}
  async loadGlobalVARS(): Promise<void> {}
  async loadInventory(): Promise<void> {}
  async loadPartyTable(): Promise<void> {}
}
