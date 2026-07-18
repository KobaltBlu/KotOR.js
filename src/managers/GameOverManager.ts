import { GameState } from "@/GameState";
import { EngineMode, EngineState, GameEngineType } from "@/enums/engine";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { FadeOverlayState } from "@/enums/engine/FadeOverlayState";
import { MenuSaveLoadMode } from "@/enums/gui/MenuSaveLoadMode";
import { PerceptionMask } from "@/enums/engine/PerceptionMask";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { Module } from "@/module";
import { NWScript } from "@/nwscript/NWScript";
import { SaveGame } from "@/engine/SaveGame";
import { FactionManager } from "@/managers/FactionManager";
import { FollowerCamera } from "@/engine/FollowerCamera";
import { computeSafeLocation } from "@/engine/pathfinding/compute-safe-location";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import * as THREE from "three";

/**
 * GameOverManager — retail party wipe / death sequence.
 *
 * Mirrors CServerExoAppInternal::TempDeathUpdate, CClientExoApp::RunDeathSequence,
 * and CClientExoAppInternal::UpdateDeathSequence (K1 GoG + TSL Aspyr).
 *
 * @file GameOverManager.ts
 */
export class GameOverManager {

  /** CClientExoAppInternal::game_over_state */
  static gameOver = false;

  /** Set when death fade finishes / user quits — MainLoop drains to main menu. */
  static endGamePending = false;

  /**
   * After Load Game from death, keep TempDeathUpdate from immediately re-firing
   * while the save/load UI is up (retail AddPanel save/load as modal).
   */
  static suspendTempDeath = false;

  /** Accumulated seconds since RunDeathSequence (UpdateDeathSequence field179). */
  static deathElapsed = 0;

  /** Speed-curve baseline recomputed on the first Update after SetGameOver (field180). */
  static deathSpeedBaseline = 0;

  /** field177 — recompute speed baseline next UpdateDeathSequence. */
  static deathSpeedDirty = false;

  /** Milliseconds accumulator for hostile-scan throttle (field68, threshold 1000). */
  static hostileScanMs = 0;

  /** Milliseconds with at least one dead party member and no visible hostiles (field69). */
  static combatClearMs = 0;

  /** last_party_member_temp_killed — focus target for CSWCameraDeath. */
  static lastPartyMemberKilled: ModuleObject | undefined;

  /** Retail global fade length when death starts (StartGlobalFade length = 12). */
  static readonly DEATH_FADE_SECONDS = 12;

  /** Auto-resurrect dead party after this many ms of combat clear (5000). */
  static readonly COMBAT_CLEAR_RESURRECT_MS = 5000;

