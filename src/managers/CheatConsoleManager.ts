import { GameState } from "@/GameState";
import { InventoryManager } from "@/managers/InventoryManager";
import { ModuleItem } from "@/module/ModuleItem";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { KEYManager } from "@/managers/KEYManager";
import { ExperienceType } from "@/enums/engine/ExperienceType";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { SkillType } from "@/enums/nwscript/SkillType";
import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";
import {
  OdysseyLightingDebug,
  ODYSSEY_LIGHTING_DEBUG_KEYS,
} from "@/utility/odysseyLightingDebug";
import { ModuleLoadCoordinator } from '@/engine/ModuleLoadCoordinator';

/**
 * CheatConsoleManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * ConsoleFunc handlers (string table).
 *
 * @file CheatConsoleManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CheatConsoleManager {

  static readonly RESREF_MEDPAC = 'g_i_medeqpmnt02';
  static readonly RESREF_REPAIR = 'g_i_drdrepeqp002';
  static readonly RESREF_COM_SPIKE = 'g_i_progspike01';
  static readonly RESREF_SEC_SPIKE = 'g_i_secspike01';
  static readonly RESREF_SITH_ARMOR = 'ptar_sitharmor';

  /** turbo GetMaxSpeed when turbo is enabled. */
  static readonly TURBO_MAX_SPEED = 15;

  static shouldSkipItemConsume(): boolean {
    return !!GameState.infiniteUses;
  }

  static parseIntParam(raw: string | undefined, fallback: number = 0): number {
    if(raw == null || raw === ''){ return fallback; }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  static parseFloatParam(raw: string | undefined, fallback: number = 0): number {
    if(raw == null || raw === ''){ return fallback; }
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Dump or query OdysseyLightingDebug knobs (cheat console). */
  static lightGet(keyRaw?: string){
    const key = OdysseyLightingDebug.resolveKey(keyRaw);
    if(keyRaw && !key){
      const line = `lightget: unknown key "${keyRaw}"`;
      GameState.FeedbackMessageManager?.AddMessage?.(line, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
      console.warn(line);
      return;
    }
    if(key){
      const line = `lightget ${key} = ${OdysseyLightingDebug.get(key)}`;
      GameState.FeedbackMessageManager?.AddMessage?.(line, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
      console.log(line);
      return;
    }
    const dump = OdysseyLightingDebug.dump();
    console.log('lightget', dump);
    for(let i = 0; i < ODYSSEY_LIGHTING_DEBUG_KEYS.length; i++){
      const k = ODYSSEY_LIGHTING_DEBUG_KEYS[i];
      console.log(`  ${k} = ${dump[k]}`);
    }
    GameState.FeedbackMessageManager?.AddMessage?.(
      'lightget: dumped to console',
      FeebackMessageColor.INFO,
      0,
      { bypassStatusSummary: true }
    );
  }

  /** Set an OdysseyLightingDebug knob. */
  static lightSet(keyRaw: string | undefined, valueRaw: string | undefined){
    const key = OdysseyLightingDebug.resolveKey(keyRaw);
    if(!key){
      const line = `lightset: unknown key "${keyRaw ?? ''}"`;
      GameState.FeedbackMessageManager?.AddMessage?.(line, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
      console.warn(line);
      return;
    }
    if(valueRaw == null || valueRaw === ''){
      const line = `lightset: usage lightset <key> <value>`;
      GameState.FeedbackMessageManager?.AddMessage?.(line, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
      console.warn(line);
      return;
    }
    const value = CheatConsoleManager.parseFloatParam(valueRaw, NaN);
    if(!Number.isFinite(value)){
      const line = `lightset: invalid value "${valueRaw}"`;
      GameState.FeedbackMessageManager?.AddMessage?.(line, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
      console.warn(line);
      return;
    }
    OdysseyLightingDebug.set(key, value);
    const line = `lightset ${key} = ${value}`;
    GameState.FeedbackMessageManager?.AddMessage?.(line, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
    console.log(line);
  }

  /** Reset one or all OdysseyLightingDebug knobs. */
  static lightReset(keyRaw?: string){
    if(keyRaw){
      const key = OdysseyLightingDebug.resolveKey(keyRaw);
      if(!key){
        const line = `lightreset: unknown key "${keyRaw}"`;
        GameState.FeedbackMessageManager?.AddMessage?.(line, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
        console.warn(line);
        return;
      }
      OdysseyLightingDebug.reset(key);
      const line = `lightreset ${key} = ${OdysseyLightingDebug.get(key)}`;
      GameState.FeedbackMessageManager?.AddMessage?.(line, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
      console.log(line);
      return;
    }
    OdysseyLightingDebug.reset();
    const line = 'lightreset: all lighting knobs restored';
    GameState.FeedbackMessageManager?.AddMessage?.(line, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
    console.log(line);
  }

  /**
   * givemed/giverepair/spikes: 0 or >99 → 99.
   */
  static clampGiveItemCount(raw: string | undefined): number {
    let n = CheatConsoleManager.parseIntParam(raw, 0);
    if(n === 0 || n > 99){ n = 99; }
    return n;
  }

  //Gives your character the amount of Dark Side points you want
  static addDarkSide(points: number = 0){
    // adddarkside — ModifyAlignment(-param), clamped ±100
    let n = -Math.trunc(points);
    if(n > 100) n = 100;
    if(n < -100) n = -100;
    const player = GameState.PartyManager.getCurrentPlayer();
    if(player){
      player.addGoodEvil(n);
    }
  }

  //Gives your character the amount of Light Side points you want
  static addLightSide(points: number = 0){
    // addlightside — ModifyAlignment(param), clamped ±100
    let n = Math.trunc(points);
    if(n > 100) n = 100;
    if(n < -100) n = -100;
    const player = GameState.PartyManager.getCurrentPlayer();
    if(player){
      player.addGoodEvil(n);
    }
  }

  //Gives your character the amount of experience points you want
  static addEXP(points: number = 0){
    const n = Math.trunc(points);
    if(n <= 0){ return; }
    const player = GameState.PartyManager.getCurrentPlayer();
    if(player){
      player.addXP(n, ExperienceType.PLOT);
    }
  }

  /**
   * addlevel — XP needed for next level; L15 cap unless Jedi; L20 hard cap.
   */
  static addLevel(){
    const player = GameState.PartyManager.getCurrentPlayer();
    if(!player){ return; }

    const level = player.getTotalClassLevel();
    if(level >= 20){ return; }

    const hasJedi = (player.classes || []).some((c) => {
      if(!c){ return false; }
      if(c.spellcaster){ return true; }
      const label = `${c.label || ''} ${c.constant || ''}`.toLowerCase();
      return label.includes('jedi');
    });
    if(level >= 15 && !hasJedi){ return; }

    const threshold = GameState.SWRuleSet?.expTable?.expList?.[level];
    if(typeof threshold !== 'number' || !Number.isFinite(threshold)){ return; }
    const needed = threshold - player.getXP();
    if(needed > 0){
      player.addXP(needed, ExperienceType.PLOT);
    }
  }

  /**
   * bright → ForceBrightSunAndMoon.
   */
  static bright(){
    GameState.module?.area?.forceBrightSunAndMoon?.();
  }

  static giveMedPacks(amount?: number){
    const n = amount == null || !Number.isFinite(amount)
      ? CheatConsoleManager.clampGiveItemCount(undefined)
      : Math.max(1, Math.abs(Math.trunc(amount)));
    CheatConsoleManager.giveItem(CheatConsoleManager.RESREF_MEDPAC, n);
  }

  static giveRepairKits(amount?: number){
    const n = amount == null || !Number.isFinite(amount)
      ? CheatConsoleManager.clampGiveItemCount(undefined)
      : Math.max(1, Math.abs(Math.trunc(amount)));
    CheatConsoleManager.giveItem(CheatConsoleManager.RESREF_REPAIR, n);
  }

  static giveComputerSpikes(amount?: number){
    const n = amount == null || !Number.isFinite(amount)
      ? CheatConsoleManager.clampGiveItemCount(undefined)
      : Math.max(1, Math.abs(Math.trunc(amount)));
    CheatConsoleManager.giveItem(CheatConsoleManager.RESREF_COM_SPIKE, n);
  }

  static giveSecuritySpikes(amount?: number){
    const n = amount == null || !Number.isFinite(amount)
      ? CheatConsoleManager.clampGiveItemCount(undefined)
      : Math.max(1, Math.abs(Math.trunc(amount)));
    CheatConsoleManager.giveItem(CheatConsoleManager.RESREF_SEC_SPIKE, n);
  }

  /**
   * givecredits — n > 0; if n < 100 force 99.
   */
  static giveCredits(amount: number = 0){
    let n = Math.trunc(amount);
    if(n <= 0){ return; }
    if(n < 100){ n = 99; }
    GameState.PartyManager.AddGold(n);
  }

  static giveItem(resref: string = '', amount: number = 1){
    amount = Math.abs(Math.trunc(amount));
    if(!resref || amount <= 0){ return undefined; }
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], resref);
    if(buffer){
      const item = new ModuleItem(new GFFObject(buffer));
      item.initProperties();
      item.setStackSize(amount);
      InventoryManager.addItem(item);
      return item;
    }
    return undefined;
  }

  static giveSithArmour(){
    CheatConsoleManager.giveItem(CheatConsoleManager.RESREF_SITH_ARMOR, 1);
  }

  /** heal — full vitals on controlled PC. */
  static heal(){
    const player = GameState.PartyManager.getCurrentPlayer();
    if(player){
      player.setHP(player.getMaxHP());
      player.setFP(player.getMaxFP());
    }
  }

  /** revealmap — toggle overlay flag. */
  static revealmap(){
    GameState.cheatRevealMap = !GameState.cheatRevealMap;
  }

  static turbo(){
    GameState.turboEnabled = !GameState.turboEnabled;
  }

  static invulnerability(){
    GameState.cheatInvulnerable = !GameState.cheatInvulnerable;
  }

  static infiniteUses(){
    GameState.infiniteUses = !GameState.infiniteUses;
  }

  /** Toggle NWScript ShipBuild — TRUE mimics shipping build builds (default). */
  static shipBuild(){
    GameState.shipBuild = !GameState.shipBuild;
    const line = `ShipBuild: ${GameState.shipBuild ? 'ON' : 'OFF'}`;
    console.log(line);
    GameState.FeedbackMessageManager?.AddMessage?.(line, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
  }

  static danceDanceMalak(){
    GameState.danceDanceMalak = true;
  }

  //Teleports your characters to a specific location
  static warp(name: string = ''){
    if(name){
      ModuleLoadCoordinator.LoadModule(name);
    }
  }

  /**
   * Lists warpable module resrefs under `modules/` (.rim /.mod).
   * Skips secondary archives (`*_s`) that are not standalone entry modules.
   */
  static async listModules(): Promise<string[]> {
    try{
      const files = await GameFileSystem.readdir('modules');
      const names = new Set<string>();
      for(const file of files){
        const base = (file.split(/[/\\]/).pop() || '').toLowerCase();
        const match = base.match(/^(.+)\.(rim|mod)$/);
        if(!match){ continue; }
        const name = match[1];
        if(name.endsWith('_s')){ continue; }
        names.add(name);
      }
      return Array.from(names).sort((a, b) => a.localeCompare(b));
    }catch(e){
      console.error('CheatConsoleManager.listModules failed', e);
      return [];
    }
  }

  /** whereami — Module + Position via AurPostString (feedback + console). */
  static whereami(){
    const player = GameState.PartyManager.getCurrentPlayer();
    if(!player){ return; }
    const mod = GameState.module?.filename || '';
    const line1 = `Module: ${mod}`;
    const line2 = `Position: (${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)})`;
    console.log(line1);
    console.log(line2);
    GameState.FeedbackMessageManager?.AddMessage?.(line1, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
    GameState.FeedbackMessageManager?.AddMessage?.(line2, FeebackMessageColor.INFO, 0, { bypassStatusSummary: true });
  }

  static giveRandomLoot(amount: number = 1) {
    const n = Math.max(1, Math.abs(Math.trunc(amount)) || 1);
    const items = KEYManager.Key.keys.filter( (k) => k.resType == ResourceTypes.uti );
    for(let i = 0; i < n; i++){
      const item = items[Math.floor(Math.random()*items.length)];
      if(item){
        CheatConsoleManager.giveItem(item.resRef, 1);
      }
    }
  }

  /**
   * CheatSetAbility — clamp 0–99.
   * index: 0 STR, 1 DEX, 2 CON, 3 INT, 4 WIS, 5 CHA
   */
  static setAbility(index: number, raw: string | undefined){
    const player = GameState.PartyManager.getCurrentPlayer();
    if(!player){ return; }
    let n = CheatConsoleManager.parseIntParam(raw, 0);
    if(n < 0) n = 0;
    if(n > 99) n = 99;
    switch(index){
      case 0: player.str = n; break;
      case 1: player.dex = n; break;
      case 2: player.con = n; break;
      case 3: player.int = n; break;
      case 4: player.wis = n; break;
      case 5: player.cha = n; break;
    }
  }

  /**
   * CheatSetSkill — clamp 0–99; skillIndex matches SkillType.
   */
  static setSkill(skillIndex: number, raw: string | undefined){
    const player = GameState.PartyManager.getCurrentPlayer();
    if(!player?.skills?.[skillIndex]){ return; }
    let n = CheatConsoleManager.parseIntParam(raw, 0);
    if(n < 0) n = 0;
    if(n > 99) n = 99;
    player.skills[skillIndex].rank = n;
  }

  /** Sorted unique console command names (+ KotOR.js aliases). */
  static getCommandNames(): string[] {
    return [
      'adddark',
      'adddarkside',
      'addlight',
      'addlightside',
      'addlevel',
      'addxp',
      'addexp',
      'bright',
      'giveitem',
      'givecredits',
      'givemed',
      'giverepair',
      'givecomspikes',
      'givesecspikes',
      'givesitharmour',
      'heal',
      'revealmap',
      'turbo',
      'invulnerability',
      'infiniteuses',
      'shipbuild',
      'warp',
      'whereami',
      'giverandomloot',
      'restartminigame',
      'dancedancemalak',
      'setstrength',
      'setdexterity',
      'setconstitution',
      'setintelligence',
      'setwisdom',
      'setcharisma',
      'setcomputeruse',
      'setdemolitions',
      'setstealth',
      'setawareness',
      'setpersuade',
      'setrepair',
      'setsecurity',
      'settreatinjury',
      'lightget',
      'lightset',
      'lightreset',
    ].slice().sort((a, b) => a.localeCompare(b));
  }

  static processCommand(command: string){
    const args = command.trim().toLowerCase().split(/\s+/);
    const cmd = args.shift();
    const params = args;
    if(cmd){
      GameState.PartyManager.CheatUsed = true;
    }
    switch(cmd){
      case 'adddark':
      case 'adddarkside':
        CheatConsoleManager.addDarkSide(CheatConsoleManager.parseIntParam(params[0]));
        break;
      case 'addlight':
      case 'addlightside':
        CheatConsoleManager.addLightSide(CheatConsoleManager.parseIntParam(params[0]));
        break;
      case 'addlevel':
        CheatConsoleManager.addLevel();
        break;
      case 'addxp':
      case 'addexp':
        CheatConsoleManager.addEXP(CheatConsoleManager.parseIntParam(params[0]));
        break;
      case 'bright':
        CheatConsoleManager.bright();
        break;
      case 'giveitem':
        CheatConsoleManager.giveItem(params[0], CheatConsoleManager.parseIntParam(params[1], 1));
        break;
      case 'givecredits':
        CheatConsoleManager.giveCredits(CheatConsoleManager.parseIntParam(params[0]));
        break;
      case 'givemed':
        CheatConsoleManager.giveMedPacks(CheatConsoleManager.clampGiveItemCount(params[0]));
        break;
      case 'giverepair':
        CheatConsoleManager.giveRepairKits(CheatConsoleManager.clampGiveItemCount(params[0]));
        break;
      case 'givecomspikes':
        CheatConsoleManager.giveComputerSpikes(CheatConsoleManager.clampGiveItemCount(params[0]));
        break;
      case 'givesecspikes':
        CheatConsoleManager.giveSecuritySpikes(CheatConsoleManager.clampGiveItemCount(params[0]));
        break;
      case 'givesitharmour':
        CheatConsoleManager.giveSithArmour();
        break;
      case 'heal':
        CheatConsoleManager.heal();
        break;
      case 'revealmap':
        CheatConsoleManager.revealmap();
        break;
      case 'turbo':
        CheatConsoleManager.turbo();
        break;
      case 'invulnerability':
        CheatConsoleManager.invulnerability();
        break;
      case 'infiniteuses':
        CheatConsoleManager.infiniteUses();
        break;
      case 'shipbuild':
        CheatConsoleManager.shipBuild();
        break;
      case 'warp':
        CheatConsoleManager.warp(params[0]);
        break;
      case 'whereami':
        CheatConsoleManager.whereami();
        break;
      case 'giverandomloot':
        CheatConsoleManager.giveRandomLoot(CheatConsoleManager.parseIntParam(params[0], 1));
        break;
      case 'restartminigame':
        // ConsoleFunc "restartminigame" → RestartMiniGame.
        void GameState.module?.area?.restartMiniGame?.();
        break;
      case 'dancedancemalak':
        CheatConsoleManager.danceDanceMalak();
        break;
      case 'setstrength':
        CheatConsoleManager.setAbility(0, params[0]);
        break;
      case 'setdexterity':
        CheatConsoleManager.setAbility(1, params[0]);
        break;
      case 'setconstitution':
        CheatConsoleManager.setAbility(2, params[0]);
        break;
      case 'setintelligence':
        CheatConsoleManager.setAbility(3, params[0]);
        break;
      case 'setwisdom':
        CheatConsoleManager.setAbility(4, params[0]);
        break;
      case 'setcharisma':
        CheatConsoleManager.setAbility(5, params[0]);
        break;
      case 'setcomputeruse':
        CheatConsoleManager.setSkill(SkillType.COMPUTER_USE, params[0]);
        break;
      case 'setdemolitions':
        CheatConsoleManager.setSkill(SkillType.DEMOLITIONS, params[0]);
        break;
      case 'setstealth':
        CheatConsoleManager.setSkill(SkillType.STEALTH, params[0]);
        break;
      case 'setawareness':
        CheatConsoleManager.setSkill(SkillType.AWARENESS, params[0]);
        break;
      case 'setpersuade':
        CheatConsoleManager.setSkill(SkillType.PERSUADE, params[0]);
        break;
      case 'setrepair':
        CheatConsoleManager.setSkill(SkillType.REPAIR, params[0]);
        break;
      case 'setsecurity':
        CheatConsoleManager.setSkill(SkillType.SECURITY, params[0]);
        break;
      case 'settreatinjury':
        CheatConsoleManager.setSkill(SkillType.TREAT_INJURY, params[0]);
        break;
      case 'lightget':
        CheatConsoleManager.lightGet(params[0]);
        break;
      case 'lightset':
        CheatConsoleManager.lightSet(params[0], params[1]);
        break;
      case 'lightreset':
        CheatConsoleManager.lightReset(params[0]);
        break;
    }
  }

}
