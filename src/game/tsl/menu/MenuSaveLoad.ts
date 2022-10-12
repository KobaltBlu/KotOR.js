/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuSaveLoad as K1_MenuSaveLoad, GUILabel, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The MenuSaveLoad menu class.
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

  constructor(){
    super();
    this.gui_resref = 'saveload_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      this.BTN_SAVELOAD.setText('Load');
      this.BTN_SAVELOAD.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selected instanceof SaveGame){
          this.Close();

          if(GameState.module instanceof Module){
            GameState.module.dispose();
          }
          
          this.selected.Load()
        }
      });

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });

      this.tGuiPanel.getFill().position.z = -1;
      resolve();
    });
  }

  Show() {
    super.Show();
    GameState.MenuActive = true;
    this.LB_GAMES.clearItems();
    let saves = SaveGame.saves;
    for (let i = 0; i < saves.length; i++) {
      if (!i) {
        this.selected = saves[i];
        this.UpdateSelected();
      }
      let save = saves[i];
      this.LB_GAMES.addItem(save, null, (control, type) => {
        control.GetFieldByLabel('TEXT').GetChildStructs()[0].GetFieldByLabel('TEXT').SetValue(save.getFullName());
        let _ctrl = new GUIProtoItem(this.LB_GAMES.menu, control, this.LB_GAMES, this.LB_GAMES.scale);
        _ctrl.setList(this.LB_GAMES);
        this.LB_GAMES.children.push(_ctrl);
        let idx = this.LB_GAMES.itemGroup.children.length;
        let item = _ctrl.createControl();
        this.LB_GAMES.itemGroup.add(item);
        _ctrl.addEventListener('click', e => {
          e.stopPropagation();
          this.selected = save;
          this.UpdateSelected();
        });
      });
    }
    TextureLoader.LoadQueue();
  }

  UpdateSelected() {
    if (this.selected instanceof SaveGame) {
      this.selected.GetThumbnail(texture => {
        this.LBL_SCREENSHOT.setFillTexture(texture);
        this.LBL_SCREENSHOT.getFill().material.transparent = false;
      });
    }
    this.selected.GetPortrait(0, texture => {
      console.log(texture);
      this.LBL_PM1.setFillTexture(texture);
      this.LBL_PM1.getFill().material.transparent = false;
    });
    this.selected.GetPortrait(1, texture => {
      this.LBL_PM2.setFillTexture(texture);
      this.LBL_PM2.getFill().material.transparent = false;
    });
    this.selected.GetPortrait(2, texture => {
      this.LBL_PM3.setFillTexture(texture);
      this.LBL_PM3.getFill().material.transparent = false;
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
  
}
