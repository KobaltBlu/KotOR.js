import { GameState } from "@engine/runtime/GameState";
import { GameEngineType } from "@core/enums/engine";
import { EngineMode, EngineState } from "@engine/enums/engine";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { FadeOverlayState } from "@engine/enums/engine/FadeOverlayState";
import { MenuSaveLoadMode } from "@core/enums/gui/MenuSaveLoadMode";
import { PerceptionMask } from "@engine/enums/engine/PerceptionMask";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { NWScript } from "@engine/nwscript/NWScript";
import { SaveGame } from "@engine/save/SaveGame";
import { FactionManager } from "@engine/managers/FactionManager";
import { FollowerCamera } from "@engine/render/FollowerCamera";
import { findOpenWalkLocation } from "@engine/pathfinding/open-walk-location";
import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";
import { BitWise } from "@core/utility/BitWise";
import * as THREE from "three";
import { ModuleLoadCoordinator } from '@engine/runtime/ModuleLoadCoordinator';

/**
 * GameOverManager — party wipe / death sequence.
 *
 * Mirrors TempDeathUpdate, RunDeathSequence,
 * and UpdateDeathSequence (K1 GoG + TSL Aspyr).
 *
 * @file GameOverManager.ts
 */
export class GameOverManager {

  /** game_over_state */
  static gameOver = false;

  /** Set when death fade finishes / user quits — MainLoop drains to main menu. */
  static endGamePending = false;

  /**
   * After Load Game from death, keep TempDeathUpdate from immediately re-firing
   * while the save/load UI is up (AddPanel save/load as modal).
   */
  static suspendTempDeath = false;

  /** Accumulated seconds since RunDeathSequence (UpdateDeathSequence). */
  static deathElapsed = 0;

  /** Speed-curve baseline recomputed on the first Update after SetGameOver. */
  static deathSpeedBaseline = 0;

  /** — recompute speed baseline next UpdateDeathSequence. */
  static deathSpeedDirty = false;

  /** Milliseconds accumulator for hostile-scan throttle (, threshold 1000). */
  static hostileScanMs = 0;

  /** Milliseconds with at least one dead party member and no visible hostiles. */
  static combatClearMs = 0;

  /** last_party_member_temp_killed — focus target for. */
  static lastPartyMemberKilled: GameObject | undefined;

  /** Auto-resurrect dead party after this many ms of combat clear (5000). */
  static readonly COMBAT_CLEAR_RESURRECT_MS = 5000;

  /** Button enable delay on TSL gameover_p (0.5f at). */
  static readonly BUTTON_ENABLE_DELAY = 0.5;

  /** TLK shown on K1 death message box (DisplayDeathMessage → 0xA56F). */
  static readonly STRREF_DEATH_MESSAGE = 42351;

  /** TLK when LaunchMostRecentSave finds no valid save (0xA5FB). */
  static readonly STRREF_NO_SAVE = 42491;

  static Reset(){
    this.gameOver = false;
    this.endGamePending = false;
    this.suspendTempDeath = false;
    this.deathElapsed = 0;
    this.deathSpeedBaseline = 0;
    this.deathSpeedDirty = false;
    this.hostileScanMs = 0;
    this.combatClearMs = 0;
    this.lastPartyMemberKilled = undefined;
    FollowerCamera.endDeathCamera();
    GameState.timeScale = 1;
  }

  /** Record which party member just died (for death-camera target). */
  static NotifyPartyMemberDeath(creature: GameObject){
    if(!creature) return;
    if(GameState.PartyManager.party.indexOf(creature as Creature) < 0) return;
    this.lastPartyMemberKilled = creature;
  }

  static GetGameOver(){
    return this.gameOver;
  }

  static SetGameOver(value: boolean){
    this.gameOver = !!value;
    this.deathSpeedDirty = true;
  }

