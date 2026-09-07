import { AuroraAnimationFlag } from "@/enums/animation/AuroraAnimationFlag";
import { EngineMode } from "@/enums/engine/EngineMode";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { DLGObject } from "@/resource/DLGObject";
import { DLGNode } from "@/resource/DLGNode";
import type { ModuleCreature, ModuleObject } from "@/module";
import { ConversationState } from "@/enums/dialog/ConversationState";
import { GameState } from "@/GameState";
import { DLGConversationType } from "@/enums/dialog/DLGConversationType";
import { DLGCameraAngle } from "@/enums/dialog/DLGCameraAngle";
import { OdysseyModel3D } from "@/three/odyssey/OdysseyModel3D";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { AILevel } from "@/enums/module/AILevel";
import { AudioLoader } from "@/audio/AudioLoader";
import { AudioEngine } from "@/audio/AudioEngine";
import { CutsceneMode } from "@/enums/dialog/CutsceneMode";
import { SoundMode } from "@/enums/audio/SoundMode";
import * as THREE from "three";
import { CameraMode } from "@/enums/dialog/CameraMode";
import { ICameraState } from "@/interface/dialog/ICameraState";
import { AudioEmitter } from "@/audio/AudioEmitter";
import { ICameraParticipant } from "@/interface/dialog/ICameraParticipant";
import {
  computeDialogCameraShot,
  dlgAngleToShotType,
  DIALOG_CAMERA_FOV,
  ANIMATED_CAMERA_NEAR,
  ANIMATED_CAMERA_FAR,
  getCameraAnimationName,
  isLoopingDialogStuntAnimation,
  createDialogPseudoRandomState,
  resolveEntryCameraAngle,
  resolveReplyCameraAngle,
  lookupDialogCloseUpExtra,
  resolveAspyrAppearanceCameraOverrides,
  isDialogGameModded,
  isAspyrCarthDialogCameraHack,
  applyAspyrPlaceableCameraHack,
  type DialogPseudoRandomState,
} from "@/managers/cutscene/dialog-camera";
import {
  auroraCameraLookOrientation,
} from "@/utility/aurora-camera-orientation";
import { ConfigClient } from "@/utility/ConfigClient";

/** SendDialogEntryNode AnimList retry window (0x5dc = 1500ms). */
export const DIALOG_PARTICIPANT_RETRY_MS = 0x5dc;

export interface DialogParticipantReadyActor {
  participant: string;
  moduleObject?: { model?: unknown } | undefined;
  animations?: unknown[] | undefined;
}

export interface DialogParticipantReadyAnim {
  participant: string;
  animation: number;
}

export class CutsceneManager {

  static active: boolean = false;
  /**
   * SendDialogEntryNode — ms remaining while required
   * AnimList participants are missing before HandleDialogEntry proceeds.
   */
  static participantRetryRemainingMs = 0;
  /** Entry deferred until participants bind (or retry window expires). */
  static pendingParticipantEntry: DLGNode | undefined = undefined;
  static participantRebindInFlight = false;
  /**
   * Incremented each time startConversation commits (including bark one-liners
   * that end immediately). ActionDialogObject uses this so OnDialog →
   * BeginConversation bark is not double-started on fallthrough.
   */
  static conversationEpoch: number = 0;
  /** pseudo-random camera angle state. */
  static dialogCameraPrng: DialogPseudoRandomState | undefined;
  /** When true, conversation is private (scripted bPrivateConversation). */
  static privateConversation: boolean = false;
  /**
   * dialog_non_dependant_list — participant names that may be
   * absent without blocking dialog entry send (ActionStartConversation ignore args).
   */
  static dialogNonDependantNames: Set<string> = new Set();
  static cutsceneMode: CutsceneMode = CutsceneMode.DIALOG;

  static conversation_name: string;
  static dialog: DLGObject;
  static startingEntry: DLGNode;
  static currentEntry: DLGNode;
  static currentReplies: DLGNode[] = [];

  static lastSpokenString: string = '';

  static listener: ModuleObject;
  static owner: ModuleObject;

  static ended: boolean;
  static state: ConversationState;
  static unequipHeadItem: boolean;
  static unequipItems: boolean;
  /**
   * Creatures that had dialog UnequipItems/UnequipHItem applied — restored via
   * ShowEquippedItems-equivalent at conversation end (SetDialogDelay).
   */
  static dialogUnequippedCreatures: ModuleCreature[] = [];
  /**
   * K2 SetKeepStealthInDialog — when true, skip UnstealthParty on dialog start
   * (GuiInGame check in LoadDialog).
   */
  static keepStealthInDialog: boolean = false;
  static isListening: boolean;

  static audioEmitter: AudioEmitter;

  /**
   * PauseConversation blocks advancing to the
   * next entry/reply (SendDialogEntry) while the current entry's
   * WaitFlags / VO / camera keep ticking.
   */
  static paused: boolean = false;
  /**
   * deferred SendDialogEntry / SendDialogReplies while
   * paused (flushed by update when pause clears, not by Resume itself).
   */
  static pendingAdvance: boolean = false;
  /**
   * when pendingAdvance and this is set, flush shows that
   * entry; when pendingAdvance and this is undefined, flush shows replies
   * (0xFFFFFFFF sentinel).
   */
  static pendingEntry: DLGNode | undefined = undefined;
  /**
   * Actors that received dialog AnimList / default talk/listen this entry
   * polled for WAIT_ANIM (IsAnimationPlayingInDialog).
   */
  static dialogAnimParticipants: ModuleObject[] = [];
  /** TSL ActionStartConversation nBarkX/nBarkY (−1 = default layout). */
  static barkScreenX: number = -1;
  static barkScreenY: number = -1;
  /**
   * Post-dialog character switch restore (CancelPostDialogCharacterSwitch @ 757).
   * When set, endConversation switches controlled party member back to this npcId
   * (−1 = original PC). Cleared by cancelPostDialogCharacterSwitch.
   */
  static postDialogRestoreNpcId: number | undefined = undefined;
  /**
   * AIActionDialogObject — when a non-PC party leader
   * starts a conversation, fade out, wait for IsGlobalFading to clear, swap the PC
   * into the leader slot/position, then StartDialog. Fade-in is holdWorldFadeInForDialog.
   */
  static pendingPartyDialogSwitch: {
    dialog: DLGObject;
    owner: ModuleObject;
    listener: ModuleObject;
    privateConversation: boolean;
    ignoreObjectNames: string[];
    barkScreenX: number;
    barkScreenY: number;
  } | undefined = undefined;
  static readonly #tmpCamDir = new THREE.Vector3();
  static readonly #tmpCamQuat = new THREE.Quaternion();

  static cameraState: ICameraState = {
    mode: CameraMode.DIALOG,
    cameraAngle: DLGCameraAngle.ANGLE_SPEAKER,
    cameraID: -1,
    cameraAnimation: -1,
    currentCameraAnimation: undefined,
    currentCameraAnimationElapsed: 0,
    listener: {} as ICameraParticipant,
    speaker: {} as ICameraParticipant,
  }

  static getCurrentListener(): ModuleObject {
    if (this.currentEntry) {
      return this.currentEntry.listener;
    }
    return this.listener;
  }

  static getCurrentOwner(): ModuleObject {
    if (this.currentEntry) {
      return this.currentEntry.owner;
    }
    return this.owner;
  }

  static setDialogNonDependantNames(names: string[] = []){
    this.dialogNonDependantNames.clear();
    for(let i = 0; i < names.length; i++){
      const n = names[i]?.trim();
      if(n) this.dialogNonDependantNames.add(n.toLocaleLowerCase());
    }
  }

  /**
   * Schedule a post-dialog SwitchPlayerCharacter restore (npcId; −1 = PC).
   * Only records the first schedule so nested switches keep the original.
   */
  static schedulePostDialogCharacterSwitch(restoreNpcId: number) {
    if(typeof this.postDialogRestoreNpcId === 'number'){ return; }
    this.postDialogRestoreNpcId = restoreNpcId | 0;
  }

  /** NWScript CancelPostDialogCharacterSwitch (757). */
  static cancelPostDialogCharacterSwitch() {
    this.postDialogRestoreNpcId = undefined;
  }

  /**
   * True when the conversation listener is a party member and the real PC is not
   * already party leader — AIActionDialogObject CNPC→PC swap gate.
   */
  static needsPartyDialogLeaderSwitch(
    owner: ModuleObject | undefined,
    listener: ModuleObject | undefined,
  ): boolean {
    let resolvedOwner = owner;
    let resolvedListener = listener ?? GameState.PartyManager?.party?.[0];
    if(resolvedOwner?.isPlayer && resolvedListener && !resolvedListener.isPlayer){
      const tmp = resolvedOwner;
      resolvedOwner = resolvedListener;
      resolvedListener = tmp;
    }
    if(!resolvedListener?.isPM){ return false; }
    if(GameState.PartyManager?.IsPlayerPartyLeader?.()){ return false; }
    // : only when the converse-with object has PartyInteract == 0.
    const target = resolvedOwner as { partyInteract?: number | boolean } | undefined;
    if(target && !!target.partyInteract){ return false; }
    return true;
  }

  /**
   * Resume startConversation after the party-dialog switch fade-out completes.
   * Call from UpdateIngame (still INGAME while fading — CutsceneManager.update is DIALOG-only).
   */
  static tickPendingPartyDialogSwitch() {
    const pending = this.pendingPartyDialogSwitch;
    if(!pending){ return; }
    if(GameState.FadeOverlayManager?.isFading?.()){ return; }
    this.pendingPartyDialogSwitch = undefined;
    GameState.PartyManager.MakePlayerLeader();
    this.startConversation(
      pending.dialog,
      pending.owner,
      GameState.PartyManager.party[0] ?? pending.listener,
      pending.privateConversation,
      pending.ignoreObjectNames,
      pending.barkScreenX,
      pending.barkScreenY,
    );
  }

  /** IsOnDialogNonDependantList (case-insensitive). */
  static isDialogNonDependant(participant: string): boolean {
    if(!participant) return false;
    return this.dialogNonDependantNames.has(participant.toLocaleLowerCase());
  }

  /**
   * Speaker / listener (or current entry pair) for private-conversation gating.
   * Non-participants keep AI locomotion and are not forced into dialog facing.
   */
  static isDialogParticipant(obj: ModuleObject | undefined): boolean {
    if(!obj) return false;
    if(obj === this.owner || obj === this.listener) return true;
    if(this.currentEntry){
      if(obj === this.currentEntry.speaker || obj === this.currentEntry.listener) return true;
    }
    return false;
  }

  /**
   * AIActionPauseDialog — set + dialog-stop activity bit.
   */
  static pauseConversation() {
    if(!this.active || !this.dialog) return;
    this.paused = true;
    const owner = this.getCurrentOwner();
    if(BitWise.InstanceOfObject(owner, ModuleObjectType.ModuleCreature)){
      (owner as ModuleCreature).setActivity(4, true, 0);
    }
  }

  /**
   * AIActionResumeDialog — clear pause, ActivityManager(2),
   * clear dialog-stop bit, clear stealth bit. Deferred advance is flushed by
   * update (UpdateDialog), not here.
   */
  static resumeConversation() {
    if(!this.dialog) return;
    this.paused = false;
    const owner = this.getCurrentOwner();
    if(BitWise.InstanceOfObject(owner, ModuleObjectType.ModuleCreature)){
      const creature = owner as ModuleCreature;
      creature.activityManager(2);
      creature.setActivity(4, false, 0);
      creature.setActivity(1, false, 0);
    }
  }

  /** Clear / pending state. */
  static clearPendingDialog() {
    this.pendingAdvance = false;
    this.pendingEntry = undefined;
  }

  /** Clear SendDialogEntryNode participant-retry window. */
  static clearParticipantRetry() {
    this.pendingParticipantEntry = undefined;
    this.participantRetryRemainingMs = 0;
    this.participantRebindInFlight = false;
  }

