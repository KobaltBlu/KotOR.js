import { GameEngineType } from "@core/enums/engine/GameEngineType";
import { GameState } from "@engine/runtime/GameState";
import { GameMenu, LBL_3DView } from "@engine/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@engine/gui";
import { GUIInventoryItem } from "@engine/gui/protoitem/GUIInventoryItem";
import { MDLLoader, TextureLoader } from "@engine/loaders";
import type { Item } from "@engine/module/Item";
import { OdysseyModel } from "@engine/odyssey";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import {
  UpgradeCategory,
  UpgradeSessionSlot,
  UpgradeComponentChoice,
  UpgradeItemSource,
  TLK_UPGRADES_LABEL,
  applyUpgradeBit,
  buildSessionSlots,
  getCrystalTemplate,
  getSlotCount,
  getSlotInfos,
  getUpgradableType,
  listCompatibleComponents,
  reserveInventoryUnit,
  returnInventoryUnit,
  tlk,
} from "@engine/games/item-upgrade-utils";

/**
 * MenuUpgrade class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuUpgrade.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuUpgrade extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_DESCBG_LS: GUILabel;
  LB_DESC_LS: GUIListBox;
  _3D_MODEL: GUILabel;
  _3D_MODEL_LS: GUILabel;
  LBL_UPGRADE31: GUILabel;
  LBL_UPGRADE32: GUILabel;
  LBL_UPGRADE33: GUILabel;
  LBL_UPGRADE41: GUILabel;
  LBL_UPGRADE42: GUILabel;
  LBL_UPGRADE43: GUILabel;
  LBL_UPGRADE44: GUILabel;
  BTN_UPGRADE31: GUIButton;
  BTN_UPGRADE32: GUIButton;
  BTN_UPGRADE33: GUIButton;
  BTN_UPGRADE41: GUIButton;
  BTN_UPGRADE42: GUIButton;
  BTN_UPGRADE43: GUIButton;
  BTN_UPGRADE44: GUIButton;
  LBL_PROPERTY: GUILabel;
  LBL_SLOTNAME: GUILabel;
  LBL_LSSLOTNAME: GUILabel;
  LBL_UPGRADES: GUILabel;
  LBL_UPGRADE_COUNT: GUILabel;
  BTN_ASSEMBLE: GUIButton;
  LBL_TITLE: GUILabel;
  LBL_DESCBG: GUILabel;
  LB_DESC: GUIListBox;
  BTN_BACK: GUIButton;

  category: UpgradeCategory = UpgradeCategory.NONE;
  source: UpgradeItemSource;
  /** Working copy of the item being upgraded. */
  workingItem: Item;
  slots: UpgradeSessionSlot[] = [];
  /** Components taken from inventory during this session (returned on cancel). */
  reservedComponents: Item[] = [];
  /** Components that were installed at open and removed during editing. */
  returnedToInventory: Item[] = [];
  selectedSlotIndex: number = -1;
  showingComponentList: boolean = false;
  componentChoices: UpgradeComponentChoice[] = [];
  originalUpgrades: number = 0;
  originalSlots: number[] = [];
  originalTag: string = '';
  pendingCrystalTemplate: string = '';

  /** on 3D_MODEL / 3D_MODEL_LS. */
  _3dView: LBL_3DView;
  _3dViewRoom: OdysseyModel3D;
  _3dViewLight: OdysseyModel3D;
  _3dViewItem: OdysseyModel3D;

  constructor(){
    super();
    this.gui_resref = 'upgrade';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
      this.LB_ITEMS.onSelected = (node: any) => {
        this.onComponentSelected(node);
      };

      const slot3 = [this.BTN_UPGRADE31, this.BTN_UPGRADE32, this.BTN_UPGRADE33];
      const slot4 = [this.BTN_UPGRADE41, this.BTN_UPGRADE42, this.BTN_UPGRADE43, this.BTN_UPGRADE44];
      for(let i = 0; i < slot3.length; i++){
        const btn = slot3[i];
        if(!btn) continue;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onSlotSelected(i);
        });
        btn.addEventListener('hover', () => this.onEnterSlot(i));
      }
      for(let i = 0; i < slot4.length; i++){
        const btn = slot4[i];
        if(!btn) continue;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onSlotSelected(i);
        });
        btn.addEventListener('hover', () => this.onEnterSlot(i));
      }

      this.BTN_ASSEMBLE.addEventListener('click', (e) => {
        e.stopPropagation();
        this.assemble();
      });
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancelPanel();
      });
      this._button_b = this.BTN_BACK;

      this.init3DPreview().then(() => resolve()).catch(() => resolve());
    });
  }

  /**
   * ctor — both 3D_MODEL scenes load `gui3D_room` + `upgitem_light`.
   */
  async init3DPreview(){
    const lbl = this._3D_MODEL || this._3D_MODEL_LS;
    if(!lbl){ return; }

    this._3dView = new LBL_3DView();
    this._3dView.visible = true;
    // Update3DView FOV ≈ 22.72; LBL_3DView default matches.
    this._3dView.camera.fov = 22.72;
    if(lbl.extent?.width && lbl.extent?.height){
      this._3dView.camera.aspect = lbl.extent.width / lbl.extent.height;
    }
    this._3dView.camera.updateProjectionMatrix();
    this.bind3DViewControl();

    try{
      const roomMdl: OdysseyModel = await MDLLoader.loader.load('gui3D_room');
      this._3dViewRoom = await OdysseyModel3D.FromMDL(roomMdl, { context: this._3dView });
      this._3dView.addModel(this._3dViewRoom);
    }catch(e){
      console.warn('MenuUpgrade: failed to load gui3D_room', e);
    }

    try{
      const lightMdl: OdysseyModel = await MDLLoader.loader.load('upgitem_light');
      this._3dViewLight = await OdysseyModel3D.FromMDL(lightMdl, { context: this._3dView });
      this._3dView.addModel(this._3dViewLight);
    }catch(e){
      console.warn('MenuUpgrade: failed to load upgitem_light', e);
    }

    await TextureLoader.LoadQueue().catch(() => {});
  }

  /** Point the shared GuiScene at the visible 3D_MODEL / 3D_MODEL_LS label. */
  bind3DViewControl(){
    if(!this._3dView){ return; }
    const isLS = this.category === UpgradeCategory.LIGHTSABER;
    const lbl = (isLS ? this._3D_MODEL_LS : this._3D_MODEL) || this._3D_MODEL || this._3D_MODEL_LS;
    if(!lbl){ return; }
    this._3dView.setControl(lbl);
    const other = isLS ? this._3D_MODEL : this._3D_MODEL_LS;
    if(other && other !== lbl){
      other.setFillTexture?.(this._3dView.texture.texture);
    }
  }

  /**
   * GetArmorModelAndTextureResRef
   * appearance.2da row 0x89, columns Model{A–N} / TEX{A–N} from clamped model
   * variation; texture gets `%02d` textureVariation with Exists fallbacks.
   */
  static getArmorModelAndTextureResRef(
    modelVariation: number,
    textureVariation: number
  ): { model: string; texture: string } {
    let modelVar = modelVariation | 0;
    if(modelVar < 1){ modelVar = 1; }
    else if(modelVar > 0xe){ modelVar = 0xe; }
    let texVar = textureVariation | 0;
    if(texVar < 1){ texVar = 1; }

    const letter = String.fromCharCode(0x40 + modelVar); // A..N
    const appearance = GameState.TwoDAManager?.datatables?.get('appearance');
    const row = appearance?.getRowByIndex?.(0x89);
    if(!row){
      return { model: '', texture: '' };
    }

    const modelCol = `model${letter.toLowerCase()}`;
    const modelColAlt = `Model${letter}`;
    const texCol = `tex${letter.toLowerCase()}`;
    const texColAlt = `TEX${letter}`;

    let model = String(row[modelCol] ?? row[modelColAlt] ?? '').replace(/\0[\s\S]*$/g, '').trim();
    let texture = String(row[texCol] ?? row[texColAlt] ?? '').replace(/\0[\s\S]*$/g, '').trim();
    if(!model || model === '****'){
      model = '';
    }
    if(!texture || texture === '****'){
      texture = '';
    }else{
      texture = `${texture}${texVar < 10 ? '0' : ''}${texVar}`;
    }
    return { model, texture };
  }

  /**
   * Update3DView (Aspyr)
   * RemoveModel item, AddModel from GetModelResRef / armor path, camera on
   * camerahook{itemType}, parent to rotatehook{itemType}, play rotate / powered.
   * itemType = baseitem (baseitems.2da itemtype); specials 0+baseId1 → 0a,
   * 4+baseId0x14 → 4a, itemType 0x24..0x26 → hook 31; missing node falls back to camerahook.
   */
  async update3DView(){
    if(!this._3dView || !this.workingItem){ return; }
    this.bind3DViewControl();

    if(this._3dViewItem){
      this._3dViewItem.parent?.remove?.(this._3dViewItem);
      this._3dView.removeModel(this._3dViewItem);
      this._3dViewItem = undefined;
    }

    const base = this.workingItem.getBaseItem?.() || this.workingItem.baseItem;
    // Format("camerahook%d", *(baseitem)) — itemtype column.
    const itemType = base?.itemType ?? 0;
    const baseId = this.workingItem.getBaseItemId?.() ?? this.workingItem.baseItemId ?? 0;

    let camHook = `camerahook${itemType}`;
    let rotHook = `rotatehook${itemType}`;
    // switch on *(baseitem) with baseId (item) specials:
    if(itemType === 0 && baseId === 1){
      camHook = 'camerahook0a';
      rotHook = 'rotatehook0a';
    }else if(itemType === 4 && baseId === 0x14){
      camHook = 'camerahook4a';
      rotHook = 'rotatehook4a';
    }else if(itemType === 0x24 || itemType === 0x25 || itemType === 0x26){
      camHook = 'camerahook31';
      rotHook = 'rotatehook31';
    }

    const room = this._3dViewRoom;
    if(room){
      const camNode =
        room.nodes?.get?.(camHook) ||
        (camHook !== 'camerahook' ? room.nodes?.get?.('camerahook') : undefined) ||
        room.camerahook;
      if(camNode){
        camNode.updateWorldMatrix?.(true, false);
        if(camNode.matrixWorld){
          this._3dView.camera.position.setFromMatrixPosition(camNode.matrixWorld);
          this._3dView.camera.quaternion.setFromRotationMatrix(camNode.matrixWorld);
        }else{
          this._3dView.camera.position.copy(camNode.position);
          this._3dView.camera.quaternion.copy(camNode.quaternion);
        }
        this._3dView.camera.updateProjectionMatrix();
      }
    }

    try{
      this.workingItem.context = this._3dView as any;
      let itemModel: OdysseyModel3D | undefined;

      if(this.category === UpgradeCategory.ARMOR){
        const armor = MenuUpgrade.getArmorModelAndTextureResRef(
          this.workingItem.getModelVariation?.() ?? 1,
          this.workingItem.getTextureVariation?.() ?? 1
        );
        if(armor.model){
          try{
            const mdl: OdysseyModel = await MDLLoader.loader.load(armor.model);
            itemModel = await OdysseyModel3D.FromMDL(mdl, {
              context: this._3dView,
              lighting: true,
              textureVar: armor.texture || '****',
            });
          }catch(e){
            console.warn('MenuUpgrade: armor appearance model failed, falling back', e);
          }
        }
      }

      if(!itemModel){
        itemModel = await this.workingItem.loadModel();
      }
      if(!itemModel){ return; }
      this._3dViewItem = itemModel;

      const rotNode = room?.nodes?.get?.(rotHook);
      if(rotNode){
        rotNode.add(itemModel);
        room.playAnimation?.('rotate', true);
        room.update?.(1.0);
      }else{
        this._3dView.addModel(itemModel);
      }

      if(base?.poweredItem){
        itemModel.playAnimation?.('powered', true);
      }
      if(this.category === UpgradeCategory.ARMOR){
        itemModel.playAnimation?.('neutral', true);
      }
      itemModel.update?.(1.0);

      await TextureLoader.LoadQueue().catch(() => {});
    }catch(e){
      console.warn('MenuUpgrade: Update3DView failed', e);
    }
  }

  update(delta = 0){
    super.update(delta);
    this._3dView?.render?.(delta);
  }

  openWithItem(source: UpgradeItemSource, category?: UpgradeCategory) {
    this.source = source;
    this.category = category && category !== UpgradeCategory.NONE
      ? category
      : getUpgradableType(source.item);
    if(this.category === UpgradeCategory.NONE || !source?.item){
      return;
    }

    // Detach one unit of the item for the upgrade session (SplitItem
    // when stacked; otherwise remove from party repository / equipment).
    let working = source.item;
    if(source.equipped && source.creature && source.equipSlot){
      source.creature.unequipSlot(source.equipSlot);
      // unequip returns item to inventory; pull one unit out for editing.
      if((working.getStackSize?.() || 1) > 1){
        working = working.clone();
        source.item.setStackSize(source.item.getStackSize() - 1);
        source.item = working;
      }else{
        GameState.InventoryManager.removeItem(working);
      }
    }else if(GameState.InventoryManager.inventory.indexOf(working) >= 0){
      if((working.getStackSize?.() || 1) > 1){
        working = working.clone();
        source.item.setStackSize(source.item.getStackSize() - 1);
        source.item = working;
      }else{
        GameState.InventoryManager.removeItem(working);
      }
    }

    this.workingItem = working;
    this.originalUpgrades = source.item.upgrades || 0;
    this.originalSlots = [];
    for(let i = 0; i < 6; i++) this.originalSlots.push(source.item.getUpgradeSlot(i));
    this.originalTag = source.item.getTag?.() || '';
    this.pendingCrystalTemplate = '';
    this.reservedComponents = [];
    this.returnedToInventory = [];
    this.selectedSlotIndex = -1;
    this.showingComponentList = false;
    this.slots = buildSessionSlots(this.workingItem, this.category);

    this.open();
  }

  open() {
    super.open();
  }

  show() {
    super.show();
    this.showItems(false);
    this.updateSlotIcons();
    this.setDescription(this.workingItem?.getDescription?.() || '');
    this.BTN_ASSEMBLE.disableSelection = false;
    void this.update3DView();
  }

  getSlotButtons(): GUIButton[] {
    if(this.category === UpgradeCategory.LIGHTSABER || this.category === UpgradeCategory.MELEE){
      return [this.BTN_UPGRADE31, this.BTN_UPGRADE32, this.BTN_UPGRADE33];
    }
    return [this.BTN_UPGRADE41, this.BTN_UPGRADE42, this.BTN_UPGRADE43, this.BTN_UPGRADE44];
  }

  getSlotLabels(): GUILabel[] {
    if(this.category === UpgradeCategory.LIGHTSABER || this.category === UpgradeCategory.MELEE){
      return [this.LBL_UPGRADE31, this.LBL_UPGRADE32, this.LBL_UPGRADE33];
    }
    return [this.LBL_UPGRADE41, this.LBL_UPGRADE42, this.LBL_UPGRADE43, this.LBL_UPGRADE44];
  }

  /** ShowItems(showList). */
  showItems(showList: boolean) {
    this.showingComponentList = showList;
    const isLS = this.category === UpgradeCategory.LIGHTSABER;
    const slotCount = getSlotCount(this.category);
    const buttons3 = [this.BTN_UPGRADE31, this.BTN_UPGRADE32, this.BTN_UPGRADE33];
    const labels3 = [this.LBL_UPGRADE31, this.LBL_UPGRADE32, this.LBL_UPGRADE33];
    const buttons4 = [this.BTN_UPGRADE41, this.BTN_UPGRADE42, this.BTN_UPGRADE43, this.BTN_UPGRADE44];
    const labels4 = [this.LBL_UPGRADE41, this.LBL_UPGRADE42, this.LBL_UPGRADE43, this.LBL_UPGRADE44];

    const setVisible = (ctrl: any, visible: boolean) => {
      if(!ctrl) return;
      if(visible) ctrl.show?.(); else ctrl.hide?.();
    };

    if(showList){
      setVisible(this._3D_MODEL, false);
      setVisible(this._3D_MODEL_LS, false);
      setVisible(this.LBL_SLOTNAME, false);
      setVisible(this.LBL_LSSLOTNAME, false);
      setVisible(this.LBL_UPGRADE_COUNT, false);
      setVisible(this.LBL_UPGRADES, false);
      setVisible(this.LBL_PROPERTY, false);
      setVisible(this.BTN_ASSEMBLE, false);
      for(let i = 0; i < 4; i++){
        setVisible(buttons4[i], false);
        setVisible(labels4[i], false);
        if(i < 3){
          setVisible(buttons3[i], false);
          setVisible(labels3[i], false);
        }
      }
      setVisible(this.LB_ITEMS, true);
      return;
    }

    setVisible(this.LB_ITEMS, false);
    setVisible(this.BTN_ASSEMBLE, true);

    if(isLS){
      setVisible(this._3D_MODEL, false);
      setVisible(this._3D_MODEL_LS, true);
      setVisible(this.LBL_SLOTNAME, false);
      setVisible(this.LBL_LSSLOTNAME, true);
      setVisible(this.LBL_UPGRADE_COUNT, false);
      setVisible(this.LBL_UPGRADES, false);
      setVisible(this.LBL_PROPERTY, false);
      setVisible(this.LBL_DESCBG, false);
      setVisible(this.LB_DESC, false);
      setVisible(this.LBL_DESCBG_LS, true);
      setVisible(this.LB_DESC_LS, true);
      for(let i = 0; i < 4; i++){
        setVisible(buttons4[i], false);
        setVisible(labels4[i], false);
      }
      for(let i = 0; i < 3; i++){
        setVisible(buttons3[i], i < slotCount);
        setVisible(labels3[i], i < slotCount);
      }
    }else{
      setVisible(this._3D_MODEL, true);
      setVisible(this._3D_MODEL_LS, false);
      setVisible(this.LBL_SLOTNAME, true);
      setVisible(this.LBL_LSSLOTNAME, false);
      setVisible(this.LBL_UPGRADE_COUNT, true);
      setVisible(this.LBL_UPGRADES, true);
      setVisible(this.LBL_PROPERTY, true);
      setVisible(this.LBL_DESCBG, true);
      setVisible(this.LB_DESC, true);
      setVisible(this.LBL_DESCBG_LS, false);
      setVisible(this.LB_DESC_LS, false);
      for(let i = 0; i < 3; i++){
        setVisible(buttons3[i], false);
        setVisible(labels3[i], false);
      }
      if(this.category === UpgradeCategory.ARMOR){
        // shows slots 1 and 2 of the 4-button group.
        for(let i = 0; i < 4; i++){
          const visible = (i === 1 || i === 2);
          setVisible(buttons4[i], visible);
          setVisible(labels4[i], visible);
        }
      }else if(this.category === UpgradeCategory.MELEE){
        for(let i = 0; i < 4; i++){
          setVisible(buttons4[i], false);
          setVisible(labels4[i], false);
        }
        for(let i = 0; i < 3; i++){
          setVisible(buttons3[i], i < slotCount);
          setVisible(labels3[i], i < slotCount);
        }
      }else{
        for(let i = 0; i < 4; i++){
          setVisible(buttons4[i], i < slotCount);
          setVisible(labels4[i], i < slotCount);
        }
      }
    }

    this.bind3DViewControl();
  }

  /** Map UI button index to session slot index (armor uses buttons 1,2). */
  uiIndexToSlotIndex(uiIndex: number): number {
    if(this.category === UpgradeCategory.ARMOR){
      if(uiIndex === 1) return 0;
      if(uiIndex === 2) return 1;
      return -1;
    }
    return uiIndex;
  }

  onSlotSelected(uiIndex: number) {
    const slotIndex = this.uiIndexToSlotIndex(uiIndex);
    if(slotIndex < 0 || slotIndex >= this.slots.length) return;

    if(this.showingComponentList){
      return;
    }

    // Toggle-off if already filled (removes installed upgrade on second click for non-list path).
    // Prefer opening the component list so the player can choose.
    this.selectedSlotIndex = slotIndex;
    this.componentChoices = listCompatibleComponents(
      this.workingItem,
      this.category,
      slotIndex,
      this.slots
    );

    // Build list nodes: Item instances or GUIInventoryItem-compatible stubs.
    const nodes: any[] = this.componentChoices.map((choice, idx) => {
      if(choice.item){
        (choice.item as any).__upgradeChoiceIndex = idx;
        return choice.item;
      }
      return {
        __upgradeChoiceIndex: idx,
        getName: () => choice.isRemove ? ' ' : (choice.label || ' '),
        getIcon: () => '',
        getDescription: () => '',
        getStackSize: () => 1,
      };
    });

    this.LB_ITEMS.setItems(nodes);
    this.showItems(true);
  }

  onEnterSlot(uiIndex: number) {
    const slotIndex = this.uiIndexToSlotIndex(uiIndex);
    if(slotIndex < 0 || slotIndex >= this.slots.length) return;
    const slot = this.slots[slotIndex];
    const isLS = this.category === UpgradeCategory.LIGHTSABER;
    const name = tlk(slot.info.nameStrRef);
    if(isLS){
      if(slot.component){
        this.LBL_LSSLOTNAME?.setText(slot.component.getName?.() || name);
      }else{
        this.LBL_LSSLOTNAME?.setText(name);
      }
      return;
    }

    this.LBL_SLOTNAME?.setText(name);
    this.LBL_UPGRADES?.setText(tlk(TLK_UPGRADES_LABEL));
    const inv = slot.templateTag
      ? GameState.InventoryManager.getItemByTag(slot.templateTag)
      : false;
    const count = inv && inv !== false ? (inv as Item).getStackSize?.() || 0 : 0;
    this.LBL_UPGRADE_COUNT?.setText(String(count));
    this.LBL_PROPERTY?.setText(slot.component?.getName?.() || '');
  }

  onComponentSelected(node: any) {
    const choiceIndex = node?.__upgradeChoiceIndex;
    if(typeof choiceIndex !== 'number') return;
    const choice = this.componentChoices[choiceIndex];
    if(!choice || this.selectedSlotIndex < 0) return;

    const slot = this.slots[this.selectedSlotIndex];
    if(!slot) return;

    // Return previously reserved component for this slot.
    if(slot.component && this.reservedComponents.indexOf(slot.component) >= 0){
      returnInventoryUnit(slot.component);
      this.reservedComponents = this.reservedComponents.filter(c => c !== slot.component);
    }

    if(choice.isRemove){
      if(slot.upgradeRow >= 0 && !slot.info.isCrystal){
        applyUpgradeBit(this.workingItem, slot.upgradeRow, false);
        if(GameState.GameKey === GameEngineType.TSL){
          this.workingItem.setUpgradeSlot(this.selectedSlotIndex, -1);
        }
      }
      slot.component = undefined;
      slot.upgradeRow = -1;
    }else if(slot.info.isCrystal){
      if(choice.rowIndex >= 0 && choice.item){
        const reserved = reserveInventoryUnit(choice.item);
        if(reserved){
          this.reservedComponents.push(reserved);
        }
        this.pendingCrystalTemplate = getCrystalTemplate(choice.rowIndex, this.workingItem);
        slot.upgradeRow = choice.rowIndex;
        slot.component = reserved || choice.item;
      }
    }else{
      if(choice.item && choice.rowIndex >= 0){
        const reserved = reserveInventoryUnit(choice.item);
        if(reserved){
          this.reservedComponents.push(reserved);
          slot.component = reserved;
        }else{
          slot.component = choice.item;
        }
        if(slot.upgradeRow >= 0){
          applyUpgradeBit(this.workingItem, slot.upgradeRow, false);
        }
        slot.upgradeRow = choice.rowIndex;
        applyUpgradeBit(this.workingItem, choice.rowIndex, true);
        if(GameState.GameKey === GameEngineType.TSL){
          this.workingItem.setUpgradeSlot(this.selectedSlotIndex, choice.rowIndex);
        }
      }
    }

    this.showItems(false);
    this.updateSlotIcons();
    this.setDescription(this.workingItem?.getDescription?.() || '');
    this.onEnterSlot(this.selectedSlotIndex);
  }

  updateSlotIcons() {
    const labels = this.getSlotLabels();
    const buttons = this.getSlotButtons();
    const infos = getSlotInfos(this.category);

    for(let ui = 0; ui < buttons.length; ui++){
      const slotIndex = this.uiIndexToSlotIndex(ui);
      const btn = buttons[ui];
      const lbl = labels[ui];
      if(slotIndex < 0 || slotIndex >= this.slots.length){
        continue;
      }
      const slot = this.slots[slotIndex];
      const icon = slot.component?.getIcon?.() || infos[slotIndex]?.emptyIcon || '';
      if(btn && icon){
        btn.setFillTextureName?.(icon);
      }
      if(lbl && icon){
        lbl.setFillTextureName?.(icon);
      }
    }
  }

  setDescription(text: string) {
    const isLS = this.category === UpgradeCategory.LIGHTSABER;
    if(isLS){
      this.LB_DESC_LS?.setItem?.(text || null);
    }else{
      this.LB_DESC?.setItem?.(text || null);
    }
  }

  assemble() {
    if(!this.workingItem || !this.source) return;

    // Crystal replacement: load new template while preserving upgrade bits/slots.
    if(this.pendingCrystalTemplate && this.pendingCrystalTemplate !== this.originalTag){
      const ModuleItemClass = GameState.Module?.Area?.Item;
      const replacement = ModuleItemClass?.FromResRef?.(this.pendingCrystalTemplate);
      if(replacement){
        replacement.copyUpgradeStateFrom(this.workingItem);
        replacement.upgrades = this.workingItem.upgrades;
        // Destroy / abandon old working item identity; use replacement going forward.
        this.workingItem = replacement;
        this.source.item = replacement;
      }
    }

    // Commit: put upgraded item back into inventory or equipment.
    if(this.source.equipped && this.source.creature && this.source.equipSlot){
      this.source.creature.equipItem(this.source.equipSlot, this.workingItem);
    }else{
      GameState.InventoryManager.addItem(this.workingItem);
    }

    // Reserved components stay consumed; clear tracking.
    this.reservedComponents = [];
    this.returnedToInventory = [];
    this.close();

    // Refresh item list if parent is open.
    if(GameState.MenuManager.MenuUpgradeItems?.bVisible){
      GameState.MenuManager.MenuUpgradeItems.open();
    }
  }

  cancelPanel() {
    // Restore original upgrade state.
    if(this.workingItem){
      this.workingItem.upgrades = this.originalUpgrades;
      for(let i = 0; i < 6; i++){
        this.workingItem.setUpgradeSlot(i, this.originalSlots[i] ?? -1);
      }
    }

    // Return reserved components.
    for(let i = 0; i < this.reservedComponents.length; i++){
      returnInventoryUnit(this.reservedComponents[i]);
    }
    this.reservedComponents = [];

    // Put the original item back.
    if(this.source?.item){
      if(this.source.equipped && this.source.creature && this.source.equipSlot){
        this.source.creature.equipItem(this.source.equipSlot, this.source.item);
      }else if(GameState.InventoryManager.inventory.indexOf(this.source.item) < 0){
        GameState.InventoryManager.addItem(this.source.item);
      }
    }

    this.close();
  }

  close() {
    this.showingComponentList = false;
    this.selectedSlotIndex = -1;
    this.componentChoices = [];
    super.close();
  }

}
