import type { GUILabel, GUIListBox, GUIButton } from "@/gui";
import { MenuSaveLoad as K1_MenuSaveLoad, NewSaveItem } from "@/game/kotor/KOTOR";
import { MenuSaveLoadMode } from "@/enums/gui/MenuSaveLoadMode";
import { GUISaveGameItem } from "@/game/tsl/gui/GUISaveGameItem";
import { SaveGame } from "@/engine/SaveGame";

/**
 * MenuSaveLoad class.
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
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

  async menuControlInitializer(skipInit: boolean = false) {
    // Reuse the current save/overwrite/delete confirmation workflow and handlers.
    await super.menuControlInitializer(skipInit);
    if(skipInit) return;
    this.LBL_PCNAME.setText('');
    this.LBL_TIMEPLAYED.setText('');
    this.LB_GAMES.setProtoBuilder(GUISaveGameItem);
    this.BTN_FILTER.addEventListener('click', (e) => {
      e.stopPropagation();
      if(this.filters.length){
        this.cFilterIndex = (this.cFilterIndex + 1) % this.filters.length;
      }
      this.reloadSaves();
    });
    this.updateFilterButton();
  }

  private updateFilterButton(){
    if(!this.BTN_FILTER) return;
    if(this.filters.length){
      this.BTN_FILTER.show();
      this.BTN_FILTER.setText(this.filters[this.cFilterIndex] || this.filters[0]);
    }else{
      this.BTN_FILTER.hide();
    }
  }

  show() {
    super.show();
    this.updateFilterButton();
  }

  getSaveGames(): SaveGame[] {
    const manualSaves = SaveGame.saves.filter(save => !save.getIsQuickSave() && !save.getIsAutoSave()).reverse();
    const specialSaves = SaveGame.saves.filter(save => save.getIsQuickSave() || save.getIsAutoSave());
    let saves: SaveGame[] = this.mode == MenuSaveLoadMode.SAVEGAME
      ? [new NewSaveItem(), ...manualSaves]
      : [...specialSaves, ...manualSaves];

    this.filters = manualSaves.map(save => save.PCNAME).filter(Boolean).filter((pcname, index, array) => array.indexOf(pcname) === index);
    if(this.cFilterIndex < 0 || this.cFilterIndex >= this.filters.length){
      this.cFilterIndex = 0;
    }
    if(this.filters.length){
      const activeFilter = this.filters[this.cFilterIndex];
      saves = saves.filter(save => save.isNewSave || save.getIsQuickSave() || save.getIsAutoSave() || save.PCNAME == activeFilter);
    }
    return saves;
  }

  reloadSaves(){
    super.reloadSaves();
    this.updateFilterButton();
  }

  UpdateSelected() {
    super.UpdateSelected();
    this.LBL_PCNAME.setText('');
    this.LBL_TIMEPLAYED.setText('');
    if(this.selected instanceof SaveGame && !(this.selected instanceof NewSaveItem)){
      this.LBL_PCNAME.setText(this.selected.PCNAME || '');
      this.LBL_TIMEPLAYED.setText(`Time: ${this.selected.getHoursPlayed()}H ${this.selected.getMinutesPlayed()}M`);
    }
  }
}