  /**
   * TempDeathUpdate — called each client frame while in-module.
   * Party wipe → RunDeathSequence; partial wipe + 5s combat clear → resurrect.
   */
  static TempDeathUpdate(delta: number = 0){
    if(this.gameOver) return;
    if(this.endGamePending) return;
    if(this.suspendTempDeath) return;
    if(!GameState.module?.area) return;
    if(GameState.Mode == EngineMode.LOADING) return;
    if(GameState.MenuManager.activeModals.length > 0) return;

    const party = GameState.PartyManager.party;
    if(!party?.length) return;

    let allDead = true;
    let anyDead = false;
    for(let i = 0; i < party.length; i++){
      const member = party[i];
      if(!member) continue;
      if(member.isDead()){
        anyDead = true;
      }else{
        allDead = false;
      }
    }

    if(allDead){
      this.RunDeathSequence();
      return;
    }

    const deltaMs = Math.max(0, delta) * 1000;

    if(anyDead){
      this.combatClearMs += deltaMs;
      this.hostileScanMs += deltaMs;

      // : every ~1s scan; if a hostile is party-visible, reset clear timer
      if(this.hostileScanMs > 1000){
        this.hostileScanMs = 0;
        if(this.hasVisibleHostileToParty()){
          this.combatClearMs = 0;
        }
      }

      if(this.combatClearMs > this.COMBAT_CLEAR_RESURRECT_MS){
        this.resurrectDeadPartyMembers();
        this.combatClearMs = 0;
      }
    }else{
      this.hostileScanMs = 0;
      this.combatClearMs = 0;
    }
  }

  /**
   * : hostile (GetReputation < 0xB) that IsPartyVisible
   * creature perception has a party member with SEEN bit.
   */
  static hasVisibleHostileToParty(): boolean {
    const leader = GameState.PartyManager.party[0];
    const area = GameState.module?.area;
    if(!leader || !area?.creatures?.length) return false;

    for(let i = 0; i < area.creatures.length; i++){
      const creature = area.creatures[i];
      if(!creature || creature.isDead()) continue;
      if(GameState.PartyManager.party.indexOf(creature) >= 0) continue;
      if(FactionManager.GetReputation(creature, leader) >= 11) continue;
      if(this.isPartyVisibleTo(creature)){
        return true;
      }
    }
    return false;
  }

  /** IsPartyVisible — SEEN perception entry against a party member. */
  static isPartyVisibleTo(creature: Creature): boolean {
    const list = creature.perceptionList;
    if(!list?.length){
      // Fallback when perception isn't populated: distance gate (~ combat range)
      const leader = GameState.PartyManager.party[0];
      if(!leader) return false;
      return creature.position.distanceToSquared(leader.position) < 900; // 30^2
    }

    for(let i = 0; i < list.length; i++){
      const entry = list[i];
      if(!entry || !(entry.data & PerceptionMask.SEEN)) continue;
      const obj = entry.object;
      if(obj && GameState.PartyManager.party.indexOf(obj as Creature) >= 0){
        return true;
      }
    }
    return false;
  }