  /** Button enable delay on TSL gameover_p (0.5f at +0x720). */
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
  static NotifyPartyMemberDeath(creature: ModuleObject){
    if(!creature) return;
    if(GameState.PartyManager.party.indexOf(creature as ModuleCreature) < 0) return;
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
   * Retail TempDeathUpdate — called each client frame while in-module.
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

      // Retail: every ~1s scan; if a hostile is party-visible, reset clear timer
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
   * Retail: hostile (GetReputation < 0xB) that IsPartyVisible —
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

  /** CSWSCreature::IsPartyVisible — SEEN perception entry against a party member. */
  static isPartyVisibleTo(creature: ModuleCreature): boolean {
    const list = creature.perceptionList;
    if(!list?.length){
      // Fallback when perception isn't populated: distance gate (~retail combat range)
      const leader = GameState.PartyManager.party[0];
      if(!leader) return false;
      return creature.position.distanceToSquared(leader.position) < 900; // 30^2
    }

    for(let i = 0; i < list.length; i++){
      const entry = list[i];
      if(!entry || !(entry.data & PerceptionMask.SEEN)) continue;
      const obj = entry.object;
      if(obj && GameState.PartyManager.party.indexOf(obj as ModuleCreature) >= 0){
        return true;
      }
    }
    return false;
  }

  /** Retail Instant Resurrection on each dead party member; regroup if not solo. */
  static resurrectDeadPartyMembers(){
    const party = GameState.PartyManager.party;
    const leader = party[0];
    const leaderPos = leader?.position;

    for(let i = 0; i < party.length; i++){
      const member = party[i] as ModuleCreature;
      if(!member?.isDead()) continue;

      const effect = new GameState.GameEffectFactory.EffectResurrection();
      effect.setDurationType(GameEffectDurationType.INSTANT);
      member.addEffect(effect, GameEffectDurationType.INSTANT);

      // Retail ComputeSafeLocation near corpse — place slightly offset so they don't stack
      if(leaderPos && member !== leader){
        const area = member.area || GameState.module?.area;
        const preferred = member.position.clone();
        preferred.x += 0.75 + i * 0.35;
        const safe = new THREE.Vector3();
        if(area && computeSafeLocation(area, preferred, safe, { radius: 5, owner: member })){
          member.position.copy(safe);
        }else{
          member.position.copy(preferred);
        }
      }
    }

    // Retail: if not solo and a member is >40 units from leader (1600 sqr), pull to formation
    if(!GameState.SOLOMODE && leaderPos){
      for(let i = 1; i < party.length; i++){
        const member = party[i];
        if(!member) continue;
        if(member.position.distanceToSquared(leaderPos) > 1600){
          member.position.copy(leaderPos);
          member.position.x += 1.0 * i;
        }
      }
    }
  }

  /**
   * Retail RunDeathSequence — hide panels, show death UI, death fade, mark game over.
   */
  static RunDeathSequence(){
    if(this.gameOver) return;

    this.SetGameOver(true);
    this.deathElapsed = 0;
    this.endGamePending = false;

    GameState.MenuManager.ClearMenus();

    // CSWCameraDeath — focus last temp-killed party member (fallback: party[0])
    const camTarget =
      this.lastPartyMemberKilled ||
      GameState.PartyManager.party.find((p) => p?.isDead()) ||
      GameState.PartyManager.party[0];
    FollowerCamera.beginDeathCamera(camTarget);

    // Atmosphere: fade to black over 12s (CGuiInGame::StartGlobalFade length=12, opacity→1)
    GameState.FadeOverlayManager.FadeOut(this.DEATH_FADE_SECONDS, 0, 0, 0);

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
   * Retail UpdateDeathSequence — slow world time while fading; when fade ends,
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
      // field180 = -1.25 * ln(t * 0.25)
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

    const fading =
      GameState.FadeOverlayManager.state == FadeOverlayState.FADING_OUT ||
      GameState.FadeOverlayManager.state == FadeOverlayState.FADING_IN;

    // K1: when global fade completes, Clear game over + SetEndGamePending → main menu
    if(
      GameState.GameKey == GameEngineType.KOTOR &&
      !fading &&
      GameState.FadeOverlayManager.state == FadeOverlayState.FADED_OUT
    ){
      GameState.timeScale = 1;
      this.SetGameOver(false);
      this.deathSpeedDirty = true;
      GameState.FadeOverlayManager.material.visible = false;
      GameState.FadeOverlayManager.state = FadeOverlayState.NONE;
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
   * Retail HurryDeathSequence — called from HandleInputEvent while game_over_state != 0.
   * Collapses remaining fade to 0.5s (StartGlobalFade length=0 wait, fade 0.5).
   */
  static HurryDeathSequence(){
    if(!this.gameOver) return;
    // Already nearly done — don't restart a slow fade
    if(
      GameState.FadeOverlayManager.state == FadeOverlayState.FADED_OUT ||
      (
        GameState.FadeOverlayManager.state == FadeOverlayState.FADING_OUT &&
        GameState.FadeOverlayManager.duration > 0 &&
        GameState.FadeOverlayManager.elapsed / GameState.FadeOverlayManager.duration > 0.85
      )
    ){
      return;
    }
    GameState.FadeOverlayManager.FadeOut(0.5, 0, 0, 0);
  }

  /**
   * Retail ExecuteCommandEndGame @ 00535570 → SetEndGamePending(1, fade, showGui).
   * showGui also SetGameOver(1). processEndGamePending waits until !gameOver.
   */
  static EndGame(showDeathGui: boolean = false){
    if(showDeathGui){
      this.RunDeathSequence();
      // Retail keeps endGamePending set while gameOver; drain after death UI finishes.
      this.endGamePending = true;
    }else{
      this.endGamePending = true;
    }
  }

  /**
   * Retail PopUpGUIPanel — only GUI_PANEL_PLAYER_DEATH (0) is meaningful in KotOR
   * (SendServerToPlayerPopUpGUIPanel @ 0056aac0).
   */
  static PopUpGUIPanel(oPC: ModuleObject | undefined, guiPanel: number){
    if(guiPanel !== 0) return;
    this.PopUpDeathGUIPanel(oPC, true, true, 0, '');
  }

  /**
   * Retail PopUpDeathGUIPanel / death POP_UP_GUI_PANEL message.
   * KotOR SP maps NWN Respawn/WaitForHelp onto TSL load/last-save chrome;
   * K1 uses the death confirm modal (optional help text overrides TLK).
   */
  static PopUpDeathGUIPanel(
    oPC: ModuleObject | undefined,
    respawnButtonEnabled: boolean = true,
    waitForHelpButtonEnabled: boolean = true,
    helpStringRef: number = 0,
    helpString: string = '',
  ){
    void waitForHelpButtonEnabled; // NWN MP-only; KotOR SP has no Wait For Help
    if(!oPC) return;
    if(BitWise.InstanceOf(oPC.objectType, ModuleObjectType.ModuleCreature)){
      if(!(oPC as ModuleCreature).getIsPC() && GameState.PartyManager.party.indexOf(oPC as ModuleCreature) < 0){
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
        GameState.FadeOverlayManager.FadeOut(this.DEATH_FADE_SECONDS, 0, 0, 0);
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
      GameState.FadeOverlayManager.FadeOut(this.DEATH_FADE_SECONDS, 0, 0, 0);
    }
  }

  /** Input while dead — retail ProcessInput path that calls HurryDeathSequence. */
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
    GameState.FadeOverlayManager.material.visible = false;
    GameState.FadeOverlayManager.state = FadeOverlayState.NONE;
    GameState.MenuManager.ClearMenus();
    GameState.UnloadModule();
    GameState.State = EngineState.RUNNING;

    if(GameState.module instanceof Module){
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
    GameState.FadeOverlayManager.material.visible = false;
    GameState.FadeOverlayManager.state = FadeOverlayState.NONE;
    GameState.MenuManager.ClearMenus();
    if(GameState.module instanceof Module){
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
    GameState.FadeOverlayManager.material.visible = false;
    GameState.FadeOverlayManager.state = FadeOverlayState.NONE;
    GameState.MenuManager.MenuGameOver?.close();
    GameState.MenuManager.MenuSaveLoad.mode = MenuSaveLoadMode.LOADGAME;
    GameState.MenuManager.MenuSaveLoad.open();
  }

  /** Call when leaving load-from-death without loading (e.g. back to death). */
  static ResumeTempDeathChecks(){
    this.suspendTempDeath = false;
  }

}
