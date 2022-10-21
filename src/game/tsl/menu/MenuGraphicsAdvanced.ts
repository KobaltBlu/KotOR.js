/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, GUIButton, GUICheckBox } from "../../../gui";
import { MenuGraphicsAdvanced as K1_MenuGraphicsAdvanced } from "../../kotor/KOTOR";

/* @file
* The MenuGraphicsAdvanced menu class.
*/

export class MenuGraphicsAdvanced extends K1_MenuGraphicsAdvanced {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare LB_DESC: GUIListBox;
  declare BTN_ANTIALIAS: GUIButton;
  declare BTN_ANTIALIASLEFT: GUIButton;
  declare BTN_ANTIALIASRIGHT: GUIButton;
  declare BTN_ANISOTROPY: GUIButton;
  declare BTN_ANISOTROPYLEFT: GUIButton;
  declare BTN_ANISOTROPYRIGHT: GUIButton;
  declare BTN_TEXQUAL: GUIButton;
  declare BTN_TEXQUALLEFT: GUIButton;
  declare BTN_TEXQUALRIGHT: GUIButton;
  declare CB_FRAMEBUFF: GUICheckBox;
  declare CB_VSYNC: GUICheckBox;
  declare CB_SOFTSHADOWS: GUICheckBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_CANCEL: GUIButton;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optgraphicadv_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {

      this.BTN_ANTIALIASLEFT.border.dimension = 0;
      this.BTN_ANISOTROPYLEFT.border.dimension = 0;
      this.BTN_TEXQUALLEFT.border.dimension = 0;

      this.tGuiPanel.widget.add(this.BTN_TEXQUALLEFT.createControl());
      this.tGuiPanel.widget.add(this.BTN_ANISOTROPYLEFT.createControl());
      this.tGuiPanel.widget.add(this.BTN_ANTIALIASLEFT.createControl());

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_TEXQUALRIGHT.addEventListener('click', (e: any) => {
        let quality = GameState.iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
        quality++;
        if(quality >= Global.kotor2DA.texpacks.RowCount) quality = Global.kotor2DA.texpacks.RowCount-1;
        GameState.iniConfig.setProperty('Graphics Options.Texture Quality', quality);
        this.updateTextureQualityLabel();
      });

      this.BTN_TEXQUALLEFT.addEventListener('click', (e: any) => {
        let quality = GameState.iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
        quality--;
        if(quality < 0) quality = 0;
        GameState.iniConfig.setProperty('Graphics Options.Texture Quality', quality);
        this.updateTextureQualityLabel();
      });

      // this.CB_FRAMEBUFF.onValueChanged = (value) => {
      // 
      // };
      // this.CB_FRAMEBUFF.attachINIProperty('Graphics Options.Grass');
      resolve();
    });
  }

  Show() {
    super.Show();
    this.updateTextureQualityLabel();
    this.BTN_ANTIALIAS.hide();
    this.BTN_ANTIALIASLEFT.hide();
    this.BTN_ANTIALIASRIGHT.hide();
    this.BTN_ANISOTROPY.hide();
    this.BTN_ANISOTROPYLEFT.hide();
    this.BTN_ANISOTROPYRIGHT.hide();
    this.CB_FRAMEBUFF.hide();
    this.CB_VSYNC.hide();
    this.CB_SOFTSHADOWS.hide();
  }

  Close() {
    super.Close();
    const quality = iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
    if (quality != TextureLoader.TextureQuality) {
      TextureLoader.TextureQuality = quality;
      GameState.ReloadTextureCache();
      iniConfig.save();
    }
  }

  updateTextureQualityLabel() {
    const quality = iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
    const _2darow = Global.kotor2DA.texpacks.rows[quality];
    if (_2darow) {
      this.BTN_TEXQUAL.setText(TLKManager.GetStringById(_2darow.strrefname));
    }
    if (quality <= 0) {
      this.BTN_TEXQUALLEFT.hide();
    } else {
      this.BTN_TEXQUALLEFT.show();
    }
    if (quality >= Global.kotor2DA.texpacks.RowCount - 1) {
      this.BTN_TEXQUALRIGHT.hide();
    } else {
      this.BTN_TEXQUALRIGHT.show();
    }
  }
  
}