  /** Instant Resurrection on each dead party member; regroup if not solo. */
  static resurrectDeadPartyMembers(){
    const party = GameState.PartyManager.party;
    const leader = party[0];
    const leaderPos = leader?.position;

    for(let i = 0; i < party.length; i++){
      const member = party[i] as Creature;
      if(!member?.isDead()) continue;

      const effect = new GameState.GameEffectFactory.EffectResurrection();
      effect.setDurationType(GameEffectDurationType.INSTANT);
      member.addEffect(effect, GameEffectDurationType.INSTANT);

      // find safe location near corpse — place slightly offset so they don't stack
      if(leaderPos && member !== leader){
        const area = member.area || GameState.module?.area;
        const preferred = member.position.clone();
        preferred.x += 0.75 + i * 0.35;
        const safe = new THREE.Vector3();
        if(area && findOpenWalkLocation(area, preferred, safe, { radius: 5, owner: member })){
          member.position.copy(safe);
        }else{
          member.position.copy(preferred);
        }
      }
    }

    // : if not solo and a member is >40 units from leader (1600 sqr), pull to formation
    if(!GameState.SOLOMODE && leaderPos && leader){
      const area = leader.area || GameState.module?.area;
      const ox = typeof leader.getXOrientation === 'function' ? leader.getXOrientation() : 0;
      const oy = typeof leader.getYOrientation === 'function' ? leader.getYOrientation() : 1;
      const yaw = -Math.atan2(ox, oy);
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const offsets = GameState.PartyManager.getFormationOffsets();

      for(let i = 1; i < party.length; i++){
        const member = party[i];
        if(!member) continue;
        if(member.position.distanceToSquared(leaderPos) <= 1600) continue;

        const offset = offsets[Math.min(i, offsets.length - 1)] || { x: 1.5 * i, y: -0.7 };
        const preferred = new THREE.Vector3(
          leaderPos.x + (offset.x * cos - offset.y * sin),
          leaderPos.y + (offset.x * sin + offset.y * cos),
          leaderPos.z
        );
        const safe = new THREE.Vector3();
        if(area && findOpenWalkLocation(area, preferred, safe, { radius: 10, owner: member as Creature })){
          member.position.copy(safe);
        }else{
          member.position.copy(preferred);
        }
      }
    }
  }

  /**
   * RunDeathSequence — hide panels, show death UI, death fade, mark game over.
   */
  static RunDeathSequence(){
    if(this.gameOver) return;

    this.SetGameOver(true);
    this.deathElapsed = 0;
    this.endGamePending = false;

    GameState.MenuManager.ClearMenus();

    // — focus last temp-killed party member (fallback: party[0])
    const camTarget =
      this.lastPartyMemberKilled ||
      GameState.PartyManager.party.find((p) => p?.isDead()) ||
      GameState.PartyManager.party[0];
    FollowerCamera.beginDeathCamera(camTarget);

    // Atmosphere: StartGlobalFade(0, wait=12, length=1) @ RunDeathSequence
    GameState.FadeOverlayManager.FadeOut(
      GameState.FadeOverlayManager.DEATH_FADE_LENGTH,
      0, 0, 0,
      GameState.FadeOverlayManager.DEATH_FADE_WAIT
    );

    if(GameState.GameKey == GameEngineType.TSL){
      GameState.MenuManager.MenuGameOver?.openDeath();
    }else{
      this.showK1DeathMessage();
    }
  }

  /** K1 DisplayDeathMessage — confirm modal with TLK 42351 → SetEndGamePending. */
  static showK1DeathMessage(){
    const confirm = GameState.MenuManager.InGameConfirm;
    if(!confirm) return;

    confirm.fromStringRef(this.STRREF_DEATH_MESSAGE);
    confirm.onOk = () => {
      this.QuitToMainMenu();
    };
  }

