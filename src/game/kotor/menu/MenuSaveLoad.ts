
import { SaveGame } from "@/engine/SaveGame";
import { MenuSaveLoadMode } from "@/enums/gui/MenuSaveLoadMode";
import { GUISaveGameItem } from "@/game/kotor/gui/GUISaveGameItem";
import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { TextureLoader } from "@/loaders";
import { Module } from "@/module";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";

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
  selected: SaveGame;

  // TLK
  // 1592: "Are you sure you want to delete the save game?"
  // 1591: "Are you sure you want to overwrite the save game?"
  private static readonly STRREF_CONFIRM_DELETE = 1592;
  private static readonly STRREF_CONFIRM_OVERWRITE = 1591;

  constructor(){
    super();
    this.gui_resref = "saveload";
    this.background = "1600x1200back";
    this.voidFill = true;
  }

  // KotOR lets you delete in both Save and Load screens.
  // Only disallow deleting the "New Save" row.
  private canDeleteSelected(): boolean {
    if (!(this.selected instanceof SaveGame)) return false;
    if (this.selected instanceof NewSaveItem) return false;
    return true;
  }

  private async deleteSelectedSaveNow(): Promise<void> {
    const save = this.selected;
    if (!this.canDeleteSelected()) return;

    await SaveGame.DeleteSave(save);
    this.reloadSaves();
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;

    return new Promise<void>((resolve) => {

      this._button_y = this.BTN_DELETE;

      // DELETE (available in both modes)
      this.BTN_DELETE.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!this.canDeleteSelected()) return;

        this.manager.InGameConfirm.showConfirmDialog(
          MenuSaveLoad.STRREF_CONFIRM_DELETE,
          async () => {
            await this.deleteSelectedSaveNow();
          },
          () => {}
        );
      });

      // SAVE / LOAD
      this.BTN_SAVELOAD.setText("Load");
      this.BTN_SAVELOAD.addEventListener("click", (e) => {
        e.stopPropagation();
        const savegame = this.selected;

        // LOADGAME mode: load selected save
        if (this.mode === MenuSaveLoadMode.LOADGAME) {
          if (savegame) {
            this.manager.ClearMenus();
            if (GameState.module instanceof Module) {
              GameState.module.dispose();
              GameState.module = undefined;
            }
            savegame.load();
          }
          return;
        }

        // SAVEGAME mode
        if (savegame instanceof NewSaveItem) {
          // New save slot -> ask for a name
          this.manager.MenuSaveName.open();
          this.manager.MenuSaveName.onSave = async (name = "") => {
            await SaveGame.SaveCurrentGame(name.trim());
            this.reloadSaves();
          };
          return;
        }

        // Existing slot -> confirm overwrite (KotOR behavior: no rename)
        this.manager.InGameConfirm.showConfirmDialog(
          MenuSaveLoad.STRREF_CONFIRM_OVERWRITE,
          async () => {
            await SaveGame.OverwriteSave(savegame);
            this.reloadSaves();
          },
          () => {}
        );
      });
      this._button_a = this.BTN_SAVELOAD;

      // BACK
      this.BTN_BACK = this.getControlByName("BTN_BACK");
      this.BTN_BACK.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      // LIST
      this.LB_GAMES.GUIProtoItemClass = GUISaveGameItem;
      this.LB_GAMES.listMarginTop = 5;
      this.LB_GAMES.onSelected = (save: SaveGame) => {
        this.selected = save;
        this.UpdateSelected();
      };

      this.tGuiPanel.getFill().position.z = -1;
      resolve();
    });
  }

  show() {
    super.show();
    this.selectedControl = this.LB_GAMES;
    this.reloadSaves();

    if (this.mode === MenuSaveLoadMode.SAVEGAME) {
      this.BTN_SAVELOAD.setText(GameState.TLKManager.TLKStrings[1587].Value); // Save
    } else {
      this.BTN_SAVELOAD.setText(GameState.TLKManager.TLKStrings[1589].Value); // Load
    }

    TextureLoader.LoadQueue();
  }

  getSaveGames(): SaveGame[] {
    let saves: SaveGame[];
    if (this.mode === MenuSaveLoadMode.SAVEGAME) {
      // Save screen: only manual saves + "New Save" row
      saves = SaveGame.saves.filter(s => !s.getIsQuickSave() && !s.getIsAutoSave());
      saves.unshift(new NewSaveItem());
    } else {
      // Load screen: all saves (including quick/autosave)
      saves = SaveGame.saves;
    }
    return saves;
  }

  reloadSaves(){
    this.LB_GAMES.clearItems();
    const saves = this.getSaveGames();
    for (const save of saves) {
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
    this.LBL_PLANETNAME.setText("");
    this.LBL_AREANAME.setText("");

    if (this.selected instanceof SaveGame) {
      this.LB_GAMES.selectItem(this.selected);

      if (!(this.selected instanceof NewSaveItem)) {
        this.selected.getThumbnail().then((t: OdysseyTexture) => {
          this.LBL_SCREENSHOT.setFillTexture(t);
        });
        this.selected.getPortrait(0).then(t => this.LBL_PM1.setFillTexture(t));
        this.selected.getPortrait(1).then(t => this.LBL_PM2.setFillTexture(t));
        this.selected.getPortrait(2).then(t => this.LBL_PM3.setFillTexture(t));

        const area = this.selected.getAreaName().split(" - ");
        this.LBL_PLANETNAME.setText(area.length === 2 ? area[0] : "");
        this.LBL_AREANAME.setText(area.length === 2 ? area[1] : area[0]);
      }

      this.BTN_SAVELOAD.show();

      // Delete is available in both modes, but not on the "New Save" row
      if (this.selected instanceof NewSaveItem) {
        this.BTN_DELETE.hide();
      } else {
        this.BTN_DELETE.show();
      }
    } else {
      this.BTN_SAVELOAD.hide();
      this.BTN_DELETE.hide();
    }
  }

  triggerControllerDUpPress() {
    this.LB_GAMES.directionalNavigate("up");
  }

  triggerControllerDDownPress() {
    this.LB_GAMES.directionalNavigate("down");
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
