import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "../../../gui";
import { TextureLoaderState } from "../../../loaders/TextureLoaderState";

/**
 * MenuGraphicsAdvanced class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuGraphicsAdvanced.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuGraphicsAdvanced extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_CANCEL: GUIButton;
  BTN_BACK: GUIButton;
  BTN_ANTIALIAS: GUIButton;
  BTN_ANTIALIASLEFT: GUIButton;
  BTN_ANTIALIASRIGHT: GUIButton;
  BTN_ANISOTROPY: GUIButton;
  BTN_ANISOTROPYLEFT: GUIButton;
  BTN_ANISOTROPYRIGHT: GUIButton;
  BTN_TEXQUAL: GUIButton;
  BTN_TEXQUALLEFT: GUIButton;
  BTN_TEXQUALRIGHT: GUIButton;
  CB_FRAMEBUFF: GUICheckBox;
  CB_VSYNC: GUICheckBox;
  CB_SOFTSHADOWS: GUICheckBox;

  constructor(){
    super();
    this.gui_resref = 'optgraphicsadv';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_ANTIALIASLEFT.border.dimension = 0;
      this.BTN_ANISOTROPYLEFT.border.dimension = 0;
      this.BTN_TEXQUALLEFT.border.dimension = 0;

      this.tGuiPanel.widget.add(this.BTN_TEXQUALLEFT.createControl());
      this.tGuiPanel.widget.add(this.BTN_ANISOTROPYLEFT.createControl());
      this.tGuiPanel.widget.add(this.BTN_ANTIALIASLEFT.createControl());

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_TEXQUALRIGHT.addEventListener('click', (e) => {
        let quality = GameState.iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
        quality++;
        if(quality >= GameState.TwoDAManager.datatables.get('texpacks').RowCount) quality = GameState.TwoDAManager.datatables.get('texpacks').RowCount-1;
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
    const quality = GameState.iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
    
    const _2darow = GameState.TwoDAManager.datatables.get('texpacks').rows[quality];
    if (_2darow) {
      this.BTN_TEXQUAL.setText(GameState.TLKManager.GetStringById(_2darow.strrefname).Value);
    }
    if (quality <= 0) {
      this.BTN_TEXQUALLEFT.hide();
    } else {
      this.BTN_TEXQUALLEFT.show();
    }
    if (quality >= GameState.TwoDAManager.datatables.get('texpacks').RowCount - 1) {
      this.BTN_TEXQUALRIGHT.hide();
    } else {
      this.BTN_TEXQUALRIGHT.show();
    }
  }
  
}