  /**
   * UpdateDeathSequence — slow world time while fading; when fade ends,
   * K1 drains to main menu (endGamePending). TSL keeps MenuGameOver until the player acts.
   */
  static UpdateDeathSequence(delta: number = 0){
    if(this.endGamePending && !this.gameOver){
      this.processEndGamePending();
      return;
    }

    if(!this.gameOver) return;

    this.deathElapsed += Math.max(0, delta);

    if(this.deathSpeedDirty){
      this.deathSpeedDirty = false;
      const t = Math.max(this.deathElapsed, 0.001);
      // = -1.25 * ln(t * 0.25)
      this.deathSpeedBaseline = -1.25 * Math.log(t * 0.25);
    }

    let speed = 0.2;
    if(this.deathElapsed < 4){
      const t = Math.max(this.deathElapsed, 0.001);
      const baseline = this.deathSpeedBaseline || 1;
      speed = (-Math.log(t * 0.25) / baseline) + 0.2;
      if(!Number.isFinite(speed) || speed < 0.05) speed = 0.2;
      if(speed > 1) speed = 1;
    }
    GameState.timeScale = speed;

    const fading = GameState.FadeOverlayManager.isFading();

    // K1: when global fade completes, Clear game over + SetEndGamePending → main menu
    if(
      GameState.GameKey == GameEngineType.KOTOR &&
      !fading &&
      GameState.FadeOverlayManager.state == FadeOverlayState.FADED_OUT
    ){
      GameState.timeScale = 1;
      this.SetGameOver(false);
      this.deathSpeedDirty = true;
      GameState.FadeOverlayManager.Stop();
      if(GameState.MenuManager.InGameConfirm?.isVisible()){
        GameState.MenuManager.InGameConfirm.close();
      }
      this.endGamePending = true;
    }

    if(GameState.GameKey == GameEngineType.TSL){
      GameState.MenuManager.MenuGameOver?.updateDeathButtons(delta);
    }

    if(this.endGamePending){
      this.processEndGamePending();
    }
  }

  /**
   * HurryDeathSequence — called from HandleInputEvent while game_over_state != 0.
   * Collapses remaining fade to StartGlobalFade(0, wait=0, length=0.5).
   */
  static HurryDeathSequence(){
    if(!this.gameOver) return;
    const fade = GameState.FadeOverlayManager;
    const total = fade.wait + fade.duration;
    const progress = total > 0 ? fade.elapsed / total : 1;
    // Already nearly done — don't restart a slow fade
    if(
      fade.state == FadeOverlayState.FADED_OUT ||
      (fade.state == FadeOverlayState.FADING_OUT && progress > 0.85)
    ){
      return;
    }
    fade.FadeOut(fade.DEATH_HURRY_FADE_LENGTH, 0, 0, 0);
  }

  /**
   * ExecuteCommandEndGame → SetEndGamePending(1, fade, showGui).
   * showGui also SetGameOver(1). processEndGamePending waits until !gameOver.
   */
  static EndGame(showDeathGui: boolean = false){
    if(showDeathGui){
      this.RunDeathSequence();
      // keeps endGamePending set while gameOver; drain after death UI finishes.
      this.endGamePending = true;
    }else{
      this.endGamePending = true;
    }
  }

  /**
   * PopUpGUIPanel — only GUI_PANEL_PLAYER_DEATH (0) is meaningful in KotOR
   * (SendServerToPlayerPopUpGUIPanel).
   */
  static PopUpGUIPanel(oPC: GameObject | undefined, guiPanel: number){
    GameState.PartyManager.LastGuiPanel = guiPanel | 0;
    if(guiPanel !== 0) return;
    this.PopUpDeathGUIPanel(oPC, true, true, 0, '');
  }

