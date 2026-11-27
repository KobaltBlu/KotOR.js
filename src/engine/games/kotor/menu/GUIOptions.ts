import { GameState } from "@engine/runtime/GameState";
import { GameMenu } from "@engine/gui";
import type { GUIListBox, GUILabel, GUIButton, GUISlider } from "@engine/gui";
import type { GFFObject } from "@core/resource/GFFObject";
import {
  filterGuiControls, findGuiControl, setGuiControlTag, setGuiControlText,
} from "@engine/gui/guiLayoutEdit";
import {
  GUI_SCALE_DEFAULT, applyGUIScale, getGUIScale, guiScaleToSlider, setGUIScale, sliderToGUIScale,
} from "@engine/gui/guiScaleSetting";

/** Controls kept from the graphics options layout this menu is derived from. */
const KEEP_CONTROLS = new Set([
  'LBL_TITLE', 'SLI_GAMMA', 'LBL_GAMMA', 'LB_DESC', 'BTN_DEFAULT', 'BTN_BACK',
]);

const TITLE_TEXT = 'GUI Options';
const DESC_GUI_SCALE = 'Scales the in-game interface. 1.00x is the default size; '
  + 'the range is 0.50x to 2.00x. HUD elements stay pinned to their screen edges.';

/**
 * GUIOptions class.
 *
 * Code-only menu (no .gui of its own): reuses the graphics options layout,
 * keeping only the title, description, default/back buttons and one slider
 * that sets the in-game interface scale.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GUIOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIOptions extends GameMenu {

  LBL_TITLE: GUILabel;
  SLI_GUISCALE: GUISlider;
  LBL_GUISCALE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_DEFAULT: GUIButton;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optgraphics';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  /** Extra layout controls a subclass keeps (e.g. TSL divider bars). */
  protected keepControl(tag: string): boolean {
    return KEEP_CONTROLS.has(tag);
  }

  protected onMenuGFFLoaded(gff: GFFObject): void {
    filterGuiControls(gff, (tag) => this.keepControl(tag));

    const title = findGuiControl(gff, 'LBL_TITLE');
    if(title) setGuiControlText(title, TITLE_TEXT);

    const slider = findGuiControl(gff, 'SLI_GAMMA');
    if(slider) setGuiControlTag(slider, 'SLI_GUISCALE');

    const label = findGuiControl(gff, 'LBL_GAMMA');
    if(label){
      setGuiControlTag(label, 'LBL_GUISCALE');
      setGuiControlText(label, this.formatScaleLabel(getGUIScale()));
    }
  }

  protected formatScaleLabel(scale: number): string {
    return `Interface Scale: ${scale.toFixed(2)}x`;
  }

  protected setDescription(text: string) {
    this.LB_DESC?.setItem(text);
  }

  /** Slider moved: snap, save, update the label and apply to the HUD. */
  protected onScaleSliderChanged(value: number) {
    const scale = setGUIScale(sliderToGUIScale(value));
    this.LBL_GUISCALE?.setText(this.formatScaleLabel(scale));
    applyGUIScale(scale);
  }

  protected setScaleValue(scale: number) {
    this.SLI_GUISCALE?.setValue(guiScaleToSlider(scale));
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

      this.BTN_DEFAULT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setScaleValue(GUI_SCALE_DEFAULT);
      });

      this.SLI_GUISCALE.onValueChanged = (value: number) => this.onScaleSliderChanged(value);
      this.setScaleValue(getGUIScale());

      this.SLI_GUISCALE.addEventListener('hover', () => this.setDescription(DESC_GUI_SCALE));
      this.LBL_GUISCALE.addEventListener('hover', () => this.setDescription(DESC_GUI_SCALE));

      resolve();
    });
  }

  show() {
    super.show();
    this.setScaleValue(getGUIScale());
    this.setDescription(DESC_GUI_SCALE);
  }

  close(){
    super.close();
    GameState.iniConfig.save();
  }

}
