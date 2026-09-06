import type { DialogMessageEntry } from "@/engine/DialogMessageEntry";
import type { FeedbackMessageEntry } from "@/engine/FeedbackMessageEntry";
import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";
import { GUIProtoItem } from "@/gui";
import type { GameMenu, GUIControl } from "@/gui";
import { asExtentInt } from "@/gui/GUICoord";
import { chromeFrameDimension } from "@/gui/guiChrome";
import type { GUIListBox } from "@/gui/GUIListBox";
import type { RetailRowExtent } from "@/gui/GUIProtoItem";
import type { GFFStruct } from "@/resource/GFFStruct";

/** Retail colorRed — feedback ATTACK rows. */
const COLOR_RED = { r: 1, g: 0, b: 0 };
/** Retail colorBlue — feedback INFO rows. */
const COLOR_BLUE = { r: 0, g: 0.658824, b: 0.980392 };
/** Retail colorYellow — LabelHilight selection. */
const COLOR_YELLOW = { r: 0.980392, g: 1, b: 0 };

/**
 * GUIMessageItem class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * Retail CSWGuiLabelHilight rows for Messages LB_DIALOG / LB_MESSAGES:
 * base extent height 10, then height = GetIdealHeight + GetBorderDim*2.
 *
 * @file GUIMessageItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIMessageItem extends GUIProtoItem {

  declare node: DialogMessageEntry | FeedbackMessageEntry | string;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    // Height is set explicitly after wrap measure (ideal + 2*borderDim).
    this.listRowAlignExtentToWrappedText = false;
    this.defaultHighlightColor.setRGB(COLOR_YELLOW.r, COLOR_YELLOW.g, COLOR_YELLOW.b);
  }

  /**
   * Retail AddMessages / AddDialogMessages stack extent before SetText:
   * {left 0, top 0, width 0 → viewport-2*padding, height 10}.
   */
  getRetailBaseExtent(_list: GUIListBox): RetailRowExtent {
    return { left: 0, top: 0, width: 0, height: 10 };
  }

  createControl(){
    try{
      super.createControl();
      this.applyNodeContent();
      this.syncRetailRowHeight();
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

  /** Dialog: "speaker: message" when speaker non-empty; feedback: message + color. */
  private applyNodeContent(){
    const node = this.node;
    if(node && typeof node === 'object' && 'speaker' in node){
      const entry = node as DialogMessageEntry;
      const speaker = (entry.speaker || '').trim();
      const message = entry.message || '';
      this.setText(speaker.length > 0 ? `${speaker}: ${message}` : message);
      return;
    }
    if(node && typeof node === 'object' && 'message' in node){
      const entry = node as FeedbackMessageEntry;
      this.setText(entry.message || '');
      if(entry.color === FeebackMessageColor.ATTACK){
        this.defaultColor.setRGB(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
      }else{
        this.defaultColor.setRGB(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
      }
      this.setTextColor(this.defaultColor.r, this.defaultColor.g, this.defaultColor.b);
      this.text.color.copy(this.defaultColor);
      if(this.text.material?.uniforms?.diffuse){
        this.text.material.uniforms.diffuse.value = this.text.color;
        this.text.material.needsUpdate = true;
      }
      return;
    }
    if(typeof node === 'string'){
      this.setText(node);
    }
  }

  /**
   * Retail: height = GetIdealHeight() + GetBorderDim()*2 after SetText.
   * Use hilight-aware chrome frame dim (not idle BORDER only) so the hover
   * selection frame pads around the text. Unclamped — retail GetBorderDim is
   * not limited by the provisional height-10 extent before SetExtent.
   */
  private syncRetailRowHeight(){
    if(this.text?.geometry?.boundingBox){
      this.text.geometry.computeBoundingBox();
      this.text.geometry.boundingBox.getSize(this.textSize);
    }
    const textH = asExtentInt(this.textSize?.y || 0);
    const borderDim = asExtentInt(chromeFrameDimension(
      this.getBorderSize(),
      this.getHighlightSize(),
      !!(this.border.edge || this.border.corner),
      !!(this.highlight.edge || this.highlight.corner),
    ));
    const height = Math.max(10, textH + borderDim * 2);
    this.setExtentHeight(height);
    this.resizeControl();
    this.alignText();
  }

  /**
   * Hilight edge/corner may resolve GetBorderDim via texture size after async
   * load — re-measure row height so the list layout picks up the padded extent.
   */
  protected onChromeTextureLoaded(): void {
    const prevH = asExtentInt(this.extent.height);
    this.syncRetailRowHeight();
    if(asExtentInt(this.extent.height) !== prevH && this.list){
      this.list.relayoutAfterRowHeightChange();
    }
  }

}
