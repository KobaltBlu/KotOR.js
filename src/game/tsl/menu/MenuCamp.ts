import { MenuCamp as KOTORMenuCamp } from "../../kotor/menu/MenuCamp";

/**
 * MenuCamp class (TSL).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuCamp.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuCamp extends KOTORMenuCamp {

  constructor(){
    super();
    this.gui_resref = 'camp_p';
  }

}
