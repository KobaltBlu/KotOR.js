import { GameState } from "@engine/runtime/GameState";
import { GameMenu } from "@engine/gui";
import type { GUIListBox, GUILabel, GUIButton, GUISlider, GUICheckBox } from "@engine/gui";
import type { GFFObject } from "@core/resource/GFFObject";
import {
  cloneGuiControl, findGuiControl, getGuiControlExtent, getGuiControlsField, getMaxGuiControlId,
  insertGuiMoveToAbove, setGuiControlExtent, setGuiControlId, setGuiControlTag, setGuiControlText,
} from "@engine/gui/guiLayoutEdit";

/**
 * graphics options description TLKs (ctor custom_value / OnEnterSlot).
 */
const TLK_DESC_GAMMA = 0xa546;
const TLK_DESC_RESOLUTION = 0xbb5f;
const TLK_DESC_SHADOWS = 0xbb4f;
const TLK_DESC_GRASS = 0xbb53;
const TLK_DESC_ADVANCED = 0xbfae;

/** Code-only button (not in the .gui) that opens the GUI Options menu. */
export const GUI_OPTIONS_BUTTON_TEXT = 'GUI Options';
export const GUI_OPTIONS_DESC = 'Adjust the size of the in-game interface.';
/** Vertical gap between the GUI Options button and the Advanced button. */
const GUI_OPTIONS_BUTTON_GAP = 13;

/**
 * MenuGraphics class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuGraphics.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuGraphics extends GameMenu {

  LBL_TITLE: GUILabel;
  SLI_GAMMA: GUISlider;
  LBL_GAMMA: GUILabel;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_BACK: GUIButton;
  BTN_RESOLUTION: GUIButton;
  CB_SHADOWS: GUICheckBox;
  CB_GRASS: GUICheckBox;
  BTN_ADVANCED: GUIButton;
  BTN_GUIOPTIONS: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optgraphics';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  /** Add BTN_GUIOPTIONS, styled like BTN_ADVANCED, one row above it. */
  protected onMenuGFFLoaded(gff: GFFObject): void {
    const advanced = findGuiControl(gff, 'BTN_ADVANCED');
    const controls = getGuiControlsField(gff);
    if(!advanced || !controls) return;

    const button = cloneGuiControl(advanced);
    const extent = getGuiControlExtent(advanced);
    setGuiControlTag(button, 'BTN_GUIOPTIONS');
    setGuiControlId(button, getMaxGuiControlId(gff) + 1);
    setGuiControlExtent(button, { top: extent.top - extent.height - GUI_OPTIONS_BUTTON_GAP });
    setGuiControlText(button, GUI_OPTIONS_BUTTON_TEXT);
    controls.addChildStruct(button);
    insertGuiMoveToAbove(gff, button, advanced);
  }

  protected setDescriptionText(text: string) {
    this.LB_DESC?.setItem(text);
  }

  protected setDescription(strRef: number) {
    this.LB_DESC?.setItem(
      GameState.TLKManager.GetStringById(strRef)?.Value
        || GameState.TLKManager.TLKStrings?.[strRef]?.Value
        || ''
    );
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.BTN_ADVANCED.addEventListener('click', (e) => {
        this.manager.MenuGraphicsAdvanced.open();
      });

      this.BTN_GUIOPTIONS?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.GUIOptions.open();
      });

      this.SLI_GAMMA.onValueChanged = (value: any) => {
        let contrast = (50 * ((value*2) - 1) )*-1;
        GameState.canvas.style.filter = 'contrast('+(100 + contrast)+'%)';
      };

      this.BTN_RESOLUTION.addEventListener('click', (e) => {
        this.manager.MenuResolutions.open();
      });

      this.CB_GRASS.onValueChanged = (value: any) => {
        if(GameState.group.grass){
          GameState.group.grass.visible = !!value;
        }
      };
      this.CB_GRASS.attachINIProperty('Graphics Options.Grass');

      this.CB_SHADOWS.onValueChanged = () => {
        //Toggle Shadows
      };
      this.CB_SHADOWS.attachINIProperty('Graphics Options.Shadows');

      this.SLI_GAMMA.addEventListener('hover', () => this.setDescription(TLK_DESC_GAMMA));
      this.LBL_GAMMA.addEventListener('hover', () => this.setDescription(TLK_DESC_GAMMA));
      this.BTN_RESOLUTION.addEventListener('hover', () => this.setDescription(TLK_DESC_RESOLUTION));
      this.CB_SHADOWS.addEventListener('hover', () => this.setDescription(TLK_DESC_SHADOWS));
      this.CB_GRASS.addEventListener('hover', () => this.setDescription(TLK_DESC_GRASS));
      this.BTN_ADVANCED.addEventListener('hover', () => this.setDescription(TLK_DESC_ADVANCED));
      this.BTN_GUIOPTIONS?.addEventListener('hover', () => this.setDescriptionText(GUI_OPTIONS_DESC));

      resolve();
    });
  }

  show() {
    super.show();
    this.setDescription(TLK_DESC_GAMMA);
  }

  close(){
    super.close();
    GameState.iniConfig.save();
  }
  
}
