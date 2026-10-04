import type { GUILabel, GUIListBox, GUIButton, GUICheckBox } from "@engine/gui";
import { MenuGraphicsAdvanced as K1_MenuGraphicsAdvanced } from "@engine/games/kotor/menu/MenuGraphicsAdvanced";

/** graphics advanced options description TLKs (TSL). */
const TLK_SOFT_SHADOWS = 0xbe47;
const TLK_FRAME_BUFFER = 0xbe4a;
const TLK_ANISOTROPY = 0xbe4b;
const TLK_VSYNC = 0xbe4c;
const TLK_ANTI_ALIAS = 0xbe49;
const TLK_TEX_QUAL = 0xbe48;

/** SetAntiAliasText display TLKs keyed by sample count (TSL). */
const TLK_AA_OFF = 0xbe62;
const TLK_AA_2X = 0xbe63;
const TLK_AA_4X = 0xbe65;
const TLK_AA_6X = 0xbe68;
const TLK_AA_8X = 0xbe69;

/** SetAnisotropyText display TLKs keyed by anisotropy level (TSL). */
const TLK_ANISO_1X = 0xbf6a;
const TLK_ANISO_2X = 0xbf6b;
const TLK_ANISO_4X = 0xbf6c;
const TLK_ANISO_8X = 0xbf6d;
const TLK_ANISO_16X = 0xbf6e;

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

  protected getDescAntiAlias(): number { return TLK_ANTI_ALIAS; }
  protected getDescTexQual(): number { return TLK_TEX_QUAL; }
  protected getDescAnisotropy(): number { return TLK_ANISOTROPY; }
  protected getDescFrameBuffer(): number { return TLK_FRAME_BUFFER; }
  protected getDescSoftShadows(): number { return TLK_SOFT_SHADOWS; }
  protected getDescVSync(): number { return TLK_VSYNC; }

  protected getAntiAliasLabelStrRef(mode: number): number {
    switch(mode){
      case 2: return TLK_AA_2X;
      case 4: return TLK_AA_4X;
      case 6: return TLK_AA_6X;
      case 8: return TLK_AA_8X;
      default: return TLK_AA_OFF;
    }
  }

  protected getAnisotropyLabelStrRef(level: number): number {
    switch(level){
      case 2: return TLK_ANISO_2X;
      case 4: return TLK_ANISO_4X;
      case 8: return TLK_ANISO_8X;
      case 16: return TLK_ANISO_16X;
      default: return TLK_ANISO_1X;
    }
  }

}
