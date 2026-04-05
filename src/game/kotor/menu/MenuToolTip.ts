import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIControl, GUILabel } from "@/gui";

/**
 * MenuToolTip class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuToolTip.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuToolTip extends GameMenu {

  tooltip: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'tooltip8x6';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.addEventListener('resize', () => {
        this.width = GameState.ResolutionManager.getViewportWidth();
        this.height = GameState.ResolutionManager.getViewportHeight();
        this.tGuiPanel.extent.width = this.width;
        this.tGuiPanel.extent.height = this.height;
        this.recalculatePosition();
      });
      resolve();
    });
  }

  padding: number = 5;
  currentControl: GUIControl;

  showToolTip(text: string, x: number = 0, y: number = 0, control: GUIControl) {
    if(this.isVisible()) return;
    this.currentControl = control;
    this.width = GameState.ResolutionManager.getViewportWidth();
    this.height = GameState.ResolutionManager.getViewportHeight();
    this.tGuiPanel.extent.width = this.width;
    this.tGuiPanel.extent.height = this.height;
    this.recalculatePosition();
    this.tooltip.extent.width = 99999;
    this.tooltip.setText(text);
    const textSize = this.tooltip.getTextSize();
    const width = textSize.x + (this.padding * 2);
    const height = textSize.y + (this.padding * 2);
    const maxX = this.width - width;
    const maxY = this.height - height;
    x += 16;
    y += 16;
    this.tooltip.extent.width = width;
    this.tooltip.extent.height = height;
    this.tooltip.extent.left = Math.min(Math.max(0, x), maxX);
    this.tooltip.extent.top = Math.min(Math.max(0, y), maxY);
    this.tooltip.resizeControl();
    this.tooltip.widget.position.z = 5;
    this.recalculatePosition();
    this.show();
  }

  show() {
    super.show();
    this.width = GameState.ResolutionManager.getViewportWidth();
    this.height = GameState.ResolutionManager.getViewportHeight();
    this.tGuiPanel.extent.width = this.width;
    this.tGuiPanel.extent.height = this.height;
    this.recalculatePosition();
  }

  hideToolTip() {
    this.hide();
  }
  
}