  /**
   * PopUpDeathGUIPanel / death POP_UP_GUI_PANEL message.
   * KotOR SP maps NWN Respawn/WaitForHelp onto TSL load/last-save chrome;
   * K1 uses the death confirm modal (optional help text overrides TLK).
   */
  static PopUpDeathGUIPanel(
    oPC: GameObject | undefined,
    respawnButtonEnabled: boolean = true,
    waitForHelpButtonEnabled: boolean = true,
    helpStringRef: number = 0,
    helpString: string = '',
  ){
    void waitForHelpButtonEnabled; // NWN MP-only; KotOR SP has no Wait For Help
    if(!oPC) return;
    if(BitWise.InstanceOf(oPC.objectType, GameObjectType.Creature)){
      if(!(oPC as Creature).getIsPC() && GameState.PartyManager.party.indexOf(oPC as Creature) < 0){
        return;
      }
    }else{
      return;
    }

    let message = helpString?.trim() ?? '';
    if(!message && helpStringRef > 0){
      message = GameState.TLKManager.GetStringById(helpStringRef)?.Value ?? '';
    }

    if(GameState.GameKey == GameEngineType.TSL){
      if(!this.gameOver){
        this.SetGameOver(true);
        this.deathElapsed = 0;
        GameState.MenuManager.ClearMenus();
        const camTarget =
          this.lastPartyMemberKilled ||
          GameState.PartyManager.party.find((p) => p?.isDead()) ||
          GameState.PartyManager.party[0] ||
          oPC;
        FollowerCamera.beginDeathCamera(camTarget);
        GameState.FadeOverlayManager.FadeOut(
          GameState.FadeOverlayManager.DEATH_FADE_LENGTH,
          0, 0, 0,
          GameState.FadeOverlayManager.DEATH_FADE_WAIT
        );
      }
      GameState.MenuManager.MenuGameOver?.openDeath({
        respawnEnabled: respawnButtonEnabled,
        waitForHelpEnabled: waitForHelpButtonEnabled,
        message,
      });
      return;
    }

    // K1 — DisplayDeathMessage-style confirm; custom string if provided
    const confirm = GameState.MenuManager.InGameConfirm;
    if(!confirm) return;
    if(message){
      confirm.fromString(message);
      confirm.onOk = () => { this.QuitToMainMenu(); };
    }else{
      this.showK1DeathMessage();
      confirm.onOk = () => { this.QuitToMainMenu(); };
    }
    if(!this.gameOver){
      this.SetGameOver(true);
      this.deathElapsed = 0;
      GameState.FadeOverlayManager.FadeOut(
        GameState.FadeOverlayManager.DEATH_FADE_LENGTH,
        0, 0, 0,
        GameState.FadeOverlayManager.DEATH_FADE_WAIT
      );
    }
  }

  /** Input while dead — ProcessInput path that calls HurryDeathSequence. */
  static OnDeathSequenceInput(){
    if(!this.gameOver) return;
    this.HurryDeathSequence();
  }

  static processEndGamePending(){
    if(!this.endGamePending) return;
    if(this.gameOver) return;
    this.endGamePending = false;
    this.QuitToMainMenu();
  }

  /**
   * Unload module and return to main menu (SetEndGamePending drain / OnQuitPressed).
   */
  static QuitToMainMenu(){
    this.Reset();
    GameState.FadeOverlayManager.Stop();
    GameState.MenuManager.ClearMenus();
    ModuleLoadCoordinator.UnloadModule();
    GameState.State = EngineState.RUNNING;

    if(GameState.module){
      GameState.module.dispose();
      GameState.module = undefined;
    }

    NWScript.Reload();
    GameState.controls?.initKeys?.();
    GameState.MenuManager.MainMenu.Start();
  }

  /** Load most recent save (TSL OnLastSavePressed / LaunchMostRecentSave). */
  static LoadMostRecentSave(): boolean {
    const save = SaveGame.GetMostRecentSave();
    if(!save){
      const confirm = GameState.MenuManager.InGameConfirm;
      confirm?.fromStringRef(this.STRREF_NO_SAVE);
      return false;
    }

    this.Reset();
    GameState.FadeOverlayManager.Stop();
    GameState.MenuManager.ClearMenus();
    if(GameState.module){
      GameState.module.dispose();
      GameState.module = undefined;
    }
    save.load();
    return true;
  }

  /** Open load-game screen from death UI (OnLoadGamePressed). */
  static OpenLoadGameFromDeath(){
    this.gameOver = false;
    this.suspendTempDeath = true;
    GameState.timeScale = 1;
    GameState.FadeOverlayManager.Stop();
    GameState.MenuManager.MenuGameOver?.close();
    GameState.MenuManager.MenuSaveLoad.mode = MenuSaveLoadMode.LOADGAME;
    GameState.MenuManager.MenuSaveLoad.open();
  }

  /** Call when leaving load-from-death without loading (e.g. back to death). */
  static ResumeTempDeathChecks(){
    this.suspendTempDeath = false;
  }

}
