import { GameState } from "../../../GameState";
import type { GUILabel, GUIListBox, GUIButton, GUICheckBox } from "../../../gui";
import { TextureLoaderState } from "../../../loaders/TextureLoaderState";
import { MenuGraphicsAdvanced as K1_MenuGraphicsAdvanced } from "../../kotor/KOTOR";

/**
 * MenuGraphicsAdvanced class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuGraphicsAdvanced.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      const texPacks = GameState.TwoDAManager.datatables.get('texpacks') || {} as any;

      this.BTN_ANTIALIASLEFT.border.dimension = 0;
      this.BTN_ANISOTROPYLEFT.border.dimension = 0;
      this.BTN_TEXQUALLEFT.border.dimension = 0;

      this.tGuiPanel.widget.add(this.BTN_TEXQUALLEFT.createControl());
      this.tGuiPanel.widget.add(this.BTN_ANISOTROPYLEFT.createControl());
      this.tGuiPanel.widget.add(this.BTN_ANTIALIASLEFT.createControl());

      this.BTN_CANCEL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_a = this.BTN_CANCEL;

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_TEXQUALRIGHT.addEventListener('click', (e) => {
        let quality = GameState.iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
        quality++;
        if(quality >= texPacks.RowCount) quality = texPacks.RowCount-1;
        GameState.iniConfig.setProperty('Graphics Options.Texture Quality', quality);
        this.updateTextureQualityLabel();
      });

      this.BTN_TEXQUALLEFT.addEventListener('click', (e) => {
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

  show() {
    super.show();
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

  close() {
    super.close();
    const quality = GameState.iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
    if (quality != TextureLoaderState.TextureQuality) {
      TextureLoaderState.TextureQuality = quality;
      GameState.ReloadTextureCache();
      GameState.iniConfig.save();
    }
  }

  updateTextureQualityLabel() {
    const texPacks = GameState.TwoDAManager.datatables.get('texpacks') || {} as any;
    const quality = GameState.iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
    const _2darow = texPacks.rows[quality];
    if (_2darow) {
      this.BTN_TEXQUAL.setText(GameState.TLKManager.GetStringById(_2darow.strrefname).Value);
    }
    if (quality <= 0) {
      this.BTN_TEXQUALLEFT.hide();
    } else {
      this.BTN_TEXQUALLEFT.show();
    }
    if (quality >= texPacks.RowCount - 1) {
      this.BTN_TEXQUALRIGHT.hide();
    } else {
      this.BTN_TEXQUALRIGHT.show();
    }
  }
  
}
