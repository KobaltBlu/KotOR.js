import { GUIOptions as K1_GUIOptions } from "@engine/games/kotor/menu/GUIOptions";

/**
 * GUIOptions class.
 *
 * Code-only menu derived from the TSL graphics options layout.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GUIOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIOptions extends K1_GUIOptions {

  constructor(){
    super();
    this.gui_resref = 'optgraphics_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  /** Keep the decorative divider bars that frame the TSL options panel. */
  protected keepControl(tag: string): boolean {
    return super.keepControl(tag) || /^LBL_BAR\d+$/.test(tag);
  }

}
