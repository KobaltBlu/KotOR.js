import { GameState } from "@/GameState";
import { GameMenu, GUIControl } from "@/gui";
import type { GUILabel, GUIButton, GUICheckBox } from "@/gui";
import { KEYManager } from "@/managers/KEYManager";
import { TextureLoader } from "@/loaders";
import { ModuleCreature } from "@/module";
import { NWScript } from "@/nwscript/NWScript";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { ResourceTypes } from "@/resource/ResourceTypes";
import * as THREE from "three";

const TLK_REMOVE = 38456;
const TLK_ADD = 38455;
const TLK_LEVEL = 0x7d9a;
const TLK_CONFIRM_PARTY = 0x95b8;
const TLK_CONFIRM_PARTY_SINGLE = 0x95b9;
const TLK_DENY_MODIFY = 0x1a78a;
const TLK_DENY_SELECT = 0xa588;
const TLK_DENY_REMOVE = 0x1a789;
const TLK_DENY_FORCED = 0xa5a6;

interface PartySlotState {
  pendingSelected: boolean;
  /** Index in active party when menu opened; -1 if not in party. */
  partyIndex: number;
  forced: boolean;
  /** Retail selectable bit — cleared for forced slots while panel is open. */
  canToggle: boolean;
}

/**
 * MenuPartySelection class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * Retail CSWGuiPartySelection (partyselection): pending portrait toggles,
 * commit on Done, hover name/level + LBL_3D portrait fill.
 *
 * @file MenuPartySelection.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPartySelection extends GameMenu {

  LBL_CHAR8: GUILabel;
  LBL_CHAR7: GUILabel;
  LBL_CHAR6: GUILabel;
  LBL_CHAR3: GUILabel;
  LBL_CHAR4: GUILabel;
  LBL_CHAR5: GUILabel;
  LBL_CHAR2: GUILabel;
  LBL_CHAR1: GUILabel;
  LBL_CHAR0: GUILabel;
  BTN_NPC0: GUICheckBox;
  BTN_NPC1: GUICheckBox;
  BTN_NPC2: GUICheckBox;
  BTN_NPC3: GUICheckBox;
  BTN_NPC4: GUICheckBox;
  BTN_NPC5: GUICheckBox;
  BTN_NPC6: GUICheckBox;
  BTN_NPC7: GUICheckBox;
  BTN_NPC8: GUICheckBox;
  LBL_NA8: GUILabel;
  LBL_NA5: GUILabel;
  LBL_NA2: GUILabel;
  LBL_NA6: GUILabel;
  LBL_NA3: GUILabel;
  LBL_NA0: GUILabel;
  LBL_NA1: GUILabel;
  LBL_NA4: GUILabel;
  LBL_NA7: GUILabel;
  LBL_3D: GUILabel;
  LBL_TITLE: GUILabel;
  LBL_AVAILABLE: GUILabel;
  LBL_COUNT: GUILabel;
  LBL_BEVEL_M: GUILabel;
  LBL_NPC_NAME: GUILabel;
  LBL_NPC_LEVEL: GUILabel;
  LBL_BEVEL_R: GUILabel;
  LBL_BEVEL_L: GUILabel;
  BTN_DONE: GUIButton;
  BTN_BACK: GUIButton;
  BTN_ACCEPT: GUIButton;

  ignoreUnescapable = false;
  requireAccept = false;
  allowCancel = false;
  forceNPC1 = -1;
  forceNPC2 = -1;

  selectedNPC: number = -1;
  selectedCount = 0;
  canModify = true;
  denyModifyStrRef = TLK_DENY_MODIFY;
  scriptName: string;
  onCloseScript: NWScriptInstance;

  slotState: PartySlotState[] = [];

  constructor(){
    super();
    this.gui_resref = 'partyselection';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      for(let i = 0; i < 9; i++){
        this.wireNpcButton(i);
      }

      this.BTN_DONE.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onDone();
      });

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onBack();
      });

      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onToggleFocused();
      });
      resolve();
    });
  }

  protected wireNpcButton(npcId: number){
    const btn = this.getControlByName('BTN_NPC' + npcId);
    if(!(btn instanceof GUIControl)) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(GameState.PartyManager.IsAvailable(npcId)){
        this.onToggleNpc(npcId);
      }
    });
    btn.addEventListener('hover', () => {
      if(GameState.PartyManager.IsAvailable(npcId)){
        this.onEnterNPC(npcId);
      }else{
        this.onEnterUnavailable();
      }
    });
  }

  hide() {
    super.hide();
    this.ignoreUnescapable = false;
    this.requireAccept = false;
    this.allowCancel = false;
  }

  /**
   * Opens the menu.
   * @param scriptName - Exit script resref.
   * @param forceNPC1 - Forced NPC id (-1 none).
   * @param forceNPC2 - Forced NPC id (-1 none).
   * @param allowCancel - K2: allow Back when script-opened.
   * @param requireAccept - Retail script-open flag (Done commit / confirm rules).
   */
  open(scriptName = '', forceNPC1 = -1, forceNPC2 = -1, allowCancel = 0, requireAccept = false) {
    this.scriptName = scriptName;
    this.forceNPC1 = forceNPC1;
    this.forceNPC2 = forceNPC2;
    this.allowCancel = !!allowCancel;
    this.requireAccept = !!requireAccept;
    // Script opens always ignore area unescapable (set before show).
    if(this.requireAccept){
      this.ignoreUnescapable = true;
    }
    super.open();
  }

  async show() {
    super.show();
    const hasForced = this.forceNPC1 > -1 || this.forceNPC2 > -1;
    this.initSlotState(hasForced);
    this.updateCanModify();
    this.updateBackButton(hasForced);
    this.selectedCount = this.countPendingSelected();
    await this.initPortraits();
    this.updateCount();
    this.updateSelectionHighlight();

    const firstAvailable = this.findFirstAvailableNPC();
    this.selectedNPC = firstAvailable;
    if(firstAvailable > -1){
      await this.onEnterNPC(firstAvailable);
    }else{
      this.onEnterUnavailable();
    }

    TextureLoader.LoadQueue();
    this.onCloseScript = (this.scriptName != '' && this.scriptName != null)
      ? NWScript.Load(this.scriptName)
      : undefined;
  }

  protected initSlotState(hasForced: boolean){
    const max = GameState.PartyManager.MaxPartyCount;
    this.slotState = [];
    for(let i = 0; i < max; i++){
      const inParty = GameState.PartyManager.IsNPCInParty(i);
      let partyIndex = -1;
      if(inParty){
        partyIndex = GameState.PartyManager.CurrentMembers.findIndex((cm) => cm.memberID == i);
      }
      const forced = (this.forceNPC1 == i || this.forceNPC2 == i);
      this.slotState[i] = {
        pendingSelected: false,
        partyIndex,
        forced,
        canToggle: GameState.PartyManager.IsSelectable(i),
      };
    }

    if(!hasForced){
      this.selectedCount = GameState.PartyManager.CurrentMembers.length;
      for(let i = 0; i < max; i++){
        if(GameState.PartyManager.IsNPCInParty(i)){
          this.slotState[i].pendingSelected = true;
        }
      }
    }else{
      this.selectedCount = 0;
      for(let i = 0; i < max; i++){
        if(this.slotState[i].forced){
          this.slotState[i].pendingSelected = true;
          this.slotState[i].canToggle = false;
          this.selectedCount++;
        }
      }
    }
  }

  protected updateCanModify(){
    const unescapable = !!GameState.module?.area?.unescapable;
    this.canModify = !unescapable || this.ignoreUnescapable || this.requireAccept;
    this.denyModifyStrRef = TLK_DENY_MODIFY;
  }

  protected updateBackButton(hasForced: boolean){
    const showBack = (!hasForced && !this.requireAccept) || this.allowCancel;
    if(showBack){
      this.BTN_BACK.show();
    }else{
      this.BTN_BACK.hide();
    }
  }

  protected findFirstAvailableNPC(): number {
    for(let i = 0; i < GameState.PartyManager.MaxPartyCount; i++){
      if(GameState.PartyManager.IsAvailable(i)) return i;
    }
    return -1;
  }

  protected countPendingSelected(): number {
    let n = 0;
    for(let i = 0; i < this.slotState.length; i++){
      if(this.slotState[i]?.pendingSelected) n++;
    }
    return n;
  }

  protected countAvailableSelectable(): number {
    let n = 0;
    for(let i = 0; i < this.slotState.length; i++){
      if(GameState.PartyManager.IsAvailable(i) && this.slotState[i]?.canToggle) n++;
    }
    return n;
  }

  protected countForced(): number {
    let n = 0;
    for(let i = 0; i < this.slotState.length; i++){
      if(this.slotState[i]?.forced) n++;
    }
    return n;
  }

  protected isValidNpc(npcId: number): boolean {
    return npcId >= 0 && npcId < GameState.PartyManager.MaxPartyCount;
  }

  /**
   * Hover / focus an NPC slot — updates name, level, preview, Accept label.
   */
  async onEnterNPC(npcId: number){
    if(!this.isValidNpc(npcId)) return;
    this.selectedNPC = npcId;
    this.updateSelectionHighlight();

    if(!GameState.PartyManager.IsAvailable(npcId)){
      this.onEnterUnavailable();
      return;
    }

    const inParty = GameState.PartyManager.GetPartyMemberByNPCId(npcId);
    const creature = this.getNPCCreatureForInfo(npcId);
    if(!creature){
      this.LBL_NPC_NAME.setText('I am broken');
      this.LBL_NPC_LEVEL.setText('So very very broken');
      this.LBL_NPC_NAME.show();
      this.LBL_NPC_LEVEL.show();
      this.LBL_3D.hide();
      this.setAddRemoveLabel(true);
      return;
    }

    this.LBL_NPC_NAME.setText(creature.getName());
    const mainClass = creature.getMainClass();
    const className = mainClass ? mainClass.getName() : '';
    const levelLabel = GameState.TLKManager.GetStringById(TLK_LEVEL)?.Value ?? 'Level';
    this.LBL_NPC_LEVEL.setText(`${levelLabel} ${creature.getTotalClassLevel()} ${className}`.trim());
    this.LBL_NPC_NAME.show();
    this.LBL_NPC_LEVEL.show();

    await this.updatePreview(npcId, creature);

    // Temp template creatures (not live party members) must be disposed after use.
    if(!(inParty instanceof ModuleCreature)){
      try { creature.destroy(); }catch(e){}
    }

    const slot = this.slotState[npcId];
    this.setAddRemoveLabel(!slot?.pendingSelected);
  }

  protected onEnterUnavailable(){
    this.LBL_NPC_NAME.hide();
    this.LBL_NPC_LEVEL.hide();
    this.LBL_3D.hide();
    this.setAddRemoveLabel(true);
    this.clearPreview();
  }

  /**
   * K1: fill LBL_3D with large alignment portrait (baseresref + "3" [+ "e"]).
   * TSL overrides with 3D scene.
   */
  protected async updatePreview(npcId: number, creature: ModuleCreature){
    const base = creature.getPortraitResRef() || GameState.PartyManager.GetPortraitByIndex(npcId);
    if(!base){
      this.LBL_3D.hide();
      return;
    }
    let resref = base + '3';
    if(creature.goodEvil < 50){
      const evilRef = resref + 'e';
      if(this.textureExists(evilRef)){
        resref = evilRef;
      }
    }
    if(this.LBL_3D.getFillTextureName() != resref){
      this.LBL_3D.setFillTextureName(resref);
      const texture = await TextureLoader.Load(resref);
      if(texture) this.LBL_3D.setFillTexture(texture);
    }
    this.LBL_3D.show();
  }

  protected clearPreview(){
    // K1 portrait label — nothing to destroy
  }

  protected textureExists(resRef: string): boolean {
    try {
      const key = KEYManager.Key;
      if(!key) return false;
      return !!(
        key.getFileKey(resRef, ResourceTypes['tpc']) ||
        key.getFileKey(resRef, ResourceTypes['tga'])
      );
    }catch(e){
      return false;
    }
  }

  protected getNPCCreatureForInfo(npcId: number): ModuleCreature | null {
    const inParty = GameState.PartyManager.GetPartyMemberByNPCId(npcId);
    if(inParty instanceof ModuleCreature) return inParty;

    const npc = GameState.PartyManager.NPCS[npcId];
    if(!npc?.template) return null;
    try {
      const creature = new ModuleCreature(npc.template);
      creature.npcId = npcId;
      creature.initProperties();
      return creature;
    }catch(e){
      return null;
    }
  }

  /**
   * Toggle pending selection for an NPC (BTN_NPC click).
   */
  onToggleNpc(npcId: number){
    if(!this.isValidNpc(npcId)) return;
    this.selectedNPC = npcId;
    this.updateSelectionHighlight();

    if(!this.canModify){
      this.showDenyMessage(this.denyModifyStrRef);
      return;
    }

    const slot = this.slotState[npcId];
    if(!slot) return;

    if(!slot.canToggle){
      if(slot.forced){
        this.showDenyMessage(TLK_DENY_FORCED);
      }else if(!slot.pendingSelected){
        this.showDenyMessage(TLK_DENY_SELECT);
      }else{
        this.showDenyMessage(TLK_DENY_REMOVE);
      }
      return;
    }

    if(!slot.pendingSelected){
      if(this.selectedCount >= GameState.PartyManager.MaxNPCCount){
        this.setAddRemoveLabel(true);
        this.updateCount();
        return;
      }
      slot.pendingSelected = true;
      this.selectedCount++;
    }else{
      slot.pendingSelected = false;
      this.selectedCount--;
    }

    this.setAddRemoveLabel(!slot.pendingSelected);
    this.updateCount();
    this.updateSelectionHighlight();
  }

  /**
   * BTN_ACCEPT — toggle the currently focused NPC.
   */
  onToggleFocused(){
    if(this.selectedNPC < 0) return;
    this.onToggleNpc(this.selectedNPC);
  }

  protected setAddRemoveLabel(showAdd: boolean){
    if(showAdd){
      this.BTN_ACCEPT.setText(GameState.TLKManager.GetStringById(TLK_ADD).Value);
      if(this.selectedCount >= GameState.PartyManager.MaxNPCCount){
        // At capacity — Add disabled look (still visible)
        this.BTN_ACCEPT.show();
      }else{
        this.BTN_ACCEPT.show();
      }
    }else{
      this.BTN_ACCEPT.setText(GameState.TLKManager.GetStringById(TLK_REMOVE).Value);
      this.BTN_ACCEPT.show();
    }
    if(this.selectedNPC >= 0 && this.slotState[this.selectedNPC]?.forced){
      this.BTN_ACCEPT.hide();
    }
  }

  updateSelectionHighlight() {
    for(let i = 0; i < GameState.PartyManager.MaxPartyCount; i++){
      const btn = this.getControlByName('BTN_NPC' + i);
      if(!(btn instanceof GUIControl)) continue;
      const slot = this.slotState[i];
      if(slot?.pendingSelected){
        btn.setHighlightColor(0, 1, 0);
      }else{
        btn.setHighlightColor(1, 1, 0);
      }
      btn.disableBorder();
      btn.disableHighlight();
      btn.pulsing = false;
    }
    const btn = this.getControlByName('BTN_NPC' + this.selectedNPC);
    if(btn instanceof GUIControl){
      btn.enableHighlight();
      btn.pulsing = true;
    }
  }

  /**
   * K1: numeric remaining slots. TSL overrides with "N Available".
   */
  updateCount() {
    const remaining = GameState.PartyManager.MaxNPCCount - this.selectedCount;
    this.LBL_COUNT.setText(remaining.toString());
  }

  async initPortraits() {
    for(let i = 0; i < GameState.PartyManager.MaxPartyCount; i++){
      const LBL_CHAR = this.getControlByName('LBL_CHAR' + i);
      const LBL_NA = this.getControlByName('LBL_NA' + i);
      if(!(LBL_CHAR instanceof GUIControl) || !(LBL_NA instanceof GUIControl)) continue;
      LBL_CHAR.hide();
      LBL_NA.show();
      if(!GameState.PartyManager.IsAvailable(i)){
        continue;
      }
      LBL_NA.hide();
      const portrait = GameState.PartyManager.GetPortraitByIndex(i);
      if(LBL_NA.getFillTextureName() != portrait && !!portrait){
        LBL_CHAR.setFillTextureName(portrait);
        const texture = await TextureLoader.Load(portrait);
        if(texture) LBL_CHAR.setFillTexture(texture);
      }
      const selectable = this.slotState[i]?.canToggle && GameState.PartyManager.IsSelectable(i);
      (LBL_CHAR.getFill().material as THREE.ShaderMaterial).uniforms.opacity.value = selectable ? 1 : 0.5;
      LBL_CHAR.show();
    }
  }

  protected showDenyMessage(strRef: number){
    GameState.MenuManager.InGameConfirm?.fromStringRef(strRef);
  }

  protected onDone(){
    if(!this.requireAccept){
      this.acceptParty(true);
      return;
    }

    const available = this.countAvailableSelectable();
    const forced = this.countForced();
    if(available == 0 || forced == 2){
      this.acceptParty(true);
      return;
    }
    if(available != 0){
      const strRef = (available < 2 || this.selectedCount > 1)
        ? TLK_CONFIRM_PARTY
        : TLK_CONFIRM_PARTY_SINGLE;
      GameState.MenuManager.InGameConfirm.showConfirmDialog(strRef, () => {
        this.acceptParty(true);
      });
    }
  }

  protected onBack(){
    const hasForced = this.forceNPC1 > -1 || this.forceNPC2 > -1;
    const canBack = (!hasForced && !this.requireAccept) || this.allowCancel;
    if(!canBack) return;

    if(this.allowCancel && this.onCloseScript instanceof NWScriptInstance){
      const script = this.onCloseScript;
      this.onCloseScript = undefined;
      this.close();
      // GetRunScriptVar FALSE = cancelled
      script.run(undefined, 0);
      return;
    }
    this.close();
  }

  /**
   * Commit pending selection to the live party (retail AcceptParty).
   * @param completed - true when Done (not cancel); sets exit scriptVar for K2.
   */
  async acceptParty(completed: boolean = true){
    const max = GameState.PartyManager.MaxPartyCount;

    // Removals first
    for(let i = 0; i < max; i++){
      const slot = this.slotState[i];
      if(!slot) continue;
      if(slot.partyIndex != -1 && !slot.pendingSelected){
        GameState.PartyManager.RemoveNPCById(i);
        slot.partyIndex = -1;
      }
    }

    // Additions
    for(let i = 0; i < max; i++){
      const slot = this.slotState[i];
      if(!slot) continue;
      if(slot.partyIndex == -1 && slot.pendingSelected){
        await GameState.PartyManager.AddNPCById(i);
        slot.partyIndex = GameState.PartyManager.CurrentMembers.findIndex((cm) => cm.memberID == i);
      }
    }

    // Clear forced bits for next open
    for(let i = 0; i < max; i++){
      if(this.slotState[i]) this.slotState[i].forced = false;
    }
    this.forceNPC1 = -1;
    this.forceNPC2 = -1;

    const script = this.onCloseScript;
    const wasRequireAccept = this.requireAccept;
    this.onCloseScript = undefined;
    this.close();

    if(script instanceof NWScriptInstance){
      // Script-opened success → TRUE; map/other → 0 (retail AcceptParty param)
      const scriptVar = (wasRequireAccept && completed) ? 1 : 0;
      script.run(undefined, scriptVar);
    }
  }

  // --- Legacy helpers kept for subclasses / callers ---

  selectNPC(npcId: number = -1){
    if(!this.isValidNpc(npcId)) return;
    this.selectedNPC = npcId;
    this.onEnterNPC(npcId);
  }

  isNPCRequired(npcId: number = -1){
    if(!this.isValidNpc(npcId)) return false;
    return this.slotState[npcId]?.forced || (this.forceNPC1 == npcId || this.forceNPC2 == npcId);
  }

  canClose() {
    if(this.forceNPC1 > -1 || this.forceNPC2 > -1){
      const force1 = this.forceNPC1 == -1 || this.slotState[this.forceNPC1]?.pendingSelected;
      const force2 = this.forceNPC2 == -1 || this.slotState[this.forceNPC2]?.pendingSelected;
      return !!(force1 && force2);
    }
    return true;
  }

  isAvailable(npcId: number = -1): boolean {
    return GameState.PartyManager.IsAvailable(npcId);
  }

  isSelectable(npcId: number = 0) {
    return GameState.PartyManager.IsSelectable(npcId);
  }

  triggerControllerDUpPress() {}

  triggerControllerDDownPress() {}

  triggerControllerDLeftPress() {}

  triggerControllerDRightPress() {}

}
