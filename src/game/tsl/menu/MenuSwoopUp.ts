import { GameMenu, LBL_3DView } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";
import { GameState } from "@/GameState";
import { PartyManager } from "@/managers/PartyManager";
import { InventoryManager } from "@/managers/InventoryManager";
import { MDLLoader, TextureLoader } from "@/loaders";
import type { ModuleItem } from "@/module/ModuleItem";
import { OdysseyModel } from "@/odyssey";
import type { TwoDAObject } from "@/resource/TwoDAObject";
import { OdysseyModel3D } from "@/three/odyssey";

interface SwoopUpgradeChoice {
  rowIndex: number;
  template: string;
  group: number;
  level: number;
  item?: ModuleItem;
  getName: () => string;
  getIcon: () => string;
  getStackSize: () => number;
}

/**
 * MenuSwoopUp class — TSL CSWGuiSwoopUpgrade (`swoopup_p` / swoopupgrade.2da).
 *
 * OnUpgradeSelected @ 005cfa50 returns prior slot item to inventory and consumes
 * the newly selected template (stack-- or RemoveItem).
 * OnAssemble @ 005cf980 writes selected 2DA row ids into PartyManager swoop slots.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuSwoopUp.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSwoopUp extends GameMenu {

  declare LB_DESC: GUIListBox;
  declare LB_DESC_LS: GUIListBox;
  declare _3D_MODEL: GUILabel;
  declare _3D_MODEL_LS: GUILabel;
  declare LB_ITEMS: GUIListBox;
  declare LBL_UPGRADE31: GUILabel;
  declare LBL_UPGRADE32: GUILabel;
  declare LBL_UPGRADE33: GUILabel;
  declare LBL_UPGRADE41: GUILabel;
  declare LBL_UPGRADE42: GUILabel;
  declare LBL_UPGRADE43: GUILabel;
  declare LBL_UPGRADE44: GUILabel;
  declare BTN_UPGRADE31: GUIButton;
  declare BTN_UPGRADE32: GUIButton;
  declare BTN_UPGRADE33: GUIButton;
  declare LBL_PROPERTY: GUILabel;
  declare LBL_SLOTNAME: GUILabel;
  declare LBL_LSSLOTNAME: GUILabel;
  declare LBL_UPGRADES: GUILabel;
  declare LBL_UPGRADE_COUNT: GUILabel;
  declare BTN_ASSEMBLE: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare LBL_DESCBG_LS: GUILabel;
  declare LBL_DESCBG: GUILabel;
  declare BTN_UPGRADE34: GUIButton;
  declare BTN_UPGRADE35: GUIButton;
  declare BTN_UPGRADE36: GUIButton;
  declare BTN_BACK: GUIButton;

  /** Pending 2DA row per slot (−1 = empty). Retail OnAssemble writes 6 slots. */
  slotRows: number[] = [-1, -1, -1, -1, -1, -1];
  /**
   * Items consumed this session for undo when changing selection
   * (OnUpgradeSelected returns prior item via AddItem).
   */
  slotConsumedTags: (string | undefined)[] = [
    undefined, undefined, undefined, undefined, undefined, undefined
  ];
  selectedSlot: number = 0;
  upgradeTable: TwoDAObject | undefined;
  choices: SwoopUpgradeChoice[] = [];
  /**
   * Retail CSWGui3DSceneView on `3D_MODEL` — ctor loads `gui3D_room` + `upgitem_light`
   * when g_bSWGuiSceneRenderEnabled (CSWGuiSwoopUpgrade @ 005cbe00).
   */
  _3dView: LBL_3DView;
  _3dViewRoom: OdysseyModel3D;
  _3dViewLight: OdysseyModel3D;

  constructor(){
    super();
    this.gui_resref = 'swoopup_p';
    this.background = '';
    this.voidFill = true;
  }

  getSlotButtons(): GUIButton[] {
    return [
      this.BTN_UPGRADE31,
      this.BTN_UPGRADE32,
      this.BTN_UPGRADE33,
      this.BTN_UPGRADE34,
      this.BTN_UPGRADE35,
      this.BTN_UPGRADE36,
    ].filter(Boolean);
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      const slots = this.getSlotButtons();
      for(let i = 0; i < slots.length; i++){
        const slot = i;
        slots[i].addEventListener('click', (e) => {
          e.stopPropagation();
          this.onSlotSelected(slot);
        });
      }

      if(this.LB_ITEMS){
        this.LB_ITEMS.setProtoBuilder?.(GUIInventoryItem);
        this.LB_ITEMS.onSelected = (node: any) => {
          this.onUpgradeSelected(node as SwoopUpgradeChoice);
        };
      }

      this.BTN_ASSEMBLE?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onAssemble();
      });

      this.BTN_BACK?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancelPanel();
      });
      this._button_b = this.BTN_BACK;

      this.init3DPreview().then(() => resolve()).catch(() => resolve());
    });
  }

  /**
   * Retail swoop ctor: CSWGuiScene on 3D_MODEL / 3D_MODEL_LS loads `gui3D_room`
   * then AddModel(`upgitem_light`). Camera from room camerahook (same as MainMenu).
   */
  async init3DPreview(){
    const lbl = this._3D_MODEL || this._3D_MODEL_LS;
    if(!lbl){ return; }

    this._3dView = new LBL_3DView();
    this._3dView.visible = true;
    if(lbl.extent?.width && lbl.extent?.height){
      this._3dView.camera.aspect = lbl.extent.width / lbl.extent.height;
      this._3dView.camera.updateProjectionMatrix();
    }
    this._3dView.setControl(lbl);
    if(this._3D_MODEL_LS && this._3D_MODEL_LS !== lbl){
      this._3D_MODEL_LS.setFillTexture?.(this._3dView.texture.texture);
    }

    try{
      const roomMdl: OdysseyModel = await MDLLoader.loader.load('gui3D_room');
      this._3dViewRoom = await OdysseyModel3D.FromMDL(roomMdl, { context: this._3dView });
      if(this._3dViewRoom.camerahook){
        this._3dView.camera.position.copy(this._3dViewRoom.camerahook.position);
        this._3dView.camera.quaternion.copy(this._3dViewRoom.camerahook.quaternion);
      }
      this._3dView.addModel(this._3dViewRoom);
    }catch(e){
      console.warn('MenuSwoopUp: failed to load gui3D_room', e);
    }

    try{
      const lightMdl: OdysseyModel = await MDLLoader.loader.load('upgitem_light');
      this._3dViewLight = await OdysseyModel3D.FromMDL(lightMdl, { context: this._3dView });
      this._3dView.addModel(this._3dViewLight);
    }catch(e){
      console.warn('MenuSwoopUp: failed to load upgitem_light', e);
    }

    await TextureLoader.LoadQueue().catch(() => {});
  }

  update(delta = 0){
    super.update(delta);
    this._3dView?.render?.(delta);
  }

  open() {
    this.loadUpgradeTable();
    for(let i = 0; i < 6; i++){
      this.slotRows[i] = PartyManager.getSwoopUpgradeSlot(i);
      this.slotConsumedTags[i] = undefined;
    }
    super.open();
  }

  show() {
    super.show();
    this.onSlotSelected(this.selectedSlot);
    this.updateUpgradeCount();
  }

  loadUpgradeTable(){
    this.upgradeTable =
      GameState.TwoDAManager?.datatables?.get('swoopupgrade') ||
      GameState.TwoDAManager?.datatables?.get('SwoopUpgrade');
  }

  onSlotSelected(slot: number){
    this.selectedSlot = slot;
    this.choices = this.collectChoicesForSlot(slot);
    if(this.LB_ITEMS){
      this.LB_ITEMS.setItems(this.choices);
    }
    this.setDescription(
      `Slot ${slot + 1}` +
      (this.slotRows[slot] >= 0 ? ` — row ${this.slotRows[slot]}` : ' — empty')
    );
  }

  /**
   * Retail OnSlotSelected: list inventory items whose tag matches swoopupgrade.2da
   * `template` for rows where `group` == slot (plus a clear/empty entry).
   */
  collectChoicesForSlot(slot: number): SwoopUpgradeChoice[] {
    const out: SwoopUpgradeChoice[] = [{
      rowIndex: -1,
      template: '',
      group: slot,
      level: 0,
      getName: () => '(None)',
      getIcon: () => '',
      getStackSize: () => 1,
    }];

    const table = this.upgradeTable;
    if(!table?.rows){ return out; }

    const keys = Object.keys(table.rows);
    for(let i = 0; i < keys.length; i++){
      const row = table.rows[keys[i]];
      if(!row){ continue; }
      const group = parseInt(row.group ?? row.Group ?? '-1', 10);
      if(group !== slot){ continue; }
      const template = String(row.template ?? row.Template ?? '')
        .replace(/\0[\s\S]*$/g, '')
        .toLowerCase();
      if(!template || template === '****'){ continue; }
      const owned = InventoryManager.getItemByTag(template);
      if(!owned){ continue; }
      const rowIndex = typeof row.__index === 'number'
        ? row.__index
        : parseInt(keys[i], 10);
      const level = parseInt(row.level ?? row.Level ?? '0', 10) || 0;
      out.push({
        rowIndex: Number.isFinite(rowIndex) ? rowIndex : i,
        template,
        group,
        level,
        item: owned,
        getName: () => owned.getName?.() || template,
        getIcon: () => owned.getIcon?.() || '',
        getStackSize: () => owned.getStackSize?.() || 1,
      });
    }
    return out;
  }

  /**
   * Retail OnUpgradeSelected @ 005cfa50 —
   * return prior consumed item to inventory, then consume newly selected (stack-- / RemoveItem).
   */
  onUpgradeSelected(choice: SwoopUpgradeChoice){
    if(!choice){ return; }
    const slot = this.selectedSlot;

    // Return previous session-consumed item for this slot.
    const prevTag = this.slotConsumedTags[slot];
    if(prevTag){
      this.returnConsumedTag(prevTag);
      this.slotConsumedTags[slot] = undefined;
    }

    if(choice.rowIndex < 0 || !choice.template){
      this.slotRows[slot] = -1;
      this.setDescription(`Slot ${slot + 1} cleared`);
      this.updateUpgradeCount();
      this.onSlotSelected(slot);
      return;
    }

    // Consume one from inventory (retail RemoveItem / stack--).
    const owned = choice.item || InventoryManager.getItemByTag(choice.template);
    if(owned){
      InventoryManager.removeItem(owned, 1);
      this.slotConsumedTags[slot] = choice.template;
    }
    this.slotRows[slot] = choice.rowIndex;
    this.setDescription(`${choice.getName()} → slot ${slot + 1}`);
    this.updateUpgradeCount();
    this.onSlotSelected(slot);
  }

  /** Re-add a previously consumed upgrade template tag to inventory. */
  returnConsumedTag(tag: string){
    if(!tag){ return; }
    const existing = InventoryManager.getItemByTag(tag);
    if(existing){
      existing.setStackSize((existing.getStackSize?.() || 1) + 1);
      return;
    }
    try{
      // ModuleItem accepts UTI ResRef string (same as creature equip load path).
      const item = new GameState.Module.ModuleArea.ModuleItem(tag);
      item.initProperties?.();
      item.setStackSize?.(1);
      InventoryManager.addItem(item);
    }catch(e){
      console.warn('MenuSwoopUp: failed to return upgrade item', tag, e);
    }
  }

  /**
   * Cancel without assemble — refund session-consumed upgrade items (retail BACK).
   */
  cancelPanel(){
    for(let i = 0; i < 6; i++){
      const tag = this.slotConsumedTags[i];
      if(tag){
        this.returnConsumedTag(tag);
        this.slotConsumedTags[i] = undefined;
      }
    }
    this.close();
  }

  /**
   * Retail OnAssemble @ 005cf980 — commit non-zero slot row ids to party swoop slots.
   */
  onAssemble(){
    for(let i = 0; i < 6; i++){
      if(this.slotRows[i] >= 0){
        PartyManager.setSwoopUpgradeSlot(i, this.slotRows[i]);
      }else{
        PartyManager.setSwoopUpgradeSlot?.(i, -1);
      }
    }
    // Consumed items stay removed; clear undo tags so close does not refund.
    for(let i = 0; i < 6; i++){
      this.slotConsumedTags[i] = undefined;
    }
    this.close();
  }

  updateUpgradeCount(){
    let n = 0;
    for(let i = 0; i < 6; i++){
      if(this.slotRows[i] >= 0){ n++; }
    }
    if(this.LBL_UPGRADE_COUNT?.setText){
      this.LBL_UPGRADE_COUNT.setText(String(n));
    }
  }

  setDescription(text: string){
    this.LB_DESC?.setItem?.(text || null);
  }

}