  /**
   * Resolve AnimList / StuntList participant for readiness checks.
   * PLAYER / OWNER mirror SendDialogEntryNode name compares.
   */
  static resolveDialogParticipantObject(participant: string): ModuleObject | undefined {
    const key = (participant || '').toLocaleLowerCase();
    if(!key){ return undefined; }
    if(key === 'player'){
      return GameState.PartyManager.party[0];
    }
    if(key === 'owner'){
      return this.owner || this.dialog?.owner;
    }
    if(key === 'npc1'){
      return GameState.PartyManager.party[1];
    }
    if(key === 'npc2'){
      return GameState.PartyManager.party[2];
    }
    return GameState.ModuleObjectManager.GetObjectByTag(participant);
  }

  /**
   * True when a required AnimList participant is bound for cutscene playback.
   * NonDependant names are ignored (may be absent).
   */
  static isRequiredDialogParticipantReady(
    anim: DialogParticipantReadyAnim,
    options: {
      isNonDependant: (name: string) => boolean;
      stuntActor?: DialogParticipantReadyActor;
      /** Live object from GetObjectByTag / PLAYER / OWNER when not a stunt actor. */
      liveObject?: { model?: unknown } | undefined;
    }
  ): boolean {
    const name = (anim.participant || '').trim();
    if(!name){ return true; }
    if(options.isNonDependant(name)){ return true; }

    if(options.stuntActor){
      const obj = options.stuntActor.moduleObject;
      if(!obj){ return false; }
      // CUT stunt anims need both the creature mesh and stunt animation list.
      if(!obj.model){ return false; }
      if(!options.stuntActor.animations?.length){ return false; }
      return true;
    }

    if(!options.liveObject){ return false; }
    // Non-stunt AnimList still needs a model for dialogPlayAnimation.
    if(options.liveObject.model === undefined || options.liveObject.model === null){
      return false;
    }
    return true;
  }

  static areRequiredDialogParticipantsReady(
    animations: DialogParticipantReadyAnim[],
    options: {
      isNonDependant: (name: string) => boolean;
      getStuntActor: (name: string) => DialogParticipantReadyActor | undefined;
      getLiveObject: (name: string) => { model?: unknown } | undefined;
    }
  ): boolean {
    for(let i = 0; i < animations.length; i++){
      const anim = animations[i];
      const key = (anim.participant || '').toLocaleLowerCase();
      const ready = this.isRequiredDialogParticipantReady(anim, {
        isNonDependant: options.isNonDependant,
        stuntActor: options.getStuntActor(key),
        liveObject: options.getLiveObject(anim.participant),
      });
      if(!ready){ return false; }
    }
    return true;
  }

  /**
   * SendDialogEntryNode required-participant gate.
   * StuntList actors need moduleObject + model + CUT animations.
   */
  static areRequiredEntryParticipantsReady(entry: DLGNode): boolean {
    if(!entry?.animations?.length){ return true; }
    return this.areRequiredDialogParticipantsReady(entry.animations, {
      isNonDependant: (name) => this.isDialogNonDependant(name),
      getStuntActor: (name) => this.dialog?.stuntActors?.get(name.toLocaleLowerCase()),
      getLiveObject: (name) => this.resolveDialogParticipantObject(name),
    });
  }

  /** Async rebind for SpawnAvailableNPC races during the retry window. */
  static async rebindMissingStuntActors() {
    if(!this.dialog || this.participantRebindInFlight){ return; }
    this.participantRebindInFlight = true;
    try{
      await this.dialog.reloadMissingStuntActors();
    }finally{
      this.participantRebindInFlight = false;
    }
  }

  /**
   * SendDialogEntryNode: defer HandleDialogEntry while required
   * participants are missing; arm 1500ms retry, then proceed anyway.
   * @returns true when the entry may begin now
   */
  static tryBeginEntryParticipants(entry: DLGNode, forceAfterTimeout = false): boolean {
    if(forceAfterTimeout || this.areRequiredEntryParticipantsReady(entry)){
      this.clearParticipantRetry();
      return true;
    }
    if(!this.pendingParticipantEntry){
      this.participantRetryRemainingMs = DIALOG_PARTICIPANT_RETRY_MS;
    }
    this.pendingParticipantEntry = entry;
    void this.rebindMissingStuntActors();
    return false;
  }

  /**
   * Poll deferred entry until participants ready or 1500ms elapses.
   */
  static tickParticipantRetry(delta: number = 0) {
    const entry = this.pendingParticipantEntry;
    if(!entry || !this.dialog){ return; }

    if(this.areRequiredEntryParticipantsReady(entry)){
      this.clearParticipantRetry();
      this.showEntry(entry);
      return;
    }

    void this.rebindMissingStuntActors();

    this.participantRetryRemainingMs -= Math.max(0, delta) * 1000;
    if(this.participantRetryRemainingMs <= 0){
      this.clearParticipantRetry();
      this.showEntry(entry, true);
    }
  }

  /**
   * UpdateDialog pending flush: when !paused and set,
   * == 0xFFFFFFFF → SendDialogReplies, else SendDialogEntry.
   */
  static flushPendingDialog() {
    if(this.paused || !this.pendingAdvance) return;
    const stashedEntry = this.pendingEntry;
    this.clearPendingDialog();
    if(stashedEntry){
      this.showEntry(stashedEntry);
      return;
    }
    if(this.currentEntry && !this.currentEntry.repliesShown){
      this.currentEntry.repliesShown = true;
      this.showReplies(this.currentEntry);
    }
  }

  /**
   * Cancel path movers and zero cam-relative WASD/stick state on the active party.
   * Dialog mode still ticks creatures; sticky axes otherwise keep the PC coasting.
   * Private conversations only park speaker/listener (N16).
   */
  static stopPartyLocomotionForDialog() {
    const party = GameState.PartyManager?.party;
    if(!party?.length) return;
    const privateConvo = this.privateConversation;
    for(let i = 0; i < party.length; i++){
      const member = party[i];
      if(!BitWise.InstanceOfObject(member, ModuleObjectType.ModuleCreature)) continue;
      if(privateConvo && !this.isDialogParticipant(member)){
        continue;
      }
      const creature = member as ModuleCreature;
      creature.cancelLocomotionActions();
      creature.clearLocomotionState(true);
    }
  }

  static startConversation(
    dialog: DLGObject,
    owner: ModuleObject,
    listener: ModuleObject = GameState.PartyManager.party[0],
    privateConversation: boolean = false,
    ignoreObjectNames: string[] = [],
    barkScreenX: number = -1,
    barkScreenY: number = -1,
  ) {
    // AIActionDialogObject: StartGlobalFade(0, 0, 0.75) then wait while
    // IsGlobalFading before position-swap + ChangeCharacter + StartDialog.
    if(this.needsPartyDialogLeaderSwitch(owner, listener)){
      this.pendingPartyDialogSwitch = {
        dialog,
        owner,
        listener: listener ?? GameState.PartyManager.party[0],
        privateConversation: !!privateConversation,
        ignoreObjectNames: ignoreObjectNames || [],
        barkScreenX: typeof barkScreenX === 'number' ? barkScreenX : -1,
        barkScreenY: typeof barkScreenY === 'number' ? barkScreenY : -1,
      };
      GameState.holdWorldFadeInForDialog = true;
      GameState.FadeOverlayManager.FadeOut(
        GameState.FadeOverlayManager.PARTY_DIALOG_SWITCH_FADE_OUT_LENGTH,
        0, 0, 0, 0
      );
      return;
    }
    this.pendingPartyDialogSwitch = undefined;

    this.active = true;
    this.conversationEpoch++;
    this.privateConversation = !!privateConversation;
    this.setDialogNonDependantNames(ignoreObjectNames);
    this.barkScreenX = typeof barkScreenX === 'number' ? barkScreenX : -1;
    this.barkScreenY = typeof barkScreenY === 'number' ? barkScreenY : -1;
    this.cameraState.currentCameraAnimation = undefined;
    this.dialogCameraPrng = createDialogPseudoRandomState(dialog?.resref || '');
    this.owner = owner;
    this.listener = listener;
    this.paused = false;
    this.clearPendingDialog();
    this.dialogAnimParticipants = [];
    this.ended = false;
    // ExecuteCommandActionStartConversation — promote VERY_LOW participants to LOW
    for(const participant of [owner, listener]){
      if(participant && participant.aiLevel === AILevel.VERY_LOW){
        GameState.module?.aiScheduler.setAILevel(participant, AILevel.LOW);
      }
    }
    // If the party leader is a switched CNPC (ControlledNPC >= 0), schedule
    // restore to the prior controlled character after dialog unless cancelled.
    const controlled = GameState.PartyManager?.ControlledNPC;
    if(typeof controlled === 'number' && controlled >= 0){
      this.schedulePostDialogCharacterSwitch(-1);
    }
    this.currentEntry = null;
    this.state = ConversationState.INVALID;
    if (owner.isPlayer && !listener.isPlayer) {
      this.listener = owner;
      this.owner = listener;
    }
    this.unequipHeadItem = false;
    this.unequipItems = false;
    this.dialogUnequippedCreatures = [];
    this.isListening = true;
    this.startingEntry = null;
    this.currentEntry = null;
    this.currentReplies = [];
    this.lastSpokenString = '';
    this.ended = false;
    
    if (!dialog) {
      dialog = this.owner.getConversation();
    }

    if (!(dialog instanceof DLGObject)) {
      this.endConversation();
    }

    this.conversation_name = dialog.resref;
    this.unequipHeadItem = !!dialog.unequipHeadItem;
    this.unequipItems = !!dialog.unequipItems;
    // overlay stop when leaving dialog (SetOverlayAnimation arg3=0).
    // LoadDialog: non-computer convos UnstealthParty unless keepStealthInDialog.
    if(dialog.getConversationType() != DLGConversationType.COMPUTER && !this.keepStealthInDialog){
      this.unstealthPartyForDialog();
    }
    // K2 ctor → StartDuckingMusicAndAmbientSounds (sound+0 = 0.2).
    // AudioEngine no-ops on K1 (no duck API). Miles volume_levels ↔ GainNode linear.
    // SendDialogEntry: if GetSoundMode!=0 → SetSoundMode(0) so VO is audible.
    const audio = AudioEngine.GetAudioEngine();
    if(AudioEngine.GetSoundMode() !== SoundMode.POP){
      AudioEngine.SetSoundMode(SoundMode.POP, 0);
    }
    AudioEngine.ensureGameBusesAudible();
    audio.startDuckingMusicAndAmbientSounds();
    this.dialog = dialog;
    this.dialog.owner = this.owner;
    this.dialog.listener = this.listener;
    
    //todo trigger updateTextPosition
    this.isListening = true;
    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameComputer.updateTextPosition?.(true);
    }else{
      GameState.MenuManager.InGameDialog.updateTextPosition?.(true);
    }
    this.startingEntry = this.getNextEntry(this.dialog.startingList);
    if(!this.startingEntry){
      console.warn('CutsceneManager.startConversation: No starting entry found');
      this.endConversation();
      return;
    }
    
    //bark entry — no AmbientTrack load (async race with immediate endConversation).
    const isBarkDialog = this.startingEntry.isBarkDialog();
    if (isBarkDialog) {
      this.cutsceneMode = CutsceneMode.BARK;
      this.startingEntry.initProperties();
      GameState.MenuManager.InGameBark.bark(this.startingEntry, this.barkScreenX, this.barkScreenY);
      this.startingEntry.runScripts();
      const reply = this.dialog.getReplyByIndex(this.startingEntry.replies[0]?.index);
      if (reply) {
        reply.runScripts();
      }
      this.endConversation();
      return;
    }

    // Stop party locomotion before DIALOG mode. Cam-relative axes/velocity stay
    // sticky after key-map switch, and module still ticks during dialog.
    this.stopPartyLocomotionForDialog();
    
    GameState.SetEngineMode(EngineMode.DIALOG);
    
