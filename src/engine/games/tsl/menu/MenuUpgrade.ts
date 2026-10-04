import type { GUIListBox, GUILabel, GUIButton } from "@engine/gui";
import { MenuUpgrade as K1_MenuUpgrade } from "@engine/games/kotor/menu/MenuUpgrade";
import { UpgradeCategory, getSlotCount, getSlotInfos } from "@engine/games/item-upgrade-utils";

/**
 * MenuUpgrade class — TSL upgrade_p with six lightsaber slots.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuUpgrade.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuUpgrade extends K1_MenuUpgrade {

  declare LB_ITEMS: GUIListBox;
  declare _3D_MODEL: GUILabel;
  declare _3D_MODEL_LS: GUILabel;
  declare LBL_UPGRADE33: GUILabel;
  declare LBL_UPGRADE31: GUILabel;
  declare LBL_UPGRADE32: GUILabel;
  declare BTN_UPGRADE33: GUIButton;
  declare BTN_UPGRADE31: GUIButton;
  declare BTN_UPGRADE32: GUIButton;
  declare LBL_PROPERTY: GUILabel;
  declare LBL_SLOTNAME: GUILabel;
  declare BTN_ASSEMBLE: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare BTN_BACK: GUIButton;
  declare LBL_UPGRADE31_LS: GUILabel;
  declare LBL_UPGRADE32_LS: GUILabel;
  declare LBL_UPGRADE33_LS: GUILabel;
  declare BTN_UPGRADE31_LS: GUIButton;
  declare BTN_UPGRADE32_LS: GUIButton;
  declare BTN_UPGRADE33_LS: GUIButton;
  declare LBL_UPGRADE34_LS: GUILabel;
  declare LBL_UPGRADE35_LS: GUILabel;
  declare LBL_UPGRADE36_LS: GUILabel;
  declare BTN_UPGRADE34_LS: GUIButton;
  declare BTN_UPGRADE35_LS: GUIButton;
  declare BTN_UPGRADE36_LS: GUIButton;
  declare LB_DESC: GUIListBox;
  declare BTN_OK: GUIButton;
  declare LBL_TITLE2: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'upgrade_p';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(false);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      const lsButtons = this.getLightsaberButtons();
      for(let i = 0; i < lsButtons.length; i++){
        const btn = lsButtons[i];
        if(!btn) continue;
        const slotIndex = i;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onSlotSelected(slotIndex);
        });
        btn.addEventListener('hover', () => this.onEnterSlot(slotIndex));
      }

      this.BTN_OK?.addEventListener('click', (e) => {
        e.stopPropagation();
        // Confirm the currently highlighted component list selection.
        const selected = (this.LB_ITEMS as any)?.selectedItem
          || (this.LB_ITEMS as any)?.activeItem;
        if(selected){
          this.onComponentSelected(selected);
        }
      });

      resolve();
    });
  }

  getLightsaberButtons(): GUIButton[] {
    return [
      this.BTN_UPGRADE31_LS,
      this.BTN_UPGRADE32_LS,
      this.BTN_UPGRADE33_LS,
      this.BTN_UPGRADE34_LS,
      this.BTN_UPGRADE35_LS,
      this.BTN_UPGRADE36_LS,
    ];
  }

  getLightsaberLabels(): GUILabel[] {
    return [
      this.LBL_UPGRADE31_LS,
      this.LBL_UPGRADE32_LS,
      this.LBL_UPGRADE33_LS,
      this.LBL_UPGRADE34_LS,
      this.LBL_UPGRADE35_LS,
      this.LBL_UPGRADE36_LS,
    ];
  }

  getSlotButtons(): GUIButton[] {
    if(this.category === UpgradeCategory.LIGHTSABER){
      return this.getLightsaberButtons();
    }
    return [this.BTN_UPGRADE31, this.BTN_UPGRADE32, this.BTN_UPGRADE33];
  }

  getSlotLabels(): GUILabel[] {
    if(this.category === UpgradeCategory.LIGHTSABER){
      return this.getLightsaberLabels();
    }
    return [this.LBL_UPGRADE31, this.LBL_UPGRADE32, this.LBL_UPGRADE33];
  }

  uiIndexToSlotIndex(uiIndex: number): number {
    return uiIndex;
  }

  showItems(showList: boolean) {
    this.showingComponentList = showList;
    const isLS = this.category === UpgradeCategory.LIGHTSABER;
    const slotCount = getSlotCount(this.category);
    const lsButtons = this.getLightsaberButtons();
    const lsLabels = this.getLightsaberLabels();
    const normalButtons = [this.BTN_UPGRADE31, this.BTN_UPGRADE32, this.BTN_UPGRADE33];
    const normalLabels = [this.LBL_UPGRADE31, this.LBL_UPGRADE32, this.LBL_UPGRADE33];

    const setVisible = (ctrl: any, visible: boolean) => {
      if(!ctrl) return;
      if(visible) ctrl.show?.(); else ctrl.hide?.();
    };

    if(showList){
      setVisible(this._3D_MODEL, false);
      setVisible(this._3D_MODEL_LS, false);
      setVisible(this.LBL_SLOTNAME, false);
      setVisible(this.LBL_PROPERTY, false);
      setVisible(this.BTN_ASSEMBLE, false);
      for(let i = 0; i < 6; i++){
        setVisible(lsButtons[i], false);
        setVisible(lsLabels[i], false);
      }
      for(let i = 0; i < 3; i++){
        setVisible(normalButtons[i], false);
        setVisible(normalLabels[i], false);
      }
      setVisible(this.LB_ITEMS, true);
      setVisible(this.BTN_OK, true);
      return;
    }

    setVisible(this.LB_ITEMS, false);
    setVisible(this.BTN_OK, false);
    setVisible(this.BTN_ASSEMBLE, true);
    setVisible(this.LB_DESC, true);

    if(isLS){
      setVisible(this._3D_MODEL, false);
      setVisible(this._3D_MODEL_LS, true);
      for(let i = 0; i < 3; i++){
        setVisible(normalButtons[i], false);
        setVisible(normalLabels[i], false);
      }
      for(let i = 0; i < 6; i++){
        setVisible(lsButtons[i], i < slotCount);
        setVisible(lsLabels[i], i < slotCount);
      }
    }else{
      setVisible(this._3D_MODEL, true);
      setVisible(this._3D_MODEL_LS, false);
      for(let i = 0; i < 6; i++){
        setVisible(lsButtons[i], false);
        setVisible(lsLabels[i], false);
      }
      for(let i = 0; i < 3; i++){
        setVisible(normalButtons[i], i < slotCount);
        setVisible(normalLabels[i], i < slotCount);
      }
    }

    // Keep slot infos referenced so tree-shaking / unused warnings stay quiet.
    void getSlotInfos(this.category);
    this.bind3DViewControl();
  }

}
