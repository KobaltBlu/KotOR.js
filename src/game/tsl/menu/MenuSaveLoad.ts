import { GameState } from "@/GameState";
import type { GUILabel, GUIListBox, GUIButton } from "@/gui";
import { MenuSaveLoad as K1_MenuSaveLoad, NewSaveItem } from "@/game/kotor/KOTOR";
import { MenuSaveLoadMode } from "@/enums/gui/MenuSaveLoadMode";
import { GUISaveGameItem } from "@/game/tsl/gui/GUISaveGameItem";
import { SaveGame } from "@/engine/SaveGame";
import { TextureLoader } from "@/loaders";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";

/** Retail CSWGuiSaveLoad::ShowGame play-time TLK (hours/minutes tokens). */
const TLK_TIME_PLAYED = 0xbe73;

/**
 * MenuSaveLoad class.
 *
 * Retail CSWGuiSaveLoad (saveload_p) — TSL filter, PC name, play time, save order.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuSaveLoad.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSaveLoad extends K1_MenuSaveLoad {

  declare LBL_BAR4: GUILabel;
  declare LBL_PANELNAME: GUILabel;
  declare LBL_SCREENSHOT: GUILabel;
  declare LBL_PLANETNAME: GUILabel;
  declare LBL_PM2: GUILabel;
  declare LBL_AREANAME: GUILabel;
  declare LBL_PM1: GUILabel;
  declare LBL_PM3: GUILabel;
  declare LBL_PCNAME: GUILabel;
  declare LBL_TIMEPLAYED: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LB_GAMES: GUIListBox;
  declare BTN_BACK: GUIButton;
  declare BTN_SAVELOAD: GUIButton;
  declare BTN_DELETE: GUIButton;
  declare BTN_FILTER: GUIButton;

  filters: string[] = [];
  cFilterIndex: number = 0;

  constructor(){
    super();
    this.gui_resref = 'saveload_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  protected formatTimePlayed(save: SaveGame): string {
    const hours = save.getHoursPlayed();
    const minutes = save.getMinutesPlayed();
    const tlk = GameState.TLKManager.GetStringById(TLK_TIME_PLAYED)?.Value
      || GameState.TLKManager.TLKStrings?.[TLK_TIME_PLAYED]?.Value;
    if(tlk){
      // Retail substitutes %0/%1 (or similar) with hours/minutes.
      return tlk
        .replace(/%d/g, String(hours))
        .replace(/%0!?[nu]?!?/gi, String(hours))
        .replace(/%1!?[nu]?!?/gi, String(minutes))
        .replace(/<CUSTOM0>/gi, String(hours))
        .replace(/<CUSTOM1>/gi, String(minutes));
    }
    return `Time: ${hours}H ${minutes}M`;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this._button_y = this.BTN_DELETE;

      this.BTN_DELETE.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.canDeleteSelected()) return;

        this.manager.InGameConfirm.showConfirmDialog(
          1592,
          async () => {
            await this.deleteSelectedSaveNow();
          },
          () => {}
        );
      });

      this.BTN_SAVELOAD.setText('Load');
      this.BTN_SAVELOAD.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onSaveLoadClicked();
      });
      this._button_a = this.BTN_SAVELOAD;

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
        GameState.GameOverManager?.ResumeTempDeathChecks?.();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_FILTER.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.filters.length){
          this.cFilterIndex++;
          if(this.cFilterIndex >= this.filters.length){
            this.cFilterIndex = 0;
          }
        }
        this.reloadSaves();
      });

      this.LBL_PCNAME.setText('');
      this.LBL_TIMEPLAYED.setText('');
      this.LB_GAMES.setProtoBuilder(GUISaveGameItem);
      this.LB_GAMES.onSelected = (save: SaveGame) => {
        this.selected = save;
        this.UpdateSelected();
      };

      this.tGuiPanel.getFill().position.z = -1;
      resolve();
    });
  }

  getSaveGames(): SaveGame[] {
    let saves: SaveGame[] = [];

    if (this.mode == MenuSaveLoadMode.SAVEGAME) {
      saves = SaveGame.saves.slice().filter(save => {
        return !save.getIsQuickSave() && !save.getIsAutoSave();
      });
      // Retail SortGamesByTimeStamp — newest first for manual slots.
      saves = saves.sort((a, b) => {
        const ta = a.TIMESTAMP instanceof Date ? a.TIMESTAMP.getTime() : 0;
        const tb = b.TIMESTAMP instanceof Date ? b.TIMESTAMP.getTime() : 0;
        return tb - ta;
      });
      saves.unshift(new NewSaveItem());
    }else{
      saves = SaveGame.saves.slice();
      const special = saves.filter(save => {
        return save.getIsQuickSave() || save.getIsAutoSave();
      });

      const manual = saves.filter(save => {
        return !save.getIsQuickSave() && !save.getIsAutoSave();
      }).sort((a, b) => {
        const ta = a.TIMESTAMP instanceof Date ? a.TIMESTAMP.getTime() : 0;
        const tb = b.TIMESTAMP instanceof Date ? b.TIMESTAMP.getTime() : 0;
        return tb - ta;
      });
      saves = [...special, ...manual];
    }

    this.filters = saves.filter((save) => {
      return !save.getIsQuickSave() && !save.getIsAutoSave() && !save.isNewSave && !!save.PCNAME;
    }).map((save) => {
      return save.PCNAME;
    }).filter((pcname, index, array) => {
      return array.indexOf(pcname) === index;
    });

    if(this.filters.length){
      if(this.cFilterIndex >= this.filters.length){
        this.cFilterIndex = 0;
      }
      const filterName = this.filters[this.cFilterIndex];
      saves = saves.filter((save) => {
        // Always keep New Save / quick / auto; filter manuals by PC name.
        if(save instanceof NewSaveItem || save.isNewSave) return true;
        if(save.getIsQuickSave() || save.getIsAutoSave()) return true;
        return save.PCNAME == filterName;
      });
    }

    return saves;
  }

  UpdateSelected() {
    this.LBL_SCREENSHOT.setFillTexture(undefined);
    this.LBL_PM1.setFillTexture(undefined);
    this.LBL_PM2.setFillTexture(undefined);
    this.LBL_PM3.setFillTexture(undefined);
    this.LBL_PLANETNAME.setText('');
    this.LBL_AREANAME.setText('');
    this.LBL_PCNAME.setText('');
    this.LBL_TIMEPLAYED.setText('');

    if (this.selected instanceof SaveGame) {
      this.LB_GAMES.selectItem(this.selected);

      if (!(this.selected instanceof NewSaveItem)) {
        this.selected.getThumbnail().then((t: OdysseyTexture) => {
          this.LBL_SCREENSHOT.setFillTexture(t);
        });
        this.selected.getPortrait(0).then(t => this.LBL_PM1.setFillTexture(t));
        this.selected.getPortrait(1).then(t => this.LBL_PM2.setFillTexture(t));
        this.selected.getPortrait(2).then(t => this.LBL_PM3.setFillTexture(t));

        const area = this.selected.getAreaName().split(' - ');
        this.LBL_PLANETNAME.setText(area.length === 2 ? area[0] : '');
        this.LBL_AREANAME.setText(area.length === 2 ? area[1] : area[0]);
        this.LBL_PCNAME.setText(this.selected.PCNAME || '');
        this.LBL_TIMEPLAYED.setText(this.formatTimePlayed(this.selected));
      }

      this.BTN_SAVELOAD.show();

      if (this.selected instanceof NewSaveItem) {
        this.BTN_DELETE.hide();
      } else {
        this.BTN_DELETE.show();
      }
    } else {
      this.BTN_SAVELOAD.hide();
      this.BTN_DELETE.hide();
    }

    if(this.BTN_FILTER){
      if(this.filters.length > 1){
        this.BTN_FILTER.show();
        const label = this.filters[this.cFilterIndex] || '';
        this.BTN_FILTER.setText?.(label);
      }else{
        this.BTN_FILTER.hide();
      }
    }
  }

  show() {
    super.show();
    TextureLoader.LoadQueue();
  }

}
