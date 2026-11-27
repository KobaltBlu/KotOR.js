import type { GUIControl, GameMenu } from "@/gui";
import type { GFFStruct } from "@/resource/GFFStruct";
import { GUIFeatItem as K1_GUIFeatItem } from "@/game/kotor/gui/GUIFeatItem";

/**
 * GUIFeatItem class.
 *
 * TSL feat chain row: same behaviour as the K1 row with the TSL frame/arrow
 * textures and row height. Used by the chargen feats screen (where feats can
 * be picked) and by the in-game abilities screen (plain listing).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GUIFeatItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIFeatItem extends K1_GUIFeatItem {

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl = null as any, scale = false){
    super(menu, control, parent, scale);
    this.extent.height = 45;
    this.frameTexture = 'uibit_abi_back';
    this.arrowTexture = 'uibit_abi_arrow';
    this.iconSize = this.extent.height;
    this.arrowSize = this.extent.height/2;
    //Plain listings (no host selection model) only draw the feats the creature has
    this.hideLockedFeats = (typeof this.getHost().getFeatState !== 'function');
  }

}