    //normal dialog entry
    this.cutsceneMode = (this.dialog.isAnimatedCutscene) ? CutsceneMode.ANIMATED : CutsceneMode.DIALOG;

    // Safety net: primary CNPC→PC swap + fade runs before active (pendingPartyDialogSwitch).
    if(this.listener.isPM && !GameState.PartyManager.IsPlayerPartyLeader()){
      const speakTarget = this.owner as { partyInteract?: number | boolean };
      if(!speakTarget?.partyInteract){
        GameState.PartyManager.MakePlayerLeader();
        this.listener = this.dialog.listener = GameState.PartyManager.party[0];
      }
    }

    if(this.dialog.getConversationType() != DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameDialog.canLetterbox = true;
    }

    console.log(`CutsceneManager.startConversation: ${this.dialog.getConversationType() ? 'Computer' : 'Conversation'}`);

    Promise.all([
      this.dialog.loadStuntCamera(),
      this.dialog.loadStuntActors(),
      this.dialog.loadBackgroundMusic()
    ]).then(() => {
      // Apply root UnequipItems/UnequipHItem outside the stunt-actor path too
      this.applyDialogUnequipFlags();
      switch (this.dialog.getConversationType()) {
        case DLGConversationType.COMPUTER:
          console.log('CutsceneManager.startConversation: Computer');
          GameState.MenuManager.InGameComputer.setType(this.dialog.computerType ?? 0);
          GameState.MenuManager.InGameComputer.open();
          break;
        default:
          console.log('CutsceneManager.startConversation: Conversation');
          GameState.MenuManager.InGameDialog.open();
          break;
      }
      this.showEntry(this.startingEntry);
    });
  }

  /**
   * UnstealthParty when entering a cinematic conversation.
   */
  static unstealthPartyForDialog(){
    const party = GameState.PartyManager?.party;
    if(!party?.length) return;
    for(let i = 0; i < party.length; i++){
      const member = party[i];
      if(BitWise.InstanceOfObject(member, ModuleObjectType.ModuleCreature) && member.stealthMode){
        (member as ModuleCreature).setStealthMode(false);
      }
    }
  }

  /**
   * Apply root UnequipItems / UnequipHItem to dialog participants (party leader
   * + owner/listener creatures) when not already handled via stunt actors.
   */
  static applyDialogUnequipFlags(){
    if(!this.dialog || (!this.unequipItems && !this.unequipHeadItem)){
      return;
    }
    const seen = new Set<ModuleCreature>();
    const tryUnequip = (obj: ModuleObject | undefined) => {
      if(!BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)) return;
      const creature = obj as ModuleCreature;
      if(seen.has(creature)) return;
      seen.add(creature);
      this.hideEquippedItemsForDialog(creature);
    };
    tryUnequip(GameState.PartyManager?.party?.[0]);
    tryUnequip(this.owner);
    tryUnequip(this.listener);
    if(this.dialog.stuntActors){
      for(const actor of this.dialog.stuntActors.values()){
        tryUnequip(actor.moduleObject);
      }
    }
  }

  /**
   * Stash + unequip for dialog (HideEquippedItems). Tracks creatures for
   * restore at endConversation.
   */
  static hideEquippedItemsForDialog(creature: ModuleCreature){
    if(!creature || (!this.unequipItems && !this.unequipHeadItem)) return;
    if(typeof creature.hideEquippedItemsForDialog === 'function'){
      creature.hideEquippedItemsForDialog(this.unequipItems, this.unequipHeadItem);
      if(this.dialogUnequippedCreatures.indexOf(creature) < 0){
        this.dialogUnequippedCreatures.push(creature);
      }
    }else{
      if(this.unequipItems) creature.UnequipItems();
      if(this.unequipHeadItem) creature.UnequipHeadItem();
    }
  }

  /**
   * Restore equipment after dialog (ShowEquippedItems via SetDialogDelay).
   */
  static showEquippedItemsAfterDialog(){
    for(let i = 0; i < this.dialogUnequippedCreatures.length; i++){
      const creature = this.dialogUnequippedCreatures[i];
      if(creature && typeof creature.showEquippedItemsAfterDialog === 'function'){
        creature.showEquippedItemsAfterDialog();
      }
    }
    this.dialogUnequippedCreatures = [];
  }

  /**
   * Get the next entry
   * @param entryLinks - The entry links
   * @returns The next entry
   */
  static getNextEntry(entryLinks: DLGNode[] = []/*, callback?: Function*/): DLGNode {
    if (!entryLinks.length) { return; }
    this.isListening = true;
    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameComputer.updateTextPosition?.(true);
    }else{
      GameState.MenuManager.InGameDialog.updateTextPosition();
    }
    const entryIndex = this.dialog.getNextEntryIndex(entryLinks);
    return this.dialog.getEntryByIndex(entryIndex);
  }

  /**
   * Handle the player skipping a dialog entry
   * @param currentEntry - The entry to skip
   */
  static playerSkipEntry(currentEntry: DLGNode) {
    if(!this.currentEntry) { return; }
    if(this.paused) { return; }
    // Root Skippable gates all entry skips; NodeUnskippable still applies per node
    if(this.dialog && this.dialog.skippable === false) { return; }
    if(!this.currentEntry.skippable) { return; }
    if(this.currentEntry.checkList.isSkipped){ return; }
    if(this.currentEntry.repliesShown){ return; }
    this.currentEntry.checkList.isSkipped = true;
    this.audioEmitter.stop();
    this.currentEntry.resetLIP();
    this.showReplies(this.currentEntry);
  }

  /**
   * Show a dialog entry
   * @param entry - The entry to show
   * @param forceParticipantReady - retry timeout elapsed; play even if missing
   */
  static showEntry(entry: DLGNode, forceParticipantReady = false) {
    if(this.paused){
      // SendDialogEntry — stash entry index, =1.
      this.pendingAdvance = true;
      this.pendingEntry = entry;
      return;
    }
    // SendDialogEntryNode — wait for required AnimList objects.
    if(!this.tryBeginEntryParticipants(entry, forceParticipantReady)){
      return;
    }
    this.clearPendingDialog();
    this.dialogAnimParticipants = [];
    this.currentEntry = entry;
    this.currentEntry.repliesShown = false;
    entry.initProperties();

    // HandleDialogEntry: release module-load hold with StartGlobalFade(1, 0, 1)
    if(GameState.holdWorldFadeInForDialog){
      GameState.holdWorldFadeInForDialog = false;
      GameState.FadeOverlayManager.FadeIn(
        GameState.FadeOverlayManager.HOLD_WORLD_FADE_IN_LENGTH,
        0, 0, 0,
        GameState.FadeOverlayManager.HOLD_WORLD_FADE_IN_WAIT
      );
    }

    const isComputerCameraEntry = this.dialog.getConversationType() == DLGConversationType.COMPUTER && entry.cameraAngle == DLGCameraAngle.ANGLE_PLACEABLE_CAMERA;
    this.state = ConversationState.LISTENING_TO_SPEAKER;
    if (GameState.Mode != EngineMode.DIALOG)
      return;
    GameState.VideoEffectManager.SetVideoEffect(
      isComputerCameraEntry
        ? this.resolveComputerCamVidEffect(entry)
        : entry.getVideoEffect()
    );
    this.lastSpokenString = entry.getCompiledString();
    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameComputer.setEntry(entry);
      GameState.MenuManager.InGameComputer.setDialogMode(ConversationState.LISTENING_TO_SPEAKER);
    }else{
      GameState.MenuManager.InGameDialog.setDialogMode(ConversationState.LISTENING_TO_SPEAKER);
    }

    // UpdateShotCamera: skip participant look-at when computer panel active.
    if(this.dialog.getConversationType() != DLGConversationType.COMPUTER){
      // N16: only force look-at on dialog participants (speaker/listener).
      if(BitWise.InstanceOfObject(this.currentEntry.speaker, ModuleObjectType.ModuleCreature)){
        const creature = this.currentEntry.speaker as ModuleCreature;
        if(this.isDialogParticipant(creature)){
          creature.lookAt(this.currentEntry.listener);
        }
      }

      if(BitWise.InstanceOfObject(this.currentEntry.listener, ModuleObjectType.ModuleCreature)){
        const creature = this.currentEntry.listener as ModuleCreature;
        if(this.isDialogParticipant(creature)){
          creature.lookAt(this.currentEntry.speaker);
        }
      }
    }

    entry.updateJournal();

    //participant animations
    if (this.cutsceneMode == CutsceneMode.ANIMATED) {
      this.setAnimatedEntryAnimations(entry);
    } else {
      this.setEntryAnimations(entry);
    }

    //participant facing — skip for computer (no head-look framing)
    if (this.cutsceneMode == CutsceneMode.DIALOG && this.dialog.getConversationType() != DLGConversationType.COMPUTER) {
      if (BitWise.InstanceOfObject(this.currentEntry.listener, ModuleObjectType.ModuleObject) && BitWise.InstanceOfObject(this.currentEntry.speaker, ModuleObjectType.ModuleObject)) {
        const listenerCre = this.currentEntry.listener as ModuleCreature;
        const speakerCre = this.currentEntry.speaker as ModuleCreature;
        if (
          !this.currentEntry.listener.lockDialogOrientation &&
          BitWise.InstanceOfObject(this.currentEntry.listener, ModuleObjectType.ModuleCreature) &&
          listenerCre.orientOnClick !== false
        ) {
          this.currentEntry.listener.FacePoint(this.currentEntry.speaker.position);
        }
        if (
          !this.currentEntry.speaker.lockDialogOrientation &&
          BitWise.InstanceOfObject(this.currentEntry.speaker, ModuleObjectType.ModuleCreature) &&
          speakerCre.orientOnClick !== false
        ) {
          this.currentEntry.speaker.FacePoint(this.currentEntry.listener.position);
        }
      }
    }

    // Node delay (SendDialogEntry / SetDialogDelay) — seconds → ms
    const delaySec = this.computeEntryDelaySeconds(entry);
    entry.setNodeDelay(delaySec * 1000);
    //Node camera
    this.setEntryCamera(entry);

    //scripts
    entry.runScripts();

    //replies
    const replies = this.dialog.getAvailableReplies(entry);
    this.currentReplies = replies;

    //vo
    entry.playVoiceOver(this.audioEmitter);


    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      if(entry.isContinueDialog() && !isComputerCameraEntry){
        this.onReplySelect(replies[0]);
      }else{
        GameState.MenuManager.InGameComputer.setReplies(replies);
      }
    }else{
      GameState.MenuManager.InGameDialog.setReplies(replies);
    }
  }

  /**
   * Compute entry delay in seconds (SendDialogEntry delay selection).
   */
  static computeEntryDelaySeconds(entry: DLGNode): number {
    const hasVO = !!entry.getVoiceResRef();
    const explicitDelay = (entry.waitFlags & DLGNode.WAIT_EXPLICIT_DELAY) !== 0;

    if(!hasVO && !explicitDelay){
      if(this.cutsceneMode == CutsceneMode.ANIMATED){
        return 0;
      }
      // SetDialogDelay floors the spoken-time estimate to 0.01s
      return Math.max(0.01, DLGNode.estimateSpokenTimeSeconds(entry.getCompiledString()));
    }

    if((entry.delay >>> 0) === DLGNode.DELAY_UNSET){
      return 0;
    }
    return entry.delay >>> 0;
  }

  /**
   * SetComputerCameraShot CamVidEffect mapping for computer
   * placeable entries: -1 → 0 (enable effect 0), -2 → disable (-1), else pass-through.
   */
  static resolveComputerCamVidEffect(entry: DLGNode): number {
    if(!entry || entry.cameraAngle != DLGCameraAngle.ANGLE_PLACEABLE_CAMERA){
      return -1;
    }
    const v = entry.camVidEffect;
    if(v === -2){ return -1; }
    if(v === -1){ return 0; }
    return v;
  }

  /**
   * SetLiveFeedMessageVisible — hide when CamVidEffect is -2 or 10.
   */
  static isComputerLiveFeedVisible(camVidEffect: number): boolean {
    return camVidEffect !== -2 && camVidEffect !== 10;
  }

  /**
   * Select a reply at an index
   * @param index - The index of the reply to select
   */
  static selectReplyAtIndex(index: number) {
    const reply = this.currentReplies[index];
    if(!reply){
      console.warn('CutsceneManager.selectReplyAtIndex: No reply found');
      return;
    }

    if(this.state != ConversationState.WAITING_FOR_PC_CHOICE){
      console.warn('CutsceneManager.selectReplyAtIndex: Not in waiting for pc choice state');
      return;
    }
    this.onReplySelect(reply);
  }

  /**
   * Handle the selection of a reply
   * @param reply - The reply to handle
   */
  static onReplySelect(reply: DLGNode) {
    if(this.paused){
      return;
    }
    if (!reply) {
      this.endConversation();
      return;
    }
    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameComputer.setDialogMode(ConversationState.LISTENING_TO_SPEAKER);
    }else{
      GameState.MenuManager.InGameDialog.setDialogMode(ConversationState.LISTENING_TO_SPEAKER);
    }
    reply.updateJournal();
    reply.runScripts();
    const entry = this.getNextEntry(reply.entries);
    if(entry){
      this.showEntry(entry);
    }else{
      this.endConversation();
    }
  }

  /**
   * Show the replies for a dialog entry
   * @param entry - The entry to show the replies for
   */
  static showReplies(entry: DLGNode) {
    this.state = ConversationState.WAITING_FOR_PC_CHOICE;
    this.currentEntry = undefined;
    this.isListening = false;
    if (GameState.Mode != EngineMode.DIALOG)
      return;
    
    //Get First Reply
    const reply = this.dialog.getReplyByIndex(entry.replies[0]?.index);
    if(!reply){
      console.warn('CutsceneManager.showReplies: No reply found');
      this.endConversation();
      return;
    }
    
    const isContinueDialog = entry.replies.length == 1 && reply.isContinueDialog();
    const isEndDialog = entry.replies.length == 1 && reply.isEndDialog();

    //End Dialog
    if (isEndDialog || !entry.replies.length) {
      if(!entry.replies.length){
        console.warn('CutsceneManager.showReplies: No replies found');
      }

      reply?.runScripts();
      this.endConversation();
      return;
    }

    //Continue Dialog
    if (isContinueDialog) {
      reply?.runScripts();
      const nextEntry = this.getNextEntry(reply.entries);
      if(nextEntry){
        this.showEntry(nextEntry);
      }else{
        this.endConversation();
      }
      return;
    }

    //Update Speaker Animation State
    try {
      if(BitWise.InstanceOfObject(this.getCurrentOwner(), ModuleObjectType.ModuleCreature)){
        this.playDialogCreatureAnimation(this.getCurrentOwner(), ModuleCreatureAnimState.LISTEN);
      }
    } catch (e: any) {
      console.error(e);
    }

    //Update Listener Animation State
    try {
      if(BitWise.InstanceOfObject(this.getCurrentListener(), ModuleObjectType.ModuleCreature)){
        this.playDialogCreatureAnimation(this.getCurrentListener(), ModuleCreatureAnimState.LISTEN);
      }
    } catch (e: any) {
      console.error(e);
    }

    // ShowDialogReplies — swap speaker/listener then
    // UpdateShotCamera with the first reply's camera fields.
    this.setReplyCamera(entry, reply);

    if(this.dialog.getConversationType() == DLGConversationType.COMPUTER){
      GameState.MenuManager.InGameComputer.setDialogMode(ConversationState.WAITING_FOR_PC_CHOICE);
    }else{
      GameState.MenuManager.InGameDialog.setDialogMode(ConversationState.WAITING_FOR_PC_CHOICE);
    }
  }

  /**
   * End the conversation
   * @param aborted - Whether the conversation was aborted
   */
  static endConversation(aborted = false) {
    const wasBark = this.cutsceneMode == CutsceneMode.BARK;
    const hadPendingPartySwitch = !!this.pendingPartyDialogSwitch;
    // Capture before teardown — ScriptEndDialogu / k_def_endconv (master 1011)
    const endDialogTargets: ModuleObject[] = [];
    const pushEndDialog = (obj: ModuleObject | undefined) => {
      if(!obj || endDialogTargets.indexOf(obj) >= 0) return;
      endDialogTargets.push(obj);
    };
    pushEndDialog(this.owner);
    pushEndDialog(this.listener);
    for(let i = 0; i < this.dialogAnimParticipants.length; i++){
      pushEndDialog(this.dialogAnimParticipants[i]);
    }

    this.pendingPartyDialogSwitch = undefined;
    this.active = false;
    this.paused = false;
    this.clearPendingDialog();
    this.clearParticipantRetry();
    this.dialogAnimParticipants = [];
    this.barkScreenX = -1;
    this.barkScreenY = -1;
    this.dialogNonDependantNames.clear();
    this.ended = true;
    if(!wasBark){
      this.audioEmitter.stop();
      if(this.dialog?.getConversationType() == DLGConversationType.COMPUTER){
        GameState.MenuManager.InGameComputer.close();
        GameState.MenuManager.InGameComputerCam.hide();
      }else{
        GameState.MenuManager.InGameDialog.close();
      }
    }
    GameState.currentCamera = GameState.camera;
    this.state = ConversationState.INVALID;

    if(this.dialog){
      if (this.dialog.animatedCamera instanceof OdysseyModel3D)
        this.dialog.animatedCamera.animationManager.currentAnimation = undefined;
      console.log('CutsceneManager.endConversation: onEndConversation', this.dialog.scripts.onEndConversation);
      if (!aborted) {
        if(this.dialog.scripts.onEndConversation){
          this.dialog.scripts.onEndConversation.run(this.owner, 0);
        }
      }else{
        console.log('CutsceneManager.endConversation: onEndConversationAbort', this.dialog.scripts.onEndConversationAbort);
        if(this.dialog.scripts.onEndConversationAbort){
          this.dialog.scripts.onEndConversationAbort.run(this.owner, 0);
        }
      }
      this.dialog.releaseStuntActors();
      // SetDialogDelay — re-show equipped items at conversation end
      this.showEquippedItemsAfterDialog();
      if(this.cutsceneMode == CutsceneMode.ANIMATED){
        GameState.FadeOverlayManager.FadeInFromCutscene();
      }
    }

    // Creature ScriptEndDialogu (k_def_endconv → k_ai_master 1011) after DLG EndConversation
    for(let i = 0; i < endDialogTargets.length; i++){
      const target = endDialogTargets[i];
      if(typeof target.onEndDialog === 'function'){
        target.onEndDialog();
      }
    }

    // SetGlobalDialogState(0): release any remaining holdWorldFadeInForDialog
    // (also covers aborting a pending party-dialog switch fade before StartDialog).
    if(GameState.holdWorldFadeInForDialog || hadPendingPartySwitch){
      GameState.holdWorldFadeInForDialog = false;
      GameState.FadeOverlayManager.FadeIn(
        GameState.FadeOverlayManager.HOLD_WORLD_FADE_IN_LENGTH,
        0, 0, 0,
        GameState.FadeOverlayManager.HOLD_WORLD_FADE_IN_WAIT
      );
    }

    this.dialog = undefined;
    this.cutsceneMode = CutsceneMode.DIALOG;
    GameState.VideoEffectManager.SetVideoEffect(-1);

    // Post-dialog character switch restore (unless CancelPostDialogCharacterSwitch).
    if(typeof this.postDialogRestoreNpcId === 'number'){
      const restoreId = this.postDialogRestoreNpcId;
      this.postDialogRestoreNpcId = undefined;
      try{
        GameState.PartyManager.SwitchPlayerCharacter(restoreId);
      }catch(e){
        console.warn('CutsceneManager.endConversation: post-dialog character switch failed', e);
      }
    }

    // overlay stop when leaving dialog (SetOverlayAnimation arg3=0).
    const stopOverlayOn = (obj: ModuleObject | undefined) => {
      if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)){
        const c = obj as ModuleCreature;
        if(typeof c.stopOverlayAnimation === 'function'){
          c.stopOverlayAnimation();
        }
        c.dialogAnimation = null;
      }
    };
    stopOverlayOn(this.owner);
    stopOverlayOn(this.listener);

    const audioEngine = AudioEngine.GetAudioEngine();
    // K2 ~: StopDucking only — area BGM keeps playing.
    // K1 never ducked; stop is still safe (restores scale 1).
    // AmbientTrack is play-once; leftover source cleared on UnloadArea (500ms fade).
    audioEngine.bgmTimer = 0;
    audioEngine.stopDuckingMusicAndAmbientSounds();

    if(wasBark){
      GameState.RestoreEnginePlayMode();
    }
  }

  /**
   * Set the participant animations for an animated cutscene dialog entry
   * @param entry - The entry to set the participant animations for
   */
  static setAnimatedEntryAnimations(entry: DLGNode) {
    for (let i = 0; i < entry.animations.length; i++) {
      const participant = entry.animations[i];
      const stuntKey = (participant.participant || '').toLocaleLowerCase();
      if (this.dialog.stuntActors.has(stuntKey)) {
        try {
          const actor = this.dialog.stuntActors.get(stuntKey);
          if(!actor){ continue; }
          // Unbound after SpawnAvailableNPC race — try live tag; retry window
          // reloads stunt CUT anims via rebindMissingStuntActors.
          if(!BitWise.InstanceOfObject(actor.moduleObject, ModuleObjectType.ModuleCreature)){
            const live = this.resolveDialogParticipantObject(participant.participant);
            if(BitWise.InstanceOfObject(live, ModuleObjectType.ModuleCreature)){
              actor.moduleObject = live;
              live.setCutsceneMode(true);
            }else{
              if(!this.isDialogNonDependant(participant.participant)){
                console.warn('CutsceneManager: dialog missing stunt participant', participant.participant);
              }
              continue;
            }
          }
          const creature = actor.moduleObject as ModuleCreature;
          if(!creature.model || !actor.animations?.length){
            if(!this.isDialogNonDependant(participant.participant)){
              console.warn('CutsceneManager: stunt participant not ready', participant.participant);
            }
            continue;
          }
          const animationName = this.getCUTAnimationName(participant.animation);
          const odysseyAnimation = actor.animations.find(
            (a) => a.name.toLocaleLowerCase() == animationName.toLocaleLowerCase()
          );
          if(odysseyAnimation){
            this.registerDialogAnimParticipant(creature);
            creature.dialogPlayOdysseyAnimation(odysseyAnimation, participant.animation);
          }
        } catch (e: any) {
          console.error(e);
        }
      } else {
        const actor = this.resolveDialogParticipantObject(participant.participant);
        if(!actor){
          // : missing + NonDependant → skip; missing + required → retry wait
          if(!this.isDialogNonDependant(participant.participant)){
            console.warn('CutsceneManager: dialog missing participant', participant.participant);
          }
          continue;
        }
        if (participant.animation >= 10000) {
          if (actor.animationConstantToAnimation(participant.animation)) {
            this.playDialogCreatureAnimation(actor, participant.animation);
          } else {
            console.error('Anim', participant.animation);
          }
        }else{
          const anim = this.getDialogAnimation(participant.animation);
          if (anim) {
            this.registerDialogAnimParticipant(actor);
            actor.dialogPlayAnimation(anim);
          } else {
            console.error('Anim', participant.animation);
          }  
        }
      }
    }
  }

  /**
   * Play a dialog participant animation — SetDialogAnimations
   * uses SetAnimation for constants >= 10000, not a
   * parallel dialog-only slot. Combat READY/attack stances must go through
   * animationState or CutsceneAttack playTwoDAAnimation is blocked.
   */
  static playDialogCreatureAnimation(actor: ModuleObject, animationConstant: number) {
    this.registerDialogAnimParticipant(actor);
    if(!BitWise.InstanceOfObject(actor, ModuleObjectType.ModuleCreature)){
      const anim = actor.animationConstantToAnimation(animationConstant);
      if(anim){
        actor.dialogPlayAnimation(anim);
      }
      return;
    }
    const creature = actor as ModuleCreature;
    creature.dialogAnimation = null;
    creature.setAnimationState(animationConstant);
  }

  /**
   * SetDialogAnimations — speaker default 0x2736 / 0x27aa when
   * IsInjured (current/max HP < 0.2).
   */
  static getDialogTalkAnimation(actor: ModuleObject | undefined): ModuleCreatureAnimState {
    return actor?.isInjured?.() ? ModuleCreatureAnimState.TALK_INJURED : ModuleCreatureAnimState.TALK_NORMAL;
  }

  /**
   * SetDialogAnimations — listener default 0x272e / 0x27ab when
   * IsInjured (current/max HP < 0.2).
   */
  static getDialogListenAnimation(actor: ModuleObject | undefined): ModuleCreatureAnimState {
    return actor?.isInjured?.() ? ModuleCreatureAnimState.LISTEN_INJURED : ModuleCreatureAnimState.LISTEN;
  }

  /**
   * CanPlayDialogAnimations — skip when dead or debilitated.
   */
  static canPlayDialogAnimations(actor: ModuleObject | undefined): boolean {
    if(!actor){ return false; }
    if(actor.isDead?.()){ return false; }
    if(actor.isDebilitated?.()){ return false; }
    return true;
  }

  /**
   * Set the participant animations for a normal dialog entry
   * @param entry - The entry to set the participant animations for
   */
  static setEntryAnimations(entry: DLGNode) {
    // Speaker — SetDialogAnimations (0x2736 / 0x27aa)
    if (
      BitWise.InstanceOfObject(this.currentEntry.speaker, ModuleObjectType.ModuleCreature) &&
      this.canPlayDialogAnimations(this.currentEntry.speaker)
    ) {
      this.playDialogCreatureAnimation(
        this.currentEntry.speaker,
        this.getDialogTalkAnimation(this.currentEntry.speaker)
      );
    }

    // Listener — SetDialogAnimations (0x272e / 0x27ab)
    if (
      BitWise.InstanceOfObject(this.currentEntry.listener, ModuleObjectType.ModuleCreature) &&
      this.canPlayDialogAnimations(this.currentEntry.listener)
    ) {
      this.playDialogCreatureAnimation(
        this.currentEntry.listener,
        this.getDialogListenAnimation(this.currentEntry.listener)
      );
    }

    for (let i = 0; i < entry.animations.length; i++) {
      const participant = entry.animations[i];
      if(!participant.participant){ continue; }
      const actor = GameState.ModuleObjectManager.GetObjectByTag(participant.participant);
      if(!actor){
        if(!this.isDialogNonDependant(participant.participant)){
          console.warn('CutsceneManager: dialog missing participant', participant.participant);
        }
        continue;
      }
      if (participant.animation >= 10000) {
        if (actor.animationConstantToAnimation(participant.animation)) {
          this.playDialogCreatureAnimation(actor, participant.animation);
        } else {
          console.error('Anim', participant.animation);
        }
      }else{
        const anim = this.getDialogAnimation(participant.animation);
        if (anim) {
          this.registerDialogAnimParticipant(actor);
          actor.dialogPlayAnimation(anim);
        } else {
          console.error('Anim', participant.animation);
        }
      }
    }
  }

  /**
   * Get the CUT animation name — GetCameraAnimationName.
   */
  static getCUTAnimationName(index = 0) {
    return getCameraAnimationName(index);
  }

  /**
   * Get the dialog animation
   * @param index - The index of the animation
   * @returns The dialog animation
   */
  static getDialogAnimation(index = 0): any {
    console.log('GetDialogAnimation', index);
    if (index >= 1000 && index < 10000) {
      const name = getCameraAnimationName(index);
      if(name === 'none') return undefined;
      // IsFireForgetDialogAnimation / IsLoopingDialogStuntAnimation:
      // 1000–0x52F (cut / cut*w) → fire-forget dialog CUT
      // 0x578–0x6BF (cut*l / cut*wl) → looping stunt CUT
      // Marking base CUT as looping made WAIT_ANIM (e.g. 101awake entry 9
      // cut012) never clear after FadeType 4 — screen stuck black until skip.
      const looping = index >= 0x578 && index <= 0x6bf;
      return {
        name,
        looping: looping ? '1' : '0',
        fireforget: looping ? '0' : '1',
        dialog: '1',
      };
    } else if (index >= 10000) {
      const animations2DA = GameState.TwoDAManager.datatables.get('animations');
      if(!animations2DA){ return; }

      switch (index - 10000) {
        case 30:
          return animations2DA.rows[18];
        case 35:
          return animations2DA.rows[24];
        case 38:
          return animations2DA.rows[25];
        case 39:
          return animations2DA.rows[27];
        case 40:
          return animations2DA.rows[26];
        case 41:
          return animations2DA.rows[29];
        case 42:
          return animations2DA.rows[28];
        case 121:
          return animations2DA.rows[44];
        case 127:
          return animations2DA.rows[38];
        case 403:
          return animations2DA.rows[462];
        case 404:
          return animations2DA.rows[463];
        case 405:
          return animations2DA.rows[464];
        case 406:
          return animations2DA.rows[465];
        case 407:
          return animations2DA.rows[466];
        case 408:
          return animations2DA.rows[467];
        case 409:
          return animations2DA.rows[468];
        case 410:
          return animations2DA.rows[469];
        case 411:
          return animations2DA.rows[470];
        case 412:
          return animations2DA.rows[471];
        case 413:
          return animations2DA.rows[472];
        case 424:
          return animations2DA.rows[316];
        case 425:
          return animations2DA.rows[317];
        case 426:
          return animations2DA.rows[318];
        case 427:
          return animations2DA.rows[319];
        case 428:
          return animations2DA.rows[320];
        case 499:
          return animations2DA.rows[557];
        case 500:
          return animations2DA.rows[558];
        case 501:
          return animations2DA.rows[559];
        case 502:
          return animations2DA.rows[560];
        case 503:
          return animations2DA.rows[561];
        case 504:
          return animations2DA.rows[562];
        case 505:
          return animations2DA.rows[563];
        case 506:
          return animations2DA.rows[564];
        case 507:
          return animations2DA.rows[565];
        case 508:
          return animations2DA.rows[566];
        case 509:
          return animations2DA.rows[567];
      }
    }

    return undefined;
  }

  /**
   * Set the camera for an entry — HandleDialogEntry
   * SetAnimatedCamera (anim id must be 1000..0x6BF).
   */
  static setEntryCamera(entry: DLGNode){
    let angle = entry.cameraAngle;
    // SendDialogEntryNode resolves ANGLE_RANDOM + advances PRNG
    if(this.dialogCameraPrng){
      angle = resolveEntryCameraAngle(angle, this.dialogCameraPrng);
    }else if(angle == DLGCameraAngle.ANGLE_RANDOM){
      angle = DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER;
    }
    const fov = entry.camFieldOfView;
    const cameraAnimation = entry.cameraAnimation;
    // Cache side once per shot (AddCalculatedLineOfAction)
    this.cameraState.dialogCamSide = undefined;
    this.cameraState.camHeightOffset = entry.camHeightOffset ?? 0;
    this.cameraState.tarHeightOffset = entry.tarHeightOffset ?? 0;
    this.cameraState.closeUpExtra = 0;
    this.cameraState.camFieldOfView = entry.camFieldOfView;

    // Animated cut: try SetAnimatedCamera when anim id in range; else shot framing
    const useAnimated =
      this.cutsceneMode == CutsceneMode.ANIMATED
      || angle == DLGCameraAngle.ANGLE_ANIMATED_CAMERA;
    if(useAnimated && this.trySetAnimatedCamera(cameraAnimation, fov)){
      return;
    }

    if(angle == DLGCameraAngle.ANGLE_PLACEABLE_CAMERA){
      // Placeable uses CameraID only (LoadDialogCamera clears id unless angle==6)
      this.setPlaceableCamera(entry.cameraID);
      return;
    }

    // Angle 4 without a valid CUT anim — UpdateShotCamera framing fallback (treat as speaker)
    if(angle == DLGCameraAngle.ANGLE_ANIMATED_CAMERA){
      angle = DLGCameraAngle.ANGLE_SPEAKER;
    }

    // Angle 5: UpdateShotCamera early-outs before SetShot (hold framing)
    if(angle == DLGCameraAngle.ANGLE_FOCUS_PLAYER){
      this.cameraState.mode = CameraMode.DIALOG;
      this.cameraState.cameraAngle = DLGCameraAngle.ANGLE_FOCUS_PLAYER;
      if(entry.listener && entry.speaker){
        this.setCameraParticipants(entry.listener, entry.speaker);
      }
      return;
    }

    this.setDialogCamera(angle);
    if(angle == DLGCameraAngle.ANGLE_SPEAKER){
      this.cameraState.closeUpExtra = this.resolveCloseUpExtra(entry, entry.speaker);
    }
  }

  /**
   * ShowDialogReplies — swap so player is speaker, then
   * UpdateShotCamera with the first reply's camera angle / heights / id.
   */
  static setReplyCamera(entry: DLGNode, reply: DLGNode){
    const prevSpeaker =
      this.cameraState.speaker.participant
      || entry.speaker
      || this.owner;
    const player =
      (this.listener && this.listener.isPM)
        ? this.listener
        : (GameState.PartyManager.party[0] || this.listener);

    let angle = reply.cameraAngle;
    if(this.dialogCameraPrng){
      angle = resolveReplyCameraAngle(angle, this.dialogCameraPrng);
    }else if(angle == DLGCameraAngle.ANGLE_RANDOM){
      angle = DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER;
    }

    this.cameraState.dialogCamSide = undefined;
    this.cameraState.camHeightOffset = reply.camHeightOffset ?? 0;
    this.cameraState.tarHeightOffset = reply.tarHeightOffset ?? 0;
    this.cameraState.closeUpExtra = 0;
    this.cameraState.camFieldOfView = reply.camFieldOfView;

    // Angle 5: restore pre-swap participants and skip SetShot
    if(angle == DLGCameraAngle.ANGLE_FOCUS_PLAYER){
      this.cameraState.mode = CameraMode.DIALOG;
      this.cameraState.cameraAngle = DLGCameraAngle.ANGLE_FOCUS_PLAYER;
      if(prevSpeaker && player){
        this.setCameraParticipants(player, prevSpeaker);
      }
      return;
    }

    // Swapped pair: speaker = player, listener = previous speaker
    if(player && prevSpeaker){
      this.setCameraParticipants(prevSpeaker, player);
    }

    const useAnimated = angle == DLGCameraAngle.ANGLE_ANIMATED_CAMERA;
    if(useAnimated && this.trySetAnimatedCamera(reply.cameraAnimation, reply.camFieldOfView)){
      return;
    }

    if(angle == DLGCameraAngle.ANGLE_PLACEABLE_CAMERA){
      this.setPlaceableCamera(reply.cameraID);
      return;
    }

    if(angle == DLGCameraAngle.ANGLE_ANIMATED_CAMERA){
      angle = DLGCameraAngle.ANGLE_SPEAKER;
    }

    this.setDialogCamera(angle);
    // setDialogCamera re-binds entry participants when currentEntry exists
    // reply phase clears currentEntry, so re-apply the swap.
    if(player && prevSpeaker){
      this.setCameraParticipants(prevSpeaker, player);
    }
    if(angle == DLGCameraAngle.ANGLE_SPEAKER){
      this.cameraState.closeUpExtra = this.resolveCloseUpExtra(reply, player);
    }
  }

  /**
   * UpdateShotCamera CU_PB_Range path — speaker AnimList id → dialoganimations row.
   */
  static resolveCloseUpExtra(node: DLGNode, speaker: ModuleObject | undefined): number {
    if(!node || !speaker) return 0;
    const table = GameState.TwoDAManager.datatables.get('dialoganimations');
    if(!table) return 0;

    const speakerTag = (speaker.getTag?.() || '').toLowerCase();
    let animId = 0;
    for(let i = 0; i < node.animations.length; i++){
      const a = node.animations[i];
      const p = String(a.participant || '').toLowerCase();
      const matches =
        p === speakerTag
        || (p === 'owner' && speaker === this.owner)
        || (p === 'player' && speaker === this.listener)
        || (!p && speaker === (node.speaker || this.owner));
      if(!matches) continue;
      animId = Number(a.animation) || 0;
      break;
    }
    if(animId < 10000) return 0;

    let range = lookupDialogCloseUpExtra(animId, (rowIndex) => {
      return table.getByID(rowIndex) || table.rows[rowIndex];
    });
    // TSL UpdateShotCamera: appearance 0x235 gets an extra
    // quarter-unit close-up pull after CU_PB_Range lookup.
    if(
      GameState.GameKey == GameEngineType.TSL
      && (speaker as ModuleCreature).appearance == 0x235
    ){
      range += 0.25;
    }
    return range;
  }

  /**
   * SetAnimatedCamera
   * succeeds only when 999 < animId < 0x6c0 and CameraModel is loaded.
   * Play mode from IsLoopingDialogStuntAnimation (l/wl → loop, else one-shot).
   * @returns true if animated camera was applied
   */
  static trySetAnimatedCamera(nCamera: number, nFOV: number = -1): boolean {
    if(!(this.dialog?.animatedCamera instanceof OdysseyModel3D)){
      return false;
    }
    if(!(nCamera > 999 && nCamera < 0x6c0)){
      return false;
    }
    const animationName = getCameraAnimationName(nCamera);
    if(animationName === 'none'){
      return false;
    }
    const animation = this.dialog.animatedCamera.odysseyAnimationMap.get(animationName.toLowerCase().trim());
    if(!animation){
      return false;
    }

    const manager = this.dialog.animatedCamera.animationManager;
    const looping = isLoopingDialogStuntAnimation(nCamera);
    // Do not assign via currentAnimation setter — it always forces LOOPING.
    if(looping){
      manager.playAnimation(animation, AuroraAnimationFlag.LOOPING, { loop: true });
    }else{
      manager.playAnimation(animation, AuroraAnimationFlag.FIRE_FORGET, { loop: false });
    }
    this.cameraState.currentCameraAnimation = animation;
    this.cameraState.currentCameraAnimationElapsed = 0;
    if(this.currentEntry){
      this.currentEntry.checkList.cameraAnimationComplete = false;
    }
    this.cameraState.mode = CameraMode.ANIMATED;
    this.cameraState.cameraAnimation = nCamera;
    GameState.currentCamera = GameState.camera_animated;
    // SetAnimatedCamera SetClipDist(0.1, 10000)
    GameState.camera_animated.near = ANIMATED_CAMERA_NEAR;
    GameState.camera_animated.far = ANIMATED_CAMERA_FAR;
    if(nFOV != -1 && nFOV > 0){
      GameState.camera_animated.fov = nFOV;
    }else{
      GameState.camera_animated.fov = DIALOG_CAMERA_FOV;
    }
    GameState.camera_animated.updateProjectionMatrix();

    // Reply phase clears currentEntry — keep any swap already applied by setReplyCamera.
    this.bindCameraParticipantsFromActiveNode();
    return true;
  }

  /**
   * Set the animated camera — LoadAnimatedCamera / camerahook follow.
   * Prefer trySetAnimatedCamera; this path keeps legacy callers and falls back on failure.
   */
  static setAnimatedCamera(nCamera: number, nFOV: number = -1) {
    if(this.trySetAnimatedCamera(nCamera, nFOV)){
      return;
    }
    console.warn(`No animation found for camera [${nCamera}] falling back to dialog camera`);
    if(this.currentEntry){
      this.currentEntry.checkList.cameraAnimationComplete = true;
    }
    this.setDialogCamera(DLGCameraAngle.ANGLE_RANDOM);
  }

  /**
   * Set the camera participants
   * @param listener - The listener
   * @param speaker - The speaker
   */
  static setCameraParticipants(listener: ModuleObject, speaker: ModuleObject){
    this.cameraState.listener.participant = listener;
    this.cameraState.listener.position = undefined;
    this.cameraState.listener.rotation = undefined;
    this.cameraState.speaker.participant = speaker;
    this.cameraState.speaker.position = undefined;
    this.cameraState.speaker.rotation = undefined;
  }

  /**
   * Set the listener camera — legacy path; prefer setReplyCamera (ShowDialogReplies).
   * Angle 5 holds framing (UpdateShotCamera early-out before SetShot).
   */
  static setListenerCamera(){
    this.cameraState.mode = CameraMode.DIALOG;
    this.cameraState.cameraAngle = DLGCameraAngle.ANGLE_FOCUS_PLAYER;
    this.setCameraParticipants(this.owner, this.listener);
  }

  /**
   * Set the dialog camera
   * @param nAngle - The angle to set the camera to (ANGLE_RANDOM already resolved)
   */
  static setDialogCamera(nAngle: DLGCameraAngle) {
    GameState.currentCamera = GameState.camera_dialog;
    const fov = this.cameraState.camFieldOfView;
    GameState.camera_dialog.fov =
      (typeof fov === 'number' && fov > 0) ? fov : DIALOG_CAMERA_FOV;
    GameState.camera_dialog.updateProjectionMatrix();
    this.cameraState.mode = CameraMode.DIALOG;
    // Fallbacks that still pass ANGLE_RANDOM (placeable miss, etc.)
    this.cameraState.cameraAngle =
      (nAngle == DLGCameraAngle.ANGLE_RANDOM)
        ? DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER
        : nAngle;
    // Force reframing next update
    this.cameraState.listener.position = undefined;
    this.cameraState.speaker.position = undefined;
    this.bindCameraParticipantsFromActiveNode();
  }

  /**
   * Set the placeable camera — SetShotFromScript
   * UpdateShotCamera (arg1 == 6).
   * Looks up GIT CameraList by CameraID, rebuilds pose, and applies it onto
   * the dialog camera (SetShot type 6) — not a
   * separate render camera, so clip/FOV/shake stay on one dialog cam.
   */
  static setPlaceableCamera(nCamera: number) {
    const src = GameState.getCameraById(nCamera);
    if (!src) {
      console.warn(`No placeable camera found for camera [${nCamera}] falling back to dialog camera`);
      this.setDialogCamera(DLGCameraAngle.ANGLE_RANDOM);
      return;
    }

    this.applyPlaceableShotToDialogCamera(src);
    this.cameraState.mode = CameraMode.PLACEABLE;
    this.cameraState.cameraID = nCamera;
    // Reply phase clears currentEntry — keep any swap already applied by setReplyCamera.
    this.bindCameraParticipantsFromActiveNode();
    // Apply placeable MicRange to dialog audio falloff when present.
    this.applyPlaceableMicRange(nCamera);
  }

  /**
   * placeable cameras persist MicRange — apply as dialog AudioEmitter maxDistance.
   */
  static applyPlaceableMicRange(cameraId: number) {
    const cams = GameState.module?.area?.cameras;
    if(!cams || !this.audioEmitter){ return; }
    for(let i = 0; i < cams.length; i++){
      const cam = cams[i];
      if(cam?.cameraID === cameraId && typeof cam.micRange === 'number' && cam.micRange > 0){
        this.audioEmitter.setMaxDistance?.(cam.micRange);
        return;
      }
    }
  }

  /**
   * Copy a ModuleCamera PerspectiveCamera pose onto camera_dialog.
   * Mirrors SetShot(6, pos, quat, fov).
   */
  static applyPlaceableShotToDialogCamera(src: THREE.PerspectiveCamera) {
    const dialog = GameState.camera_dialog;
    dialog.position.copy(src.position);
    dialog.quaternion.copy(src.quaternion);

    const modded = isDialogGameModded(
      GameState.Flags.EnableOverride,
      !!ConfigClient.get('look_in_override')
    );
    // StartDialog gates the Aspyr placeable hack on the
    // "carth" conversation flag (constant); other dialogs leave it clear.
    const aspyrVanilla = GameState.GameKey === GameEngineType.TSL
      && isAspyrCarthDialogCameraHack(this.dialog?.resref || this.conversation_name);
    if(!modded && aspyrVanilla){
      applyAspyrPlaceableCameraHack(
        dialog.position, dialog.quaternion, modded, true,
        dialog.position, dialog.quaternion
      );
    }

    dialog.rotation.setFromQuaternion(dialog.quaternion, 'YZX');
    dialog.up.set(0, 0, 1);
    const fov = (typeof src.fov === 'number' && src.fov > 0) ? src.fov : DIALOG_CAMERA_FOV;
    dialog.fov = fov;
    dialog.updateProjectionMatrix();
    dialog.updateMatrixWorld(true);
    GameState.currentCamera = dialog;
  }

  /**
   * Bind speaker/listener for the active camera shot.
   * Prefer the current entry when present; otherwise keep an existing
   * reply-phase swap and only fall back to conversation owner/listener.
   */
  static bindCameraParticipantsFromActiveNode(){
    if(this.currentEntry){
      this.setCameraParticipants(this.currentEntry.listener, this.currentEntry.speaker);
      return;
    }
    if(this.cameraState.speaker.participant && this.cameraState.listener.participant){
      return;
    }
    this.setCameraParticipants(this.owner, this.listener);
  }

  /**
   * Update the cutscene manager
   * @param delta - The delta time
   */
  static update(delta: number = 0) {
    if (!this.dialog)
      return;

    // SendDialogEntryNode retry — before current-entry WaitFlags tick.
    this.tickParticipantRetry(delta);

    this.dialog.stuntActors.forEach( async (actor) => {
      const moduleObject = actor.moduleObject;
      if(moduleObject){
        moduleObject.box.setFromObject(moduleObject.container);
      }
    });

    this.updateCamera(delta);

    // PauseConversation only blocks SendDialogEntry advance — keep
    // current-entry WaitFlags / VO / fade / camera ticking while paused.
    if(this.currentEntry){
      this.pollParticipantAnimationWait();
      const updateComplete = this.currentEntry.update(delta);
      if(updateComplete && !this.currentEntry.repliesShown){
        if(this.paused){
          // SendDialogReplies — =1, =0xFFFFFFFF.
          this.pendingAdvance = true;
          this.pendingEntry = undefined;
        }else{
          this.currentEntry.repliesShown = true;
          this.showReplies(this.currentEntry);
        }
      }
    }

    // UpdateDialog — flush deferred advance once unpaused.
    this.flushPendingDialog();
  }

  /**
   * IsAnimationPlayingInDialog / AnimationDialog
   * WAIT_ANIM clears when no registered participant still plays a dialog
   * fire-forget or looping clip.
   */
  static pollParticipantAnimationWait() {
    const entry = this.currentEntry;
    if(!entry?.checkList) return;
    if((entry.waitFlags & DLGNode.WAIT_ANIM) === 0) return;
    if(entry.checkList.participantAnimationComplete) return;

    if(!this.dialogAnimParticipants.length){
      entry.checkList.participantAnimationComplete = true;
      return;
    }

    for(let i = 0; i < this.dialogAnimParticipants.length; i++){
      if(this.isDialogAnimationPlaying(this.dialogAnimParticipants[i])){
        return;
      }
    }
    entry.checkList.participantAnimationComplete = true;
  }

  /** True while a dialog fire-forget / looping anim is still driving the model.
   * AnimationDialog + IsAnimationPlayingInDialog: WAIT_ANIM holds while
   * the current clip is a dialog FF/looping type; clears when that clip ends
   * (FF) or is replaced. Looping holds only until the clip has started — a
   * forever-loop must not block entry advance (Delay still applies).
   */
  static isDialogAnimationPlaying(obj: ModuleObject): boolean {
    if(!BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)) return false;
    const creature = obj as ModuleCreature;
    const da = creature.dialogAnimation;
    if(da){
      const looping = !!parseInt(String(da.data?.looping ?? 0));
      const fireforget = !!parseInt(String(da.data?.fireforget ?? 0));
      if(fireforget){
        if(!da.started) return true;
        if(creature.model?.animationManager?.currentAnimation === da.animation) return true;
        return false;
      }
      if(looping){
        // Wait until the looping dialog clip has begun, then allow Delay to finish.
        return !da.started;
      }
      // Non-classified dialog clip still playing
      if(da.animation && creature.model?.animationManager?.currentAnimation === da.animation){
        return true;
      }
      return false;
    }
    // Constants routed through setAnimationState (playDialogCreatureAnimation)
    const anim = creature.animationState?.animation;
    if(anim){
      const fireforget = !!parseInt(String(anim.fireforget ?? 0));
      const looping = !!parseInt(String(anim.looping ?? 0));
      const dialog = !!parseInt(String((anim as any).dialog ?? 0));
      if(dialog && (fireforget || looping)){
        if(fireforget && creature.model?.animationManager?.currentAnimation){
          return true;
        }
        if(looping){
          return false;
        }
      }
    }
    return false;
  }

  static registerDialogAnimParticipant(actor: ModuleObject | undefined) {
    if(!actor) return;
    if(this.dialogAnimParticipants.indexOf(actor) >= 0) return;
    this.dialogAnimParticipants.push(actor);
  }

  /**
   * Update the camera
   * @param delta - The delta time
   */
  static updateCamera(delta: number = 0) {
    if (!this.dialog || this.cutsceneMode == CutsceneMode.BARK) return;

    const isComputer = this.dialog.getConversationType() == DLGConversationType.COMPUTER;
    // Computer panel vs placeable-cam overlay — toggle only on visibility change.
    // (Previously show/hide every tick; InGameComputer defaulted engineMode GUI
    // and spammed SetEngineMode 0↔3.)
    if(isComputer){
      if(this.cameraState.mode == CameraMode.PLACEABLE){
        if(GameState.MenuManager.InGameComputer.isVisible()){
          GameState.MenuManager.InGameComputer.hide();
        }
        if(!GameState.MenuManager.InGameComputerCam.isVisible()){
          GameState.MenuManager.InGameComputerCam.show();
        }
      }else{
        if(!GameState.MenuManager.InGameComputer.isVisible()){
          GameState.MenuManager.InGameComputer.show();
        }
        if(GameState.MenuManager.InGameComputerCam.isVisible()){
          GameState.MenuManager.InGameComputerCam.hide();
        }
      }
    }else if(GameState.MenuManager.InGameComputerCam.isVisible()){
      GameState.MenuManager.InGameComputerCam.hide();
    }

    if (this.cameraState.mode == CameraMode.ANIMATED) {
      this.updateAnimatedCamera(delta);
      return;
    }

    if (this.cameraState.mode == CameraMode.PLACEABLE) {
      // Reply phase clears currentEntry — ownership lives on cameraState.cameraID.
      // Re-apply each tick like Control type-6 (stored shot → dialog cam).
      this.setPlaceableCamera(this.cameraState.cameraID);
      GameState.forwardVector.set(0, 0, -1).applyQuaternion(GameState.camera_dialog.quaternion);
      if(isComputer){
        const camVid = this.currentEntry?.camVidEffect ?? -1;
        GameState.MenuManager.InGameComputerCam.setLiveFeedVisible(
          this.isComputerLiveFeedVisible(camVid)
        );
      }
      return;
    }

    if (this.cameraState.mode == CameraMode.DIALOG) {
      const listener = this.cameraState.listener;
      const speaker = this.cameraState.speaker;

      if(!listener.participant || !speaker.participant){
        return;
      }

      // Always refresh tracked poses — dialog shots follow CAMERAHOOK each frame.
      // Do not early-out on body position alone: first-frame hook matrixWorld can be
      // at origin while participant.position is already correct, which previously
      // locked auto-angle cameras at (0,0,0) until a body move.
      if(!listener.position){
        listener.position = new THREE.Vector3();
      }
      if(!listener.rotation){
        listener.rotation = new THREE.Vector3();
      }
      listener.position.copy(listener.participant.position);
      listener.rotation.set(
        listener.participant.rotation.x,
        listener.participant.rotation.y,
        listener.participant.rotation.z
      );

      if(!speaker.position){
        speaker.position = new THREE.Vector3();
      }
      if(!speaker.rotation){
        speaker.rotation = new THREE.Vector3();
      }
      speaker.position.copy(speaker.participant.position);
      speaker.rotation.set(
        speaker.participant.rotation.x,
        speaker.participant.rotation.y,
        speaker.participant.rotation.z
      );

      switch (this.cameraState.cameraAngle) {
        case DLGCameraAngle.ANGLE_SPEAKER:
          this.updateCameraAngleSpeaker(delta);
          break;
        case DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER:
          this.updateCameraAngleSpeakerBehindPlayer(delta);
          break;
        case DLGCameraAngle.ANGLE_SPEAKER_AND_PLAYER_SIDE:
          this.updateCameraAngleTwoShot(delta);
          break;
        case DLGCameraAngle.ANGLE_FOCUS_PLAYER:
          // UpdateShotCamera: angle 5 skips SetShot — hold framing
          break;
        default:
          // Unresolved ANGLE_RANDOM (0) or unknown — frame as speaker
          this.updateCameraAngleSpeaker(delta);
          break;
      }
      return;
    }
  }

  /**
   * Same-room gate for dialog shots that interpolate across both participants
   * (OTS / two-shot). Cross-room pairs make GetCameraParameters type 2/3 pull
   * the camera outside the module; HitCheck then sets and
   * reframes as type 1 — we short-circuit to that outcome when rooms differ.
   */
  static validateCameraParticipants(){
    const listener = this.cameraState.listener.participant;
    const speaker = this.cameraState.speaker.participant;
    if(!listener || !speaker){
      return false;
    }
    if(!listener.room || !speaker.room || (listener?.room !== speaker?.room))
      return false;
    return true;
  }

  /**
   * Update the animated camera
   * @param delta - The delta time
   */
  static updateAnimatedCamera(delta: number = 0){
    const cameraModel = this.dialog.animatedCamera;
    if(!cameraModel){
      return;
    }

    const manager = cameraModel.animationManager;
    if(!manager){
      return;
    }

    if(!manager.currentAnimation){
      if(this.currentEntry){
        this.currentEntry.checkList.cameraAnimationComplete = true;
      }
      return;
    }
    GameState.currentCamera = GameState.camera_animated;
    manager.update(delta);
    cameraModel.camerahook.updateMatrixWorld();
    cameraModel.camerahook.getWorldPosition(GameState.camera_animated.position);
    cameraModel.camerahook.getWorldQuaternion(GameState.camera_animated.quaternion);
    GameState.camera_animated.updateProjectionMatrix();
    if(!manager.currentAnimation && this.currentEntry){
      this.currentEntry.checkList.cameraAnimationComplete = true;
    }
  }

  static #tmpDialogCamPos = new THREE.Vector3();
  static #tmpDialogCamLook = new THREE.Vector3();

  /**
   * Apply GetCameraParameters framing  to camera_dialog.
   * Side from AddCalculatedLineOfAction / GetSideUnobstructed (cached per entry).
   * On HitCheck failure, sets and reframes as type-1 close-up.
   * OldHitCheck (DLGObject) → body position instead of CAMERAHOOK (Control).
   */
  static applyDialogCameraShot(
    shotType: number,
    speakerPos: THREE.Vector3,
    listenerPos: THREE.Vector3,
    swapParticipants = false
  ){
    const sp = swapParticipants ? listenerPos : speakerPos;
    const lp = swapParticipants ? speakerPos : listenerPos;
    const heightBias = this.cameraState.camHeightOffset ?? 0;
    const focusHeightBias = this.cameraState.tarHeightOffset ?? 0;
    let closeUpExtra = 0;
    if((shotType | 0) === 1){
      closeUpExtra = this.cameraState.closeUpExtra ?? 0;
    }else{
      this.cameraState.closeUpExtra = 0;
    }
    if(this.cameraState.dialogCamSide == null){
      this.cameraState.dialogCamSide = this.pickDialogCameraSide(sp, lp);
    }
    const side = this.cameraState.dialogCamSide;
    let collided = false;

    const speakerObj = swapParticipants
      ? this.cameraState.listener.participant
      : this.cameraState.speaker.participant;
    const listenerObj = swapParticipants
      ? this.cameraState.speaker.participant
      : this.cameraState.listener.participant;
    const spApp = BitWise.InstanceOfObject(speakerObj, ModuleObjectType.ModuleCreature)
      ? (speakerObj as ModuleCreature).getAppearance()?.id ?? -1
      : -1;
    const lpApp = BitWise.InstanceOfObject(listenerObj, ModuleObjectType.ModuleCreature)
      ? (listenerObj as ModuleCreature).getAppearance()?.id ?? -1
      : -1;
    const modded = isDialogGameModded(
      GameState.Flags.EnableOverride,
      !!ConfigClient.get('look_in_override')
    );
    // Same gate as the placeable hack (constant / "carth" dialog).
    const aspyrVanilla = GameState.GameKey === GameEngineType.TSL
      && isAspyrCarthDialogCameraHack(this.dialog?.resref || this.conversation_name);
    const aspyr = resolveAspyrAppearanceCameraOverrides(
      spApp, lpApp, shotType, modded, aspyrVanilla
    );

    computeDialogCameraShot(
      shotType, sp, lp,
      this.#tmpDialogCamPos, this.#tmpDialogCamLook,
      {
        side, heightBias, focusHeightBias, closeUpExtra,
        aspyrDistanceOverride: aspyr.distance,
        aspyrHeightOverride: aspyr.height,
        aspyrAngleOverrideDeg: aspyr.angleDeg,
      }
    );

    if(this.checkDialogCameraObstruction(shotType, this.#tmpDialogCamPos, this.#tmpDialogCamLook, sp, lp)){
      collided = true;
      computeDialogCameraShot(
        1, sp, lp,
        this.#tmpDialogCamPos, this.#tmpDialogCamLook,
        { collided: true, side, heightBias, focusHeightBias }
      );
      // Pull camera in along look↔cam when the fallback shot is still obstructed.
      const maxDist = this.#tmpDialogCamPos.distanceTo(this.#tmpDialogCamLook);
      if(maxDist > 0.01){
        const adjusted = this.adjustCameraDistanceForCollision(
          this.#tmpDialogCamPos, this.#tmpDialogCamLook, maxDist
        );
        if(adjusted < maxDist - 1e-3){
          this.#tmpCamDir.copy(this.#tmpDialogCamPos).sub(this.#tmpDialogCamLook).normalize();
          this.#tmpDialogCamPos.copy(this.#tmpDialogCamLook).addScaledVector(this.#tmpCamDir, adjusted);
        }
      }
    }

    const fov = this.cameraState.camFieldOfView;
    GameState.camera_dialog.fov =
      (typeof fov === 'number' && fov > 0) ? fov : DIALOG_CAMERA_FOV;
    GameState.camera_dialog.position.copy(this.#tmpDialogCamPos);
    // Control: YawPitchRoll from GetCameraParameters quat
    // (not THREE.lookAt, which can introduce non-Aurora roll).
    this.applyDialogCameraLookAt(this.#tmpDialogCamPos, this.#tmpDialogCamLook);
    GameState.camera_dialog.updateProjectionMatrix();
    return !collided;
  }

  /**
   * Orient camera_dialog toward a look point using Aurora yaw/pitch (roll 0)
   * with the placeable-camera +90° bridge so THREE −Z equals the look direction.
   */
  static applyDialogCameraLookAt(pos: THREE.Vector3, look: THREE.Vector3) {
    this.#tmpCamDir.set(look.x - pos.x, look.y - pos.y, look.z - pos.z);
    auroraCameraLookOrientation(this.#tmpCamDir, this.#tmpCamQuat);
    const dialog = GameState.camera_dialog;
    dialog.up.set(0, 0, 1);
    dialog.quaternion.copy(this.#tmpCamQuat);
    dialog.rotation.setFromQuaternion(this.#tmpCamQuat, 'YZX');
  }

  /**
   * Framing point for dialog shots — Control:
   * OldHitCheck uses object position + object camera height; otherwise
   * CAMERAHOOK (with height fallback).
   */
  static getDialogFramingPosition(obj: ModuleObject): THREE.Vector3 {
    if(this.dialog?.oldHitCheck){
      const position = obj.position.clone();
      position.z += obj.getCameraHeight();
      return position;
    }
    return obj.getCameraHookPosition().clone();
  }

  /**
   * GetSideUnobstructed — pick yaw side 1 vs 2 by comparing
   * HitCheck counts for type-2/3 shots on each side. Side 2 wins ties.
   * Type-3 shots count up to 3 rays when OldHitCheck is clear (SetShot).
   */
  static pickDialogCameraSide(speakerPos: THREE.Vector3, listenerPos: THREE.Vector3): number {
    let hitsSide1 = 0;
    let hitsSide2 = 0;
    const tmpPos = new THREE.Vector3();
    const tmpLook = new THREE.Vector3();
    for(const type of [2, 3]){
      for(const side of [1, 2] as const){
        computeDialogCameraShot(
          type, speakerPos, listenerPos,
          tmpPos, tmpLook,
          { side }
        );
        const hits = this.countDialogCameraHits(type, tmpPos, tmpLook, speakerPos, listenerPos);
        if(side === 1) hitsSide1 += hits;
        else hitsSide2 += hits;
      }
    }
    return hitsSide1 < hitsSide2 ? 1 : 2;
  }

  /**
   * SetShot obstruction count — type 3 uses midpoint + speaker + listener
   * rays when OldHitCheck is unset; other shots use a single look↔camera ray.
   */
  static countDialogCameraHits(
    shotType: number,
    cameraPosition: THREE.Vector3,
    lookPosition: THREE.Vector3,
    speakerPos: THREE.Vector3,
    listenerPos: THREE.Vector3
  ): number {
    let hits = 0;
    if(this.checkCameraCollision(cameraPosition, lookPosition)) hits++;
    if((shotType | 0) === 3 && !this.dialog?.oldHitCheck){
      if(this.checkCameraCollision(cameraPosition, speakerPos)) hits++;
      if(this.checkCameraCollision(cameraPosition, listenerPos)) hits++;
    }
    return hits;
  }

  static checkDialogCameraObstruction(
    shotType: number,
    cameraPosition: THREE.Vector3,
    lookPosition: THREE.Vector3,
    speakerPos: THREE.Vector3,
    listenerPos: THREE.Vector3
  ): boolean {
    return this.countDialogCameraHits(
      shotType, cameraPosition, lookPosition, speakerPos, listenerPos
    ) > 0;
  }

  /** Speaker front — GetCameraParameters shot type 1. */
  static updateCameraAngleSpeaker(_delta: number = 0){
    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;
    this.applyDialogCameraShot(
      dlgAngleToShotType(DLGCameraAngle.ANGLE_SPEAKER),
      this.getDialogFramingPosition(speaker),
      this.getDialogFramingPosition(listener)
    );
  }

  /**
   * Over-the-shoulder — shot type 2; collision → type 1.
   * Different rooms: HitCheck forces → type-1 close-up; our
   * walkmesh approx can miss below-floor OTS pulls across the map, so gate here.
   */
  static updateCameraAngleSpeakerBehindPlayer(_delta: number = 0){
    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;
    if(!this.validateCameraParticipants()){
      this.cameraState.cameraAngle = DLGCameraAngle.ANGLE_SPEAKER;
      this.updateCameraAngleSpeaker();
      return;
    }
    const ok = this.applyDialogCameraShot(
      dlgAngleToShotType(DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER),
      this.getDialogFramingPosition(speaker),
      this.getDialogFramingPosition(listener)
    );
    if(!ok){
      this.cameraState.cameraAngle = DLGCameraAngle.ANGLE_SPEAKER;
    }
  }

  /** Two-shot — shot type 3; collision / different room → OTS (then type 1 if needed). */
  static updateCameraAngleTwoShot(_delta: number = 0){
    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;
    if(!this.validateCameraParticipants()){
      this.cameraState.cameraAngle = DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER;
      this.updateCameraAngleSpeakerBehindPlayer();
      return;
    }
    const ok = this.applyDialogCameraShot(
      dlgAngleToShotType(DLGCameraAngle.ANGLE_SPEAKER_AND_PLAYER_SIDE),
      this.getDialogFramingPosition(speaker),
      this.getDialogFramingPosition(listener)
    );
    if(!ok){
      this.cameraState.cameraAngle = DLGCameraAngle.ANGLE_SPEAKER_BEHIND_PLAYER;
      this.updateCameraAngleSpeakerBehindPlayer();
    }
  }

  /**
   * Angle 5 holds framing (UpdateShotCamera early-out). Kept for callers that
   * still invoke an explicit listener close-up; frames camera speaker as type 1.
   */
  static updateListenerCamera(_delta: number = 0){
    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;
    this.applyDialogCameraShot(
      1,
      this.getDialogFramingPosition(speaker),
      this.getDialogFramingPosition(listener)
    );
  }

  static #tmpMPVec3 = new THREE.Vector3();
  /**
   * Get the camera midpoint
   * @param pointA - The first point
   * @param pointB - The second point
   * @param percentage - The percentage to use
   * @returns The camera midpoint
   */
  static getCameraMidPoint(pointA: THREE.Vector3, pointB: THREE.Vector3, percentage = 0.5): THREE.Vector3 {
    // Calculate midpoint without cloning - more efficient
    this.#tmpMPVec3.x = pointA.x + (pointB.x - pointA.x) * percentage;
    this.#tmpMPVec3.y = pointA.y + (pointB.y - pointA.y) * percentage;
    this.#tmpMPVec3.z = pointA.z + (pointB.z - pointA.z) * percentage;
    
    return this.#tmpMPVec3;
  }

  /**
   * checkCameraCollision
   * Walkmesh approximation of SceneHitCheck — tests the
   * complete target↔camera segment against **all** area room walkmeshes
   * (CheckAABBAll loop) plus closed doors. Participant-only rooms missed
   * geometry when the camera sat in a third room (e.g. OTS across the map).
   * Full model-AABB HitCheck remains a residual.
   */
  static checkCameraCollision(cameraPosition: THREE.Vector3, targetPosition: THREE.Vector3): boolean {
    if (!GameState.module?.area) {
      return false;
    }

    const area = GameState.module.area;
    const raycaster = GameState.raycaster;
    const dist = cameraPosition.distanceTo(targetPosition);
    if(dist < 1e-4){ return false; }

    // SceneHitCheck walks every room via CheckAABBAll.
    const aabbFaces: any[] = [];
    const rooms = area.rooms || [];
    for(let i = 0, il = rooms.length; i < il; i++){
      const room: any = rooms[i];
      if(room?.collisionManager?.walkmesh?.aabbNodes?.length){
        aabbFaces.push({
          object: room,
          faces: room.collisionManager.walkmesh.faces
        });
      }
    }

    for (let j = 0, jl = area.doors.length; j < jl; j++) {
      const door = area.doors[j];
      if (door?.collisionManager?.walkmesh && !door.isOpen()) {
        aabbFaces.push({
          object: door,
          faces: door.collisionManager.walkmesh.faces
        });
      }
    }

    if(!aabbFaces.length){ return false; }

    const dir = this.#tmpCamDir;
    // Camera → target
    dir.copy(targetPosition).sub(cameraPosition).normalize();
    raycaster.set(cameraPosition, dir);
    raycaster.far = dist;
    for (let k = 0, kl = aabbFaces.length; k < kl; k++) {
      const castableFaces = aabbFaces[k];
      const intersects = castableFaces.object.collisionManager.walkmesh.raycast(raycaster, castableFaces.faces) || [];
      if (intersects.length > 0) return true;
    }

    // Target → camera (complete segment parity with Scene HitCheck)
    dir.copy(cameraPosition).sub(targetPosition).normalize();
    raycaster.set(targetPosition, dir);
    raycaster.far = dist;
    for (let k = 0, kl = aabbFaces.length; k < kl; k++) {
      const castableFaces = aabbFaces[k];
      const intersects = castableFaces.object.collisionManager.walkmesh.raycast(raycaster, castableFaces.faces) || [];
      if (intersects.length > 0) return true;
    }

    return false;
  }

  /**
   * adjustCameraDistanceForCollision
   * Adjusts camera distance based on walkmesh collision detection (similar to FollowerCamera)
   * @param cameraPosition - The proposed camera position
   * @param targetPosition - The target position to look at
   * @param maxDistance - The maximum desired distance
   * @returns The adjusted distance (may be less than maxDistance if collision detected)
   */
  static adjustCameraDistanceForCollision(cameraPosition: THREE.Vector3, targetPosition: THREE.Vector3, maxDistance: number): number {
    if (!GameState.module?.area) {
      return maxDistance;
    }

    const speaker = this.cameraState.speaker.participant;
    const listener = this.cameraState.listener.participant;

    const area = GameState.module.area;
    const raycaster = GameState.raycaster;
    
    // Calculate direction from target to camera
    const direction = cameraPosition.clone().sub(targetPosition).normalize();
    
    // Set up raycaster for collision detection
    raycaster.set(targetPosition, direction);
    raycaster.far = maxDistance;
    
    // Collect walkmesh faces for collision testing
    const aabbFaces: any[] = [];
    
    // Add room walkmesh faces
    if (speaker.room?.collisionManager?.walkmesh?.aabbNodes?.length) {
      aabbFaces.push({
        object: speaker.room,
        faces: speaker.room.collisionManager.walkmesh.faces
      });
    }

    if (listener.room !== speaker.room) {
      if (listener.room?.collisionManager?.walkmesh?.aabbNodes?.length) {
        aabbFaces.push({
          object: listener.room,
          faces: listener.room.collisionManager.walkmesh.faces
        });
      }
    }
    
    // Add door walkmesh faces (closed doors only)
    for (let j = 0, jl = area.doors.length; j < jl; j++) {
      const door = area.doors[j];
      if (door?.collisionManager?.walkmesh && !door.isOpen()) {
        aabbFaces.push({
          object: door,
          faces: door.collisionManager.walkmesh.faces
        });
      }
    }
    
    // Test for collisions and adjust distance (similar to FollowerCamera logic)
    let adjustedDistance = maxDistance;
    
    for (let k = 0, kl = aabbFaces.length; k < kl; k++) {
      const castableFaces = aabbFaces[k];
      const intersects = castableFaces.object.collisionManager.walkmesh.raycast(raycaster, castableFaces.faces) || [];
      
      if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
          const intersect = intersects[i];
          // If intersection is closer than current distance, adjust it (with 0.75 multiplier like FollowerCamera)
          if (intersect.distance < adjustedDistance) {
            adjustedDistance = intersect.distance * 0.75;
          }
        }
      }
    }
    
    return adjustedDistance;
  }

  static #eventListeners: Map<string, Function[]> = new Map();
  static addEventListener(type: string, listener: Function){
    let listeners = this.#eventListeners.get(type);
    if(!listeners){
      listeners = [];
      this.#eventListeners.set(type, listeners);
    }
    if(listeners.indexOf(listener) !== -1){
      return;
    }
    listeners.push(listener);
  }

  static removeEventListener(type: string, listener: Function){
    let listeners = this.#eventListeners.get(type);
    if(!listeners || listeners.indexOf(listener) !== -1){
      return;
    }
    if(listeners){
      listeners.splice(listeners.indexOf(listener), 1);
    }
  }

  static dispatchEvent(type: string, ...args: any[]){
    let listeners = this.#eventListeners.get(type);
    if(listeners){
      listeners.forEach(listener => listener(...args));
    }
  }

}
