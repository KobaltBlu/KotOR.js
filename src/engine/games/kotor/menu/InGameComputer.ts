import { GameState } from "@engine/runtime/GameState";
import { EngineMode } from "@engine/enums/engine/EngineMode";
import { GameMenu } from "@engine/gui";
import type { GUIListBox, GUILabel } from "@engine/gui";
import type { GameObject } from "@engine/module/GameObject";
import { DLGObject } from "@engine/dialog/DLGObject";
import { DLGNode } from "@engine/dialog/DLGNode";
import { ConversationState } from "@core/enums/dialog/ConversationState";
import { SkillType } from "@core/enums/nwscript/SkillType";
import { AudioEmitter } from "@engine/audio/AudioEmitter";
import { AudioEngine } from "@engine/audio/AudioEngine";
import { AudioEngineChannel } from "@core/enums/audio/AudioEngineChannel";
import { TextureLoader } from "@engine/loaders";
import type { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { EngineModeController } from '@engine/runtime/EngineModeController';

/**
 * InGameComputer class.
 *
 * — computer terminal dialog UI.
 * SetType backgrounds follow K1 (Aspyr TSL SetType is a stub).
 * UpdateSkills; ambient computer_lp_04 @ ctor.
 *
 * @file InGameComputer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameComputer extends GameMenu {

  // GameMenu.show applies this.engineMode — must be DIALOG, not GUI default.
  // updateCamera re-shows this every tick; GUI would spam SetEngineMode(0↔3).
  engineMode: EngineMode = EngineMode.DIALOG;

  LBL_STATIC1: GUILabel;
  LBL_STATIC3: GUILabel;
  LBL_STATIC4: GUILabel;
  LBL_STATIC2: GUILabel;
  LBL_REP_UNITS_ICON: GUILabel;
  LBL_COMP_SPIKES_ICON: GUILabel;
  LBL_REP_SKILL_ICON: GUILabel;
  LBL_COMP_SKILL_ICON: GUILabel;
  LBL_REP_UNITS: GUILabel;
  LBL_REP_SKILL: GUILabel;
  LBL_COMP_SPIKES: GUILabel;
  LB_REPLIES: GUIListBox;
  LBL_COMP_SKILL: GUILabel;
  LBL_COMP_SKILL_VAL: GUILabel;
  LBL_COMP_SPIKES_VAL: GUILabel;
  LBL_REP_SKILL_VAL: GUILabel;
  LBL_REP_UNITS_VAL: GUILabel;
  LB_MESSAGE: GUIListBox;
  LBL_OBSCURE: GUILabel;

  owner: GameObject;
  listener: GameObject;

  ended: boolean = false;

  dialog: DLGObject;
  currentEntry: DLGNode;
  startingEntry: DLGNode;

  isListening: boolean;
  state: number = 0;

  conversation_name: string = '';
  /** LB_REPLIES row → index into the replies passed to setReplies. */
  replyIndexMap: number[] = [];
  computerType: number = 0;

  /** looping ambient — volume 0x1e (30). */
  private ambientEmitter: AudioEmitter | undefined;
  private ambientPlaying: boolean = false;

  constructor(){
    super();
    this.gui_resref = 'computer';
    this.background = '1600x1200comp0';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.LB_MESSAGE.setTextColor(this.LB_MESSAGE.defaultColor.r, this.LB_MESSAGE.defaultColor.g, this.LB_MESSAGE.defaultColor.b);
      this.LB_REPLIES.setTextColor(this.LB_MESSAGE.defaultColor.r, this.LB_MESSAGE.defaultColor.g, this.LB_MESSAGE.defaultColor.b);
      // Reply list: click-to-confirm (not hover-select).
      this.LB_REPLIES.setSelectOnLeftClick(true);
      this.LB_REPLIES.onClicked = (_entry: DLGNode, _control: any, index: number) => {
        if (index < 0) return;
        const replyIndex = this.replyIndexMap[index];
        if (replyIndex === undefined) return;
        GameState.CutsceneManager.selectReplyAtIndex(replyIndex);
      }
      resolve();
    });
  }

  /**
   * K1 SetType
   * comptypes.2da[ComputerType].ComputerBackground → panel background.
   * Out-of-range index clamps to row 0.
   */
  setType(computerType: number = 0) {
    this.computerType = computerType & 0xff;
    const table = GameState.TwoDAManager.datatables.get('comptypes');
    if(!table){
      return;
    }
    let rowIndex = this.computerType;
    const rowCount = table.RowCount | 0;
    if(rowCount <= 0){
      return;
    }
    if(rowIndex >= rowCount){
      rowIndex = 0;
    }
    const row = table.getByID(rowIndex) || table.rows[rowIndex];
    if(!row){
      return;
    }
    const bg = String(
      row.ComputerBackground ?? row.computerbackground ?? row.computerBackground ?? ''
    ).trim();
    if(!bg){
      return;
    }
    this.background = bg;
    void this.refreshBackgroundTexture(bg);
  }

  private async refreshBackgroundTexture(resRef: string) {
    try {
      const texture: OdysseyTexture = await TextureLoader.tpcLoader.fetch(resRef);
      if(!texture){ return; }
      if(this.backgroundMaterial?.uniforms?.map){
        this.backgroundMaterial.uniforms.map.value = texture;
      }
    } catch (e) {
      console.warn('InGameComputer.setType: failed to load background', resRef, e);
    }
  }

  /**
   * UpdateSkills — Computer Use / Repair ranks and
   * k_computer_spike / k_repair_part stack totals for party leader.
   */
  updateSkills() {
    const leader =
      GameState.PartyManager?.party?.[0] ||
      GameState.PartyManager.getCurrentPlayer?.();
    const computerRank = leader?.getSkillRank?.(SkillType.COMPUTER_USE) ?? 0;
    const repairRank = leader?.getSkillRank?.(SkillType.REPAIR) ?? 0;

    let spikes = 0;
    let parts = 0;
    const inventory = GameState.InventoryManager?.getInventory?.() || [];
    for(let i = 0; i < inventory.length; i++){
      const item = inventory[i];
      const tag = String(item?.getTag?.() || '').toLowerCase();
      const stack = item?.getStackSize?.() ?? 1;
      if(tag === 'k_computer_spike'){
        spikes += stack;
      }else if(tag === 'k_repair_part'){
        parts += stack;
      }
    }

    this.LBL_COMP_SKILL_VAL?.setText?.(String(computerRank | 0));
    this.LBL_REP_SKILL_VAL?.setText?.(String(repairRank | 0));
    this.LBL_COMP_SPIKES_VAL?.setText?.(String(spikes | 0));
    this.LBL_REP_UNITS_VAL?.setText?.(String(parts | 0));
  }

  private ensureAmbientEmitter() {
    if(this.ambientEmitter){ return this.ambientEmitter; }
    const engine = AudioEngine.GetAudioEngine();
    if(!engine){ return undefined; }
    this.ambientEmitter = new AudioEmitter(engine, AudioEngineChannel.GUI);
    this.ambientEmitter.isLooping = true;
    this.ambientEmitter.setVolume(0x1e);
    void this.ambientEmitter.load();
    return this.ambientEmitter;
  }

  /** computer_lp_04 loop @ volume 0x1e. */
  startAmbient() {
    if(this.ambientPlaying){ return; }
    const emitter = this.ensureAmbientEmitter();
    if(!emitter){ return; }
    this.ambientPlaying = true;
    void emitter.playSound('computer_lp_04');
  }

  stopAmbient() {
    if(!this.ambientPlaying && !this.ambientEmitter){ return; }
    this.ambientPlaying = false;
    this.ambientEmitter?.stop?.(0);
  }

  show(){
    super.show();
    EngineModeController.SetEngineMode(EngineMode.DIALOG);
    this.startAmbient();
  }

  hide(){
    super.hide();
  }

  close(){
    this.stopAmbient();
    super.close();
  }

  /**
   * Replies with empty text get no row (SetReplies skips them); the rest keep
   * their original number. A lone empty reply (continue / end) shows no list.
   * `replies` must be the same array as CutsceneManager.currentReplies.
   */
  setReplies(replies: DLGNode[]) {
    const texts: string[] = [];
    this.replyIndexMap = [];
    for(let i = 0; i < replies.length; i++){
      const text = replies[i]?.getCompiledString?.() || '';
      if(!text.length){ continue; }
      texts.push((i + 1) + '. ' + text);
      this.replyIndexMap.push(i);
    }
    this.LB_REPLIES.setItems(texts);
    if(texts.length){
      this.LB_REPLIES.show();
    }else{
      this.LB_REPLIES.hide();
    }
    // keeps the spoken entry listbox visible under replies.
    this.LB_MESSAGE?.show?.();
    this.updateSkills();
  }

  /**
   * — clear LB_MESSAGE, size the row to
   * GetIdealHeight / font height, AddControls(message label).
   */
  setEntry(entry: DLGNode) {
    this.currentEntry = entry;
    const text = entry?.getCompiledString?.() || '';
    this.LB_MESSAGE.setItem(text || null);
    this.syncMessageItemHeight(text);
    this.LB_MESSAGE.show();
    this.updateSkills();
  }

  /**
   * Match SetDialogMessage height: empty → font height, else wrapped text height.
   * Keeps the PROTOITEM row extent in sync so OrganizeControls places it correctly.
   */
  private syncMessageItemHeight(text: string) {
    const row = this.LB_MESSAGE?.children?.[0];
    if(!row){ return; }
    try{
      if(typeof row.getTextSize === 'function'){
        row.getTextSize();
      }else if(row.text?.geometry?.boundingBox){
        row.text.geometry.computeBoundingBox();
        row.text.geometry.boundingBox.getSize(row.textSize);
      }
      const fontH = (row as any).guiFont?.height || (row as any).guiFont?.getHeight?.() || 14;
      const ideal = (text && text.length)
        ? Math.max(row.extent.height | 0, Math.ceil(row.textSize?.y || 0) | 0)
        : (fontH | 0);
      if(ideal > 0 && (row.extent.height | 0) !== ideal){
        row.extent.height = ideal;
        row.resizeControl?.();
      }
      this.LB_MESSAGE.relayoutAfterRowHeightChange?.();
    }catch(_e){
      // Layout controls may not be fully initialized in tests.
    }
  }

  setDialogMode(state: ConversationState) {
    // : replies listbox toggles visibility; LB_MESSAGE stays at GUI layout
    // (even forces message_label visible when replies show).
    if(state == ConversationState.LISTENING_TO_SPEAKER){
      this.LB_REPLIES?.hide?.();
      this.LB_MESSAGE?.show?.();
    }else{
      if(this.replyIndexMap.length){
        this.LB_REPLIES?.show?.();
      }else{
        this.LB_REPLIES?.hide?.();
      }
      this.LB_MESSAGE?.show?.();
    }
    this.updateSkills();
  }

  /** Up / down choose a reply, A picks it, the right stick scrolls the message. */
  triggerControllerAPress() {
    if(!this.LB_REPLIES?.isVisible()) return;
    const row = this.LB_REPLIES.selectedItem;
    if(row) row.click();
    else if(this.LB_REPLIES.children.length) this.LB_REPLIES.setSelectedControl(0, false);
  }

  triggerControllerStartPress() {
    this.triggerControllerAPress();
  }

  triggerControllerDUpPress() {
    if(this.LB_REPLIES?.isVisible()) this.LB_REPLIES.directionalNavigate('up');
  }

  triggerControllerDDownPress() {
    if(this.LB_REPLIES?.isVisible()) this.LB_REPLIES.directionalNavigate('down');
  }

  triggerControllerDLeftPress() {}

  triggerControllerDRightPress() {}

  triggerControllerRStickYPress(positive = false) {
    if(positive) this.LB_MESSAGE?.scrollDown();
    else this.LB_MESSAGE?.scrollUp();
  }

}
