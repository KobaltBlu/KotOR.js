import { GameState } from "@/GameState";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import * as path from "path";
import * as THREE from "three";
import EngineLocation from "@/engine/EngineLocation";
import { CurrentGame } from "@/engine/CurrentGame";
import { ModuleCreature, createDefaultPartyFollowInfo } from "@/module/ModuleCreature";
import { OdysseyModel3D } from "@/three/odyssey";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { ResourceLoader } from "@/loaders";
import { GameEngineType, UIIconTimerType } from "@/enums/engine";
import { PartyManagerEvent } from "@/types/PartyManagerEvent";
import { ModulePlayer } from "@/module/ModulePlayer";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { JournalEntry } from "@/engine/JournalEntry";
import { DialogMessageEntry } from "@/engine/DialogMessageEntry";
import { FeedbackMessageEntry } from "@/engine/FeedbackMessageEntry";
import { PazaakCards } from "@/enums/minigames/PazaakCards";
import { PazaakSideDeckSlots } from "@/enums/minigames/PazaakSideDeckSlots";
import { type SWPortrait } from "@/engine/rules/SWPortrait";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { AILevel } from "@/enums/module/AILevel";
import { BitWise } from "@/utility/BitWise";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { partyFollowPath } from "@/engine/pathfinding/party-follow-path";
import { computeSafeLocation } from "@/engine/pathfinding/compute-safe-location";

export interface CurrentMember {
  isLeader: boolean,
  memberID: number
}

export interface PartyNPC {
  available: boolean;
  canSelect: boolean;
  spawned: boolean;
  template?: GFFObject;
  moduleObject?: ModuleCreature;
}

export interface PartyNPCList {
  [key: string]: PartyNPC;
}

export interface PartyPuppet {
  available: boolean;
  select: boolean;
  /** UTC template (AVAILPUP{n}.utc), same pattern as PartyNPC */
  template?: GFFObject;
  /** Spawned creature when present in the area (party table object id cache) */
  moduleObject?: ModuleCreature;
}

export interface PartyPuppetList {
  [key: string]: PartyPuppet;
}

export interface CurrentPuppet {
  puppetID: number;
}

/**
 * PartyManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file PartyManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class PartyManager {

  static partyTableTemplate: GFFObject;

  static party: ModuleCreature[] = [];
  static aiStyle = 0;

  /**
   * Retail CSWPartyTable::SetSoloMode + TogglePartyFollow (runs k_sup_solo).
   * @param enabled - solo mode on/off
   * @param options.unstealthOnDisable - when turning solo off, strip party stealth (retail UnstealthParty)
   * @param options.runScript - run k_sup_solo after the flag changes (retail TogglePartyFollow)
   */
  static setSoloMode(enabled: boolean, options: { unstealthOnDisable?: boolean; runScript?: boolean } = {}){
    const unstealthOnDisable = options.unstealthOnDisable !== false;
    const runScript = options.runScript !== false;
    const next = !!enabled;
    const wasSolo = !!GameState.SOLOMODE;

    if(!next && unstealthOnDisable && wasSolo){
      for(let i = 0; i < PartyManager.party.length; i++){
        const member = PartyManager.party[i];
        if(member?.stealthMode){
          member.setStealthMode(false);
        }
      }
    }

    GameState.SOLOMODE = next;

    if(runScript && wasSolo !== next){
      try{
        const script = GameState.NWScript.Load('k_sup_solo');
        if(script){
          // Retail runs on OBJECT_INVALID (0x7f000000)
          script.run(PartyManager.party[0] || GameState.module?.area);
        }
      }catch(e){
        // Script may be missing outside a full install
      }
    }
  }

  /**
   * Current Player Creature (Can be overridden by with an NPC)
   * This object will be stored in the Module's PlayList on Save
   */
  static Player: ModuleCreature;
  static PlayerTemplate: GFFObject;

  /**
   * Actual Player Creature (This is the player create that was created by the player)
   * If Player is not Equal to ActualPlayer export pc.utc on Save
   */
  // static ActualPlayer: ModulePlayer;
  static ActualPlayerTemplate: GFFObject;

  static PortraitOrder: any[] = [];
  static MaxSize = 3;
  static MaxNPCCount = 2;
  static MaxPartyCount = 12;
  static NPCS: PartyNPCList = {};

  static Puppets: PartyPuppetList = {};

  static PuppetCount: number = 0;
  static MaxPuppetCount = 3;

  static Gold = 0;
  static CurrentMembers: CurrentMember[] = [];
  /** Active party puppet slot IDs (TSL PT_PUPPETS / PT_PUPPET_ID). */
  static CurrentPuppets: CurrentPuppet[] = [];

  static InfluenceMap: Map<number, number> = new Map<number, number>();
  static ChemicalCount: number = 0;
  static ComponentCount: number = 0;
  /** Party XP pool (retail PT_XP_POOL). */
  static XPPool: number = 0;
  /** Controlled party index; -1 = PC (retail PT_CONTROLLED_NPC). */
  static ControlledNPC: number = -1;
  /** Party AI / follow state (retail PT_AISTATE / PT_FOLLOWSTATE). */
  static AIState: number = 0;
  static FollowState: number = 0;
  /** TSL: DisableMap / DisableHealthRegen (PT_DISABLEMAP / PT_DISABLEREGEN). */
  static DisableMap: boolean = false;
  static DisableHealthRegen: boolean = false;
  /** TSL: battle-circle forfeit (FORFEITCONDS / FORFEITVIOL). */
  static ForfeitConditions: number = 0;
  static LastForfeitViolation: number = 0;
  /** Retail CHEATUSED / PT_CHEAT_USED — set when cheat console is used */
  static CheatUsed: boolean = false;
  /** NFO GAMEPLAYHINT (BYTE) */
  static GameplayHint: number = 0;
  /** K1 NFO STORYHINT (BYTE) */
  static StoryHint: number = 0;
  /** TSL NFO STORYHINT0..9 */
  static StoryHints: number[] = [0,0,0,0,0,0,0,0,0,0];
  /** Retail PT_LAST_GUI_PNL */
  static LastGuiPanel: number = 0;
  /** TSL PT_COM_MSG_LIST entries */
  static CombatMessages: { msg: string; type: number; color: number }[] = [];

  /** TSL partytable PT_SWOOP1..3 (SaveTableInfo @ 00700e00 / LoadTableInfo). */
  static SwoopUpgrade1: number = -1;
  static SwoopUpgrade2: number = -1;
  static SwoopUpgrade3: number = -1;
  /**
   * Extra runtime slots from CSWGuiSwoopUpgrade::OnAssemble (6 total).
   * Retail partytable only persists PT_SWOOP1..3 — slots 4–6 are session-only.
   */
  static SwoopUpgrade4: number = -1;
  static SwoopUpgrade5: number = -1;
  static SwoopUpgrade6: number = -1;

  /** Retail OnAssemble writes swoopupgrade.2da row ids into slots 0..5. */
  static setSwoopUpgradeSlot(slot: number, rowIndex: number){
    const v = (typeof rowIndex === 'number' && Number.isFinite(rowIndex)) ? rowIndex : -1;
    switch(slot){
      case 0: PartyManager.SwoopUpgrade1 = v; break;
      case 1: PartyManager.SwoopUpgrade2 = v; break;
      case 2: PartyManager.SwoopUpgrade3 = v; break;
      case 3: PartyManager.SwoopUpgrade4 = v; break;
      case 4: PartyManager.SwoopUpgrade5 = v; break;
      case 5: PartyManager.SwoopUpgrade6 = v; break;
    }
  }

  static getSwoopUpgradeSlot(slot: number): number {
    switch(slot){
      case 0: return PartyManager.SwoopUpgrade1;
      case 1: return PartyManager.SwoopUpgrade2;
      case 2: return PartyManager.SwoopUpgrade3;
      case 3: return PartyManager.SwoopUpgrade4;
      case 4: return PartyManager.SwoopUpgrade5;
      case 5: return PartyManager.SwoopUpgrade6;
      default: return -1;
    }
  }

  static #eventListeners: Map<PartyManagerEvent, Function[]> = new Map();

  /**
   * Initialize the party manager
   * @returns void
   */
  static Initialize(){
    PartyManager.MaxPartyCount = GameState.GameKey == GameEngineType.TSL ? 12 : 9;
    PartyManager.MaxPuppetCount = GameState.GameKey == GameEngineType.TSL ? 3 : 0;
    partyFollowPath.reset();

    for(let i = 0; i < PartyManager.MaxPartyCount; i++){
      GameState.PartyManager.InfluenceMap.set(i, -1);
      GameState.PartyManager.NPCS[i] = {
        available: false,
        canSelect: false,
        spawned: false
      };
    }

    for(let i = 0; i < PartyManager.MaxPuppetCount; i++){
      GameState.PartyManager.Puppets[i] = {
        available: false,
        select: true
      };
    }
    GameState.PartyManager.CurrentPuppets = [];
    GameState.PartyManager.PuppetCount = 0;
    GameState.PartyManager.XPPool = 0;
    GameState.PartyManager.ControlledNPC = -1;
    GameState.PartyManager.AIState = 0;
    GameState.PartyManager.FollowState = 0;
    GameState.PartyManager.formation = 0;
    GameState.PartyManager.formationInvert = false;
    GameState.PartyManager.DisableMap = false;
    GameState.PartyManager.DisableHealthRegen = false;
    GameState.PartyManager.ForfeitConditions = 0;
    GameState.PartyManager.LastForfeitViolation = 0;
    GameState.PartyManager.SwoopUpgrade1 = -1;
    GameState.PartyManager.SwoopUpgrade2 = -1;
    GameState.PartyManager.SwoopUpgrade3 = -1;
    GameState.PartyManager.SwoopUpgrade4 = -1;
    GameState.PartyManager.SwoopUpgrade5 = -1;
    GameState.PartyManager.SwoopUpgrade6 = -1;
  }

  /**
   * Load the party manager
   * @param gff - The GFF object to load
   * @returns void
   */
  static async Load(gff: GFFObject){
    if(!(gff instanceof GFFObject)){
      console.error('PartyManager.Load', gff);
      throw 'PartyManager expected gff to be of type GFFObject';
    }

    PartyManager.partyTableTemplate = gff;

    PartyManager.MaxPartyCount = GameState.GameKey == GameEngineType.TSL ? 12 : 9;
    PartyManager.MaxPuppetCount = GameState.GameKey == GameEngineType.TSL ? 3 : 0;
    
    for(let i = 0; i < PartyManager.MaxPartyCount; i++){
      GameState.PartyManager.InfluenceMap.set(i, -1);
      GameState.PartyManager.NPCS[i] = {
        available: false,
        canSelect: false,
        spawned: false
      };
    }

    for(let i = 0; i < PartyManager.MaxPuppetCount; i++){
      GameState.PartyManager.Puppets[i] = {
        available: false,
        select: true
      };
    }
    GameState.PartyManager.CurrentPuppets = [];
    GameState.PartyManager.PuppetCount = 0;
    GameState.PartyManager.XPPool = 0;
    GameState.PartyManager.ControlledNPC = -1;
    GameState.PartyManager.CheatUsed = false;
    GameState.turboEnabled = false;
    GameState.cheatInvulnerable = false;
    GameState.infiniteUses = false;
    GameState.cheatRevealMap = false;
    GameState.danceDanceMalak = false;
    GameState.PartyManager.GameplayHint = 0;
    GameState.PartyManager.StoryHint = 0;
    GameState.PartyManager.StoryHints = [0,0,0,0,0,0,0,0,0,0];
    GameState.PartyManager.LastGuiPanel = 0;
    GameState.PartyManager.CombatMessages = [];
    GameState.PartyManager.AIState = 0;
    GameState.PartyManager.FollowState = 0;
    GameState.PartyManager.formation = 0;
    GameState.PartyManager.formationInvert = false;
    GameState.PartyManager.DisableMap = false;
    GameState.PartyManager.DisableHealthRegen = false;
    GameState.PartyManager.ForfeitConditions = 0;
    GameState.PartyManager.LastForfeitViolation = 0;

    if(gff.RootNode.hasField('GlxyMap')){
      let GlxyMap = gff.getFieldByLabel('GlxyMap').getChildStructs()[0];
      
      let planetCount = GlxyMap.getFieldByLabel('GlxyMapNumPnts').getValue();
      let planetBits = GlxyMap.getFieldByLabel('GlxyMapPlntMsk').getValue(); //Max 32?
      let currentPlanet = GlxyMap.getFieldByLabel('GlxyMapSelPnt').getValue();

      for(let i = 0; i < planetCount; i++){
        GameState.Planetary.SetPlanetAvailable(i,  !!((planetBits >> i) & 0x01));
        GameState.Planetary.SetPlanetSelectable(i, !!((planetBits >> (i + 16)) & 0x01));
      }

      GameState.Planetary.SetSelectedPlanet(currentPlanet);
    }

    //Init the TutorialWindowTracker      
    const tutorial2DA = GameState.TwoDAManager.datatables.get('tutorial');
    let bitCount = 0;
    if(tutorial2DA){
      bitCount = Math.ceil(tutorial2DA.RowCount / 8) * 8;
      for(let i = 0; i < bitCount; i++){
        GameState.TutorialWindowTracker[i] = 0;
      }
    }

    if(gff.RootNode.hasField('PT_TUT_WND_SHOWN')){
      let tutWindBytes = gff.RootNode.getFieldByLabel('PT_TUT_WND_SHOWN').getVoid();
      let maxBits = tutWindBytes.length * 8;
      for(let i = 0; i < maxBits; i++){
        for(let j = 0; j < 8; j++){
          let bit = (tutWindBytes[i] >> j) & 1;
          GameState.TutorialWindowTracker[ (i * 8) + j ] = bit;
        }
      }
    }

    if(gff.RootNode.hasField('PT_SOLOMODE')){
      GameState.SOLOMODE = !!gff.RootNode.getFieldByLabel('PT_SOLOMODE').getValue();
    }
  
    if(gff.RootNode.hasField('PT_AVAIL_NPCS')){
      let avail = gff.getFieldByLabel('PT_AVAIL_NPCS').getChildStructs();
      for(let i = 0; i < avail.length; i++){
        //console.log(PartyManager.NPCS[i]);
        GameState.PartyManager.NPCS[i].available = avail[i].getFieldByLabel('PT_NPC_AVAIL').getValue();
        GameState.PartyManager.NPCS[i].canSelect = avail[i].getFieldByLabel('PT_NPC_SELECT').getValue();
      }
    }
  
    //TSL: PT_AVAIL_PUPS
    if(gff.RootNode.hasField('PT_AVAIL_PUPS')){
      let avail = gff.getFieldByLabel('PT_AVAIL_PUPS').getChildStructs();
      for(let i = 0; i < avail.length; i++){
        GameState.PartyManager.Puppets[i].available = !!avail[i].getFieldByLabel('PT_PUP_AVAIL').getValue();
        GameState.PartyManager.Puppets[i].select = !!avail[i].getFieldByLabel('PT_PUP_SELECT').getValue();
      }
    }

    //TSL: PT_ITEM_CHEMICAL / PT_ITEM_COMPONENT (retail SaveTableInfo)
    if(gff.RootNode.hasField('PT_ITEM_CHEMICAL')){
      GameState.PartyManager.ChemicalCount = gff.RootNode.getFieldByLabel('PT_ITEM_CHEMICAL').getValue();
    }

    if(gff.RootNode.hasField('PT_ITEM_COMPONENT')){
      GameState.PartyManager.ComponentCount = gff.RootNode.getFieldByLabel('PT_ITEM_COMPONENT').getValue();
    }else if(gff.RootNode.hasField('PT_ITEM_COMPONEN')){
      // Legacy truncated field name
      GameState.PartyManager.ComponentCount = gff.RootNode.getFieldByLabel('PT_ITEM_COMPONEN').getValue();
    }
  
    //TSL: PT_INFLUENCE
    if(gff.RootNode.hasField('PT_INFLUENCE')){
      const list = gff.getFieldByLabel('PT_INFLUENCE').getChildStructs();
      for(let i = 0; i < list.length; i++){
        GameState.PartyManager.InfluenceMap.set(i, list[i].getFieldByLabel('PT_NPC_INFLUENCE').getValue());
      }
    }
  
    //TSL: PT_PUPPETS — active puppet slot IDs in the party
    GameState.PartyManager.CurrentPuppets = [];
    if(gff.RootNode.hasField('PT_PUPPETS')){
      const list = gff.getFieldByLabel('PT_PUPPETS').getChildStructs();
      for(let i = 0; i < list.length; i++){
        const idField = list[i].getFieldByLabel('PT_PUPPET_ID');
        if(!idField) continue;
        GameState.PartyManager.CurrentPuppets.push({ puppetID: idField.getValue() | 0 });
      }
    }
    if(gff.RootNode.hasField('PT_NUM_PUPPETS')){
      GameState.PartyManager.PuppetCount = gff.RootNode.getFieldByLabel('PT_NUM_PUPPETS').getValue() | 0;
    }else{
      GameState.PartyManager.PuppetCount = GameState.PartyManager.CurrentPuppets.length;
    }

    GameState.PartyManager.Gold = gff.RootNode.getFieldByLabel('PT_GOLD').getValue();

    // Retail label is PT_CONTROLLED_NPC (16 chars); accept legacy truncated PT_CONTROLLED_NP
    const controlledField =
      gff.RootNode.getFieldByLabel('PT_CONTROLLED_NPC') ||
      gff.RootNode.getFieldByLabel('PT_CONTROLLED_NP');
    if(controlledField){
      GameState.PartyManager.ControlledNPC = controlledField.getValue() | 0;
    }

    if(gff.RootNode.hasField('PT_XP_POOL')){
      GameState.PartyManager.XPPool = gff.RootNode.getFieldByLabel('PT_XP_POOL').getValue() | 0;
    }

    if(gff.RootNode.hasField('PT_CHEAT_USED')){
      GameState.PartyManager.CheatUsed = !!gff.RootNode.getFieldByLabel('PT_CHEAT_USED').getValue();
    }

    if(gff.RootNode.hasField('PT_AISTATE')){
      GameState.PartyManager.AIState = gff.RootNode.getFieldByLabel('PT_AISTATE').getValue() | 0;
    }

    if(gff.RootNode.hasField('PT_FOLLOWSTATE')){
      GameState.PartyManager.FollowState = gff.RootNode.getFieldByLabel('PT_FOLLOWSTATE').getValue() | 0;
    }

    if(gff.RootNode.hasField('PT_PLAYEDSECONDS')){
      const played = gff.RootNode.getFieldByLabel('PT_PLAYEDSECONDS').getValue() | 0;
      if(played > 0){
        GameState.time = played;
      }
    }

    // TSL LoadTableInfo — PT_SWOOP1..3 only (no PT_SWOOP4..6 in retail).
    if(gff.RootNode.hasField('PT_SWOOP1')){
      GameState.PartyManager.SwoopUpgrade1 = gff.RootNode.getFieldByLabel('PT_SWOOP1').getValue() | 0;
    }
    if(gff.RootNode.hasField('PT_SWOOP2')){
      GameState.PartyManager.SwoopUpgrade2 = gff.RootNode.getFieldByLabel('PT_SWOOP2').getValue() | 0;
    }
    if(gff.RootNode.hasField('PT_SWOOP3')){
      GameState.PartyManager.SwoopUpgrade3 = gff.RootNode.getFieldByLabel('PT_SWOOP3').getValue() | 0;
    }
    if(gff.RootNode.hasField('PT_DISABLEMAP')){
      GameState.PartyManager.DisableMap = !!gff.RootNode.getFieldByLabel('PT_DISABLEMAP').getValue();
    }
    if(gff.RootNode.hasField('PT_DISABLEREGEN')){
      GameState.PartyManager.DisableHealthRegen = !!gff.RootNode.getFieldByLabel('PT_DISABLEREGEN').getValue();
    }
    if(gff.RootNode.hasField('FORFEITCONDS')){
      GameState.PartyManager.ForfeitConditions = gff.RootNode.getFieldByLabel('FORFEITCONDS').getValue() | 0;
    }
    if(gff.RootNode.hasField('FORFEITVIOL')){
      GameState.PartyManager.LastForfeitViolation = gff.RootNode.getFieldByLabel('FORFEITVIOL').getValue() | 0;
    }

    if(gff.RootNode.hasField('PT_MEMBERS')){
      let pms = gff.getFieldByLabel('PT_MEMBERS').getChildStructs();
      let currentPartyInfo = [];
      GameState.PartyManager.CurrentMembers = [];
      for(let i = 0; i < pms.length; i++){
        GameState.PartyManager.CurrentMembers.push({
          isLeader: pms[i].getFieldByLabel('PT_IS_LEADER').getValue() ? true : false,
          memberID: pms[i].getFieldByLabel('PT_MEMBER_ID').getValue()
        })
      }
    }

    if(gff.RootNode.hasField('JNL_Entries')){
      GameState.JournalManager.ClearEntries();
      const entries = gff.RootNode.getFieldByLabel('JNL_Entries').getChildStructs();
      for(let i = 0; i < entries.length; i++){
        GameState.JournalManager.AddEntry(JournalEntry.FromStruct(entries[i]));
      }
    }

    if(gff.RootNode.hasField('JNL_SortOrder')){
      GameState.JournalManager.SortOrder = gff.RootNode.getFieldByLabel('JNL_SortOrder').getValue() | 0;
    }

    if(gff.RootNode.hasField('PT_DLG_MSG_LIST')){
      GameState.DialogMessageManager.ClearEntries();
      const entries = gff.RootNode.getFieldByLabel('PT_DLG_MSG_LIST').getChildStructs();
      for(let i = 0; i < entries.length; i++){
        GameState.DialogMessageManager.AddEntry(DialogMessageEntry.FromStruct(entries[i]));
      }
    }

    if(gff.RootNode.hasField('PT_FB_MSG_LIST')){
      GameState.FeedbackMessageManager.ClearEntries();
      const entries = gff.RootNode.getFieldByLabel('PT_FB_MSG_LIST').getChildStructs();
      for(let i = 0; i < entries.length; i++){
        GameState.FeedbackMessageManager.AddEntry(
          FeedbackMessageEntry.FromStruct(entries[i]),
          { bypassStatusSummary: true }
        );
      }
    }

    if(gff.RootNode.hasField('PT_LAST_GUI_PNL')){
      GameState.PartyManager.LastGuiPanel = gff.RootNode.getFieldByLabel('PT_LAST_GUI_PNL').getValue() | 0;
    }

    if(gff.RootNode.hasField('PT_COM_MSG_LIST')){
      GameState.PartyManager.CombatMessages = [];
      const entries = gff.RootNode.getFieldByLabel('PT_COM_MSG_LIST').getChildStructs();
      for(let i = 0; i < entries.length; i++){
        const s = entries[i];
        GameState.PartyManager.CombatMessages.push({
          msg: s.hasField('PT_COM_MSG_MSG') ? s.getFieldByLabel('PT_COM_MSG_MSG').getValue() : '',
          type: s.hasField('PT_COM_MSG_TYPE') ? (s.getFieldByLabel('PT_COM_MSG_TYPE').getValue() | 0) : 0,
          color: s.hasField('PT_COM_MSG_COOR') ? (s.getFieldByLabel('PT_COM_MSG_COOR').getValue() | 0) : 0,
        });
      }
      // Pass AE: restore combat log into Feedback/Messages UI
      for(let i = 0; i < GameState.PartyManager.CombatMessages.length; i++){
        const cm = GameState.PartyManager.CombatMessages[i];
        if(cm.msg){
          GameState.FeedbackMessageManager?.AddMessage?.(cm.msg, cm.color);
        }
      }
    }

    // Retail LoadTableInfo — restore per-baseitem cost multipliers (CSWBaseItem+0xc4),
    // independent of baseitems.itemmultiplier used by GetCost.
    const costMultField =
      gff.RootNode.getFieldByLabel('PT_COST_MULT_LIST') ||
      gff.RootNode.getFieldByLabel('PT_COST_MULT_LIS');
    if(costMultField){
      const list = costMultField.getChildStructs();
      const baseItems = GameState.SWRuleSet?.baseItems || [];
      for(let i = 0; i < list.length && i < baseItems.length; i++){
        const v =
          list[i].getFieldByLabel('PT_COST_MULT_VALUE')?.getValue() ??
          list[i].getFieldByLabel('PT_COST_MULT_VAL')?.getValue();
        if(typeof v === 'number' && Number.isFinite(v)){
          baseItems[i].costMultiplier = v;
        }else{
          baseItems[i].costMultiplier = 1;
        }
      }
    }

    for(let i = 0; i < PartyManager.MaxPartyCount; i++){
      const id = i;
      try{
        const buffer = await GameFileSystem.readFile( path.join( CurrentGame.gameinprogress_dir, 'availnpc'+id+'.utc') );
        GameState.PartyManager.NPCS[id].template = null;
        if(buffer.length){
          GameState.PartyManager.NPCS[id].template = new GFFObject(buffer);
        }
      }catch(e){
        console.log(e);
      }
    }

    // TSL: AVAILPUP{n}.utc beside AVAILNPC (GetPupFilename → "AVAILPUP%d")
    if(GameState.GameKey == GameEngineType.TSL){
      for(let i = 0; i < PartyManager.MaxPuppetCount; i++){
        try{
          const buffer = await GameFileSystem.readFile( path.join( CurrentGame.gameinprogress_dir, 'availpup'+i+'.utc') );
          if(buffer.length){
            const pup = GameState.PartyManager.Puppets[i] || { available: false, select: true };
            pup.template = new GFFObject(buffer);
            GameState.PartyManager.Puppets[i] = pup;
          }
        }catch(e){
          // Missing AVAILPUP is normal when slot never saved
        }
      }
    }

    /**
     * Pazaak Cards
     * PT_PAZAAKCARDS contains the cards that the player has in their deck
     * struct child index is the card enum value
     * PT_PAZAAKCOUNT is the number of that card in the deck
     * - max index is 17
     * - unknown 18th index always contains a PT_PAZAAKCOUNT of 0 unlike the other 17 PT_PAZAAKCOUNT is a BYTE
     * - where the other 17 are INTs
     */
    if(gff.RootNode.hasField('PT_PAZAAKCARDS')){
      const list = gff.RootNode.getFieldByLabel('PT_PAZAAKCARDS').getChildStructs();
      for(let i = 0; i < list.length; i++){
        GameState.PazaakManager.Cards.set(i, {
          card: i,
          count: list[i].getFieldByLabel('PT_PAZAAKCOUNT').getValue()
        });
      }
    }

    /**
     * Pazaak Side Deck
     * PT_PAZSIDELIST contains the cards that the player has equipped in their side deck
     * struct child index is the card index in the side deck
     * PT_PAZSIDECARD is the card enum value
     * max index is 10
     */
    if(gff.RootNode.hasField('PT_PAZSIDELIST')){
      const list = gff.RootNode.getFieldByLabel('PT_PAZSIDELIST').getChildStructs();
      for(let i = 0; i < list.length; i++){
        GameState.PazaakManager.PlayerSideDeck.set(i, list[i].getFieldByLabel('PT_PAZSIDECARD').getValue());
      }
    }

    const { SaveLoadAudit } = await import("@/engine/SaveLoadAudit");
    SaveLoadAudit.runRetailCompatChecklist('load');
  }

  /**
   * Export the party manager
   * @param directory - The directory to export to
   * @returns void
   */
  static async Export(directory = ''){
    return new Promise<void>( (resolve, reject) => {
      //Export PARTYTABLE.res
      let partytable = new GFFObject();
      partytable.FileType = 'PT  ';
      partytable.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'GlxyMap')).addChildStruct( GameState.Planetary.SaveStruct() );
      const jnl_list = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'JNL_Entries'));

      for(let i = 0; i <  GameState.JournalManager.Entries.length; i++){
        jnl_list.addChildStruct(
          GameState.JournalManager.Entries[i].toStruct()
        );
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'JNL_SortOrder')).setValue(GameState.JournalManager.SortOrder | 0);
      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_AISTATE')).setValue(GameState.PartyManager.AIState | 0);
      let availNPCSList = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_AVAIL_NPCS'));

      let maxPartyMembers = (GameState.GameKey == GameEngineType.KOTOR) ? 9 : 12;
      for(let i = 0; i < maxPartyMembers; i++){
        let pm = GameState.PartyManager.NPCS[i];
        let availStruct = new GFFStruct();
        availStruct.addField( new GFFField(GFFDataType.BYTE, 'PT_NPC_AVAIL') ).setValue(pm.available ? 1 : 0);
        availStruct.addField( new GFFField(GFFDataType.BYTE, 'PT_NPC_SELECT') ).setValue(pm.canSelect ? 1 : 0);
        availNPCSList.addChildStruct(availStruct);
      }

      // Retail SaveTableInfo WriteFieldBYTE PT_CHEAT_USED
      partytable.RootNode.addField(new GFFField(GFFDataType.BYTE, 'PT_CHEAT_USED')).setValue(GameState.PartyManager.CheatUsed ? 1 : 0);
      const controlledIdx = GameState.getCurrentPlayer() == GameState.PartyManager.Player
        ? -1
        : GameState.PartyManager.party.indexOf(GameState.getCurrentPlayer());
      GameState.PartyManager.ControlledNPC = controlledIdx;
      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_CONTROLLED_NPC')).setValue(controlledIdx);

      // Retail SaveTableInfo — one PT_COST_MULT_VALUE per baseitems row (default 1.0)
      const costMultList = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_COST_MULT_LIST'));
      const baseItems = GameState.SWRuleSet?.baseItems || [];
      for(let i = 0; i < baseItems.length; i++){
        const costStruct = new GFFStruct(0);
        const mult = Number(baseItems[i]?.costMultiplier);
        costStruct.addField(new GFFField(GFFDataType.FLOAT, 'PT_COST_MULT_VALUE')).setValue(
          Number.isFinite(mult) ? mult : 1
        );
        costMultList.addChildStruct(costStruct);
      }
      const dlg_list = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_DLG_MSG_LIST'));

      for(let i = 0; i <  GameState.DialogMessageManager.Entries.length; i++){
        dlg_list.addChildStruct(
          GameState.DialogMessageManager.Entries[i].toStruct()
        );
      }

      const fb_list = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_FB_MSG_LIST'));

      for(let i = 0; i <  GameState.FeedbackMessageManager.Entries.length; i++){
        fb_list.addChildStruct(
          GameState.FeedbackMessageManager.Entries[i].toStruct()
        );
      }

      if(GameState.GameKey == GameEngineType.TSL){
        const com_list = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_COM_MSG_LIST'));
        for(let i = 0; i < GameState.PartyManager.CombatMessages.length; i++){
          const cm = GameState.PartyManager.CombatMessages[i];
          const comStruct = new GFFStruct(0);
          comStruct.addField(new GFFField(GFFDataType.CEXOSTRING, 'PT_COM_MSG_MSG')).setValue(cm.msg || '');
          comStruct.addField(new GFFField(GFFDataType.DWORD, 'PT_COM_MSG_TYPE')).setValue(cm.type | 0);
          comStruct.addField(new GFFField(GFFDataType.BYTE, 'PT_COM_MSG_COOR')).setValue(cm.color | 0);
          com_list.addChildStruct(comStruct);
        }
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_FOLLOWSTATE')).setValue(GameState.PartyManager.FollowState | 0);
      partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_GOLD')).setValue(GameState.PartyManager.Gold);
      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_LAST_GUI_PNL')).setValue(GameState.PartyManager.LastGuiPanel | 0);
      let ptMembersList = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_MEMBERS'));

      let numMembers = 0;
      for(let i = 0; i < GameState.PartyManager.party.length; i++){
        let member = GameState.PartyManager.party[i];
        // Retail GetNPCObject: unavailable CNPCs are not active party members
        if(member != GameState.PartyManager.Player && PartyManager.IsAvailable(member.npcId)){
          let memberStruct = new GFFStruct();
          memberStruct.addField( new GFFField(GFFDataType.BYTE, 'PT_IS_LEADER') ).setValue( GameState.getCurrentPlayer() == member ? 1 : 0 );
          memberStruct.addField( new GFFField(GFFDataType.INT, 'PT_MEMBER_ID') ).setValue( member.npcId );
          ptMembersList.addChildStruct( memberStruct );
          numMembers++;
        }
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.BYTE, 'PT_NUM_MEMBERS')).setValue(numMembers);

      // TSL SaveTableInfo @ 00700e00 — puppets + components/chemicals + influence + swoops
      if(GameState.GameKey == GameEngineType.TSL){
        const pc = GameState.PartyManager.Player || GameState.getCurrentPlayer();
        const pcName = (pc && typeof pc.getName === 'function') ? (pc.getName() || '') : '';
        partytable.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'PT_PCNAME')).setValue(pcName);
        // Retail SaveTableInfo @ 00700e00 — PT_SWOOP1..3 only.
        partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_SWOOP1')).setValue(
          GameState.PartyManager.SwoopUpgrade1 | 0
        );
        partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_SWOOP2')).setValue(
          GameState.PartyManager.SwoopUpgrade2 | 0
        );
        partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_SWOOP3')).setValue(
          GameState.PartyManager.SwoopUpgrade3 | 0
        );

        const puppets = GameState.PartyManager.CurrentPuppets || [];
        partytable.RootNode.addField(new GFFField(GFFDataType.BYTE, 'PT_NUM_PUPPETS')).setValue(puppets.length);
        const puppetsList = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_PUPPETS'));
        for(let i = 0; i < puppets.length; i++){
          const pupStruct = new GFFStruct(0);
          pupStruct.addField(new GFFField(GFFDataType.INT, 'PT_PUPPET_ID')).setValue(puppets[i].puppetID | 0);
          puppetsList.addChildStruct(pupStruct);
        }

        const availPups = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_AVAIL_PUPS'));
        for(let i = 0; i < PartyManager.MaxPuppetCount; i++){
          const pm = GameState.PartyManager.Puppets[i] || { available: false, select: true };
          const availStruct = new GFFStruct(0);
          availStruct.addField(new GFFField(GFFDataType.BYTE, 'PT_PUP_AVAIL')).setValue(pm.available ? 1 : 0);
          availStruct.addField(new GFFField(GFFDataType.BYTE, 'PT_PUP_SELECT')).setValue(pm.select ? 1 : 0);
          availPups.addChildStruct(availStruct);
        }

        partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_ITEM_COMPONENT')).setValue(
          GameState.PartyManager.ComponentCount | 0
        );
        partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_ITEM_CHEMICAL')).setValue(
          GameState.PartyManager.ChemicalCount | 0
        );

        // Retail SaveTableInfo — 12 influence entries
        const influenceList = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_INFLUENCE'));
        for(let i = 0; i < 12; i++){
          const inflStruct = new GFFStruct(0);
          const infl = GameState.PartyManager.InfluenceMap.has(i)
            ? GameState.PartyManager.InfluenceMap.get(i)
            : -1;
          inflStruct.addField(new GFFField(GFFDataType.INT, 'PT_NPC_INFLUENCE')).setValue(infl | 0);
          influenceList.addChildStruct(inflStruct);
        }

        partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'FORFEITVIOL')).setValue(
          GameState.PartyManager.LastForfeitViolation | 0
        );
        partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'FORFEITCONDS')).setValue(
          GameState.PartyManager.ForfeitConditions | 0
        );
        partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_DISABLEMAP')).setValue(
          GameState.PartyManager.DisableMap ? 1 : 0
        );
        partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_DISABLEREGEN')).setValue(
          GameState.PartyManager.DisableHealthRegen ? 1 : 0
        );
      }

      /**
       * Pazaak Cards
       * PT_PAZAAKCARDS — struct index = card enum.
       * K1: 19 entries (0–17 INT + legacy unused BYTE at 18).
       * TSL: MAX_CARDS (23) INT entries for gold 18–22.
       */
      const pazaakCardsList = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_PAZAAKCARDS'));
      const pazaakSaveCount = GameState.GameKey == GameEngineType.TSL
        ? PazaakCards.MAX_CARDS
        : 19;
      for(let i = 0; i < pazaakSaveCount; i++){
        let cardStruct = new GFFStruct(0);
        const card = GameState.PazaakManager.Cards.get(i);
        const isLegacyPad = GameState.GameKey != GameEngineType.TSL && i === 18;
        cardStruct.addField(new GFFField( isLegacyPad ? GFFDataType.BYTE : GFFDataType.INT, 'PT_PAZAAKCOUNT'))
          .setValue(isLegacyPad ? 0 : (card?.count ?? 0));
        pazaakCardsList.addChildStruct(cardStruct);
      }

      /**
       * Pazaak Side Deck
       */
      const pazaakSideDeckList = partytable.RootNode.addField(new GFFField(GFFDataType.LIST, 'PT_PAZSIDELIST'));
      for(let i = 0; i < PazaakSideDeckSlots.MAX_SLOTS; i++){
        let sideDeckStruct = new GFFStruct(0);
        const sideDeckCard = GameState.PazaakManager.PlayerSideDeck.get(i);
        sideDeckStruct.addField(new GFFField(GFFDataType.INT, 'PT_PAZSIDECARD'))
          .setValue(sideDeckCard);
        pazaakSideDeckList.addChildStruct(sideDeckStruct);
      }

      partytable.RootNode.addField(new GFFField(GFFDataType.DWORD, 'PT_PLAYEDSECONDS')).setValue(GameState.time | 0);
      partytable.RootNode.addField(new GFFField(GFFDataType.BYTE, 'PT_SOLOMODE')).setValue(GameState.SOLOMODE ? 1 : 0);

      const tutorial2DA = GameState.TwoDAManager.datatables.get('tutorial');
      // Retail: K1 writes 6 bytes; TSL writes 0x21 (33) bytes from GUI tutorial bitarray
      const retailTutBytes = GameState.GameKey == GameEngineType.TSL ? 0x21 : 6;
      let byteCount = retailTutBytes;
      if(tutorial2DA){
        byteCount = Math.max(retailTutBytes, Math.ceil(tutorial2DA.RowCount / 8));
      }
      let buffer = new Uint8Array(byteCount);
      for(let i = 0; i < byteCount; i++){
        let byte = 0;
        for(let j = 0; j < 8; j++){
          let offset = (8 * i) + j;
          let bit = GameState.TutorialWindowTracker[offset];
          if(bit){
            byte |= 1 << j; // LSB packing (matches LoadTableInfo)
          }
        }
        buffer[i] = byte;
      }
      partytable.RootNode.addField(new GFFField(GFFDataType.VOID, 'PT_TUT_WND_SHOWN')).setData(buffer);

      partytable.RootNode.addField(new GFFField(GFFDataType.INT, 'PT_XP_POOL')).setValue(GameState.PartyManager.XPPool | 0);

      partytable.FileType = 'PT  ';
      partytable.export(path.join(directory, 'PARTYTABLE.res'), () => {
        resolve();
      }, () => {
        reject();
      });
    });
  }

  /**
   * Add gold to the party manager
   * @param amount - The amount of gold to add
   * @returns void
   */
  static AddGold(amount: number){
    if(!amount) return;
    this.Gold += amount;
    
    if(this.Gold < 0){
      this.Gold = 0;
    }

    GameState.UINotificationManager.EnableUINotificationIconType(amount > 0 ? UIIconTimerType.CREDITS_RECEIVED : UIIconTimerType.CREDITS_RECEIVED);
  }

  /**
   * Switch the leader of the party at the index
   * @param index - The index of the party member to switch the leader of
   * @returns void
   */
  static SwitchLeaderAtIndex(index: number = 0){
    index = Math.abs(index);

    if(index >= PartyManager.party.length){
      console.warn(`Index out of range: ${index}/${PartyManager.party.length}`);
      return;
    }

    if(index == 0){
      console.warn(`Party Member at index 0 is already the party leader.`);
      return PartyManager.party[0];
    }

    const pm = PartyManager.party.splice(index, 1)[0];
    PartyManager.party.unshift(pm);
    PartyManager.ProcessEventListener('change', [pm]);
    PartyManager.UpdateLeader();
    PartyManager.resetFollowPath(pm);
    return pm;
  }

  static async AddNPCById(npcId = 0){
    if(PartyManager.IsNPCInParty(npcId)){
      return;
    }

    const arrayLength = PartyManager.CurrentMembers.push({
      isLeader: false,
      memberID: npcId
    });
    PartyManager.RebuildPortraitOrder();

    await PartyManager.LoadPartyMember(arrayLength - 1);
  }

  /**
   * Remove the NPC by the ID.
   * Retail RemovePartyMember updates the active party list; CurrentMembers (PT_MEMBERS)
   * must stay in sync or GetPartyMemberCount vs IsNPCPartyMember diverge (k_ptar_duelring).
   * @param npcId - The ID of the NPC to remove
   * @param leaveInWorld - Whether to leave the NPC in the world
   * @returns whether a party creature was removed
   */
  static RemoveNPCById(npcId = 0, leaveInWorld = false): boolean {
    const partyMember = PartyManager.GetPartyMemberByNPCId(npcId);
    if(!partyMember){
      // Keep CurrentMembers aligned even if the live creature was already gone
      PartyManager.RemoveCurrentMemberByNPCId(npcId);
      return false;
    }

    const pmIndex = PartyManager.party.indexOf(partyMember);
    if(pmIndex == -1){
      PartyManager.RemoveCurrentMemberByNPCId(npcId);
      return false;
    }

    partyMember.isPM = false;
    PartyManager.party.splice(pmIndex, 1);
    PartyManager.RemoveCurrentMemberByNPCId(npcId);
    PartyManager.RebuildPortraitOrder();

    // Retail SetInParty(0) → AI level NORMAL when left in world
    if(leaveInWorld){
      GameState.ServerAIMaster?.setAILevel?.(partyMember, AILevel.NORMAL);
      if(partyMember.container){
        partyMember.container.removeFromParent();
      }
      GameState.group.creatures.add(partyMember.container);
      GameState.module.area.attachObject(partyMember);
    }else{
      partyMember.destroy();
    }

    return true;
  }

  /**
   * Remove a specific party creature (when scripts pass an OBJECT into RemovePartyMember).
   */
  static RemovePartyMemberCreature(creature: ModuleCreature, leaveInWorld = false): boolean {
    if(!BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature)){
      return false;
    }
    if(creature === PartyManager.Player){
      return false;
    }

    const npcId = creature.npcId;
    const pmIndex = PartyManager.party.indexOf(creature);
    if(pmIndex >= 0){
      creature.isPM = false;
      PartyManager.party.splice(pmIndex, 1);
      PartyManager.RebuildPortraitOrder();

      if(leaveInWorld){
        GameState.ServerAIMaster?.setAILevel?.(creature, AILevel.NORMAL);
        if(creature.container){
          creature.container.removeFromParent();
        }
        GameState.group.creatures.add(creature.container);
        GameState.module.area.attachObject(creature);
      }else{
        creature.destroy();
      }
    }

    if(typeof npcId === 'number' && npcId >= 0){
      PartyManager.RemoveCurrentMemberByNPCId(npcId);
      if(pmIndex < 0){
        // npcId known but reference wasn't in party — still try id-based party remove
        return PartyManager.RemoveNPCById(npcId, leaveInWorld);
      }
      return true;
    }

    return pmIndex >= 0;
  }

  static GetPartyMemberByNPCId(npcId = 0){
    for(let i = 0; i < PartyManager.party.length; i++){
      const pm = PartyManager.party[i];
      if(pm.npcId == npcId){
        return pm;
      }
    }
    return null;
  }

  static RemovePartyMemberByNPCId(npcId = 0){
    const pm = PartyManager.GetPartyMemberByNPCId(npcId);
    if(!pm){
      return;
    }
    PartyManager.party.splice(PartyManager.party.indexOf(pm), 1);
  }

  static GetCurrentMemberByNPCId(npcId = 0){
    for(let i = 0; i < PartyManager.CurrentMembers.length; i++){
      const mem = PartyManager.CurrentMembers[i];
      if(mem.memberID == npcId){
        return mem;
      }
    }
    return null;
  }

  static RemoveCurrentMemberByNPCId(npcId = 0){
    const mem = PartyManager.GetCurrentMemberByNPCId(npcId);
    if(!mem){
      return;
    }
    const cmIndex = PartyManager.CurrentMembers.indexOf(mem);
    if(cmIndex == -1){
      return;
    }
    PartyManager.CurrentMembers.splice(cmIndex, 1);
  }

  /**
   * Get the portrait by the index
   * @param nID - The index of the portrait to get
   * @returns string
   */
  static GetPortraitByIndex(nID = 0){

    let portraitId = 0;
    let goodEvil = 50;
    if(PartyManager.NPCS[nID].template instanceof GFFObject){
      const pm = PartyManager.NPCS[nID].template;
      if(pm.RootNode.hasField('PortraitId')){
        portraitId = pm.RootNode.getFieldByLabel('PortraitId').getValue();
        goodEvil = pm.RootNode.getFieldByLabel('GoodEvil').getValue();
      }
    }

    const portrait = GameState.SWRuleSet.portraits[portraitId];
    if(!portrait){
      return;
    }

    return portrait.getPortraitGoodEvil(goodEvil);
  }

  /**
   * Rebuild the portrait order
   * @returns void
   */
  static RebuildPortraitOrder(){
    PartyManager.PortraitOrder = [];
    for(let i = 0; i < PartyManager.party.length; i++){
      PartyManager.PortraitOrder[i] = PartyManager.party[i].getPortraitResRef().toLowerCase();
    }
  }

  /**
   * Get the portrait by the resref
   * @param resref - The resref of the portrait to get
   * @returns SWPortrait
   */
  static GetPortraitByResRef( resref = '' ): SWPortrait{
    const portrait2DA = GameState.SWRuleSet.portraits;
    if(!portrait2DA || !portrait2DA.length){
      return null;
    }
    for(let i = 0, len = portrait2DA.length; i < len; i++){
      if(portrait2DA[i].baseresref.toLowerCase() != resref.toLowerCase()){
        continue;
      }
      return portrait2DA[i];    
    }
    return null;
  }

  /**
   * Add the portrait to the order
   * @param resref - The resref of the portrait to add
   * @returns void
   */
  static AddPortraitToOrder( resref = '' ){
    if(PartyManager.PortraitOrder.indexOf(resref) == -1 )
      PartyManager.PortraitOrder.push( resref.toLowerCase() );
  }

  /**
   * Set the selectable state of the NPC
   * @param nID - The ID of the NPC to set the selectable state of
   * @param state - The state to set the selectable state to
   * @returns void
   */
  static SetSelectable(nID = 0, state = false){
    PartyManager.NPCS[nID].canSelect = state ? true : false;
  }

  /**
   * Check if the NPC is selectable
   * @param nID - The ID of the NPC to check if it is selectable
   * @returns boolean
   */
  static IsSelectable(nID = 0){
    return PartyManager.NPCS[nID]?.canSelect ? true : false;
  }

  /**
   * Retail CSWPartyTable::GetNPCSelectability — -1 if unavailable, else canSelect (0/1).
   */
  static GetNPCSelectability(nID = 0): number {
    if(nID < 0 || nID >= PartyManager.MaxPartyCount) return -1;
    if(!PartyManager.IsAvailable(nID)) return -1;
    return PartyManager.IsSelectable(nID) ? 1 : 0;
  }
  
  /**
   * Check if the NPC is available
   * @param nID - The ID of the NPC to check if it is available
   * @returns boolean
   */
  static IsAvailable(nID = 0){
    return PartyManager.NPCS[nID]?.available ? true : false;
  }

  /**
   * Check if the NPC is in the live party.
   * Must use PartyManager.party (same source as GetPartyMemberCount) — not CurrentMembers
   * alone, or scripts like k_ptar_duelring desync and loop forever.
   * @param npcId - The ID of the NPC to check if it is in the party
   * @returns boolean
   */
  static IsNPCInParty(npcId: number){
    for(let i = 0; i < PartyManager.party.length; i++){
      const pm = PartyManager.party[i];
      if(pm && pm.npcId == npcId){
        return true;
      }
    }
    return false;
  }

  /**
   * Set the PartyMember to unavailable.
   * Retail CSWPartyTable::RemoveNPC @ 00700490 — clears available only.
   * @param npcId - The ID of the NPC to set to unavailable
   * @returns void
   */
  static RemoveAvailableNPC(npcId = 0){
    if(!PartyManager.NPCS[npcId]) return;
    PartyManager.NPCS[npcId].available = false;
    PartyManager.NPCS[npcId].canSelect = false;
  }


  /**
   * Add a creature template to the list of available PartyMembers
   * @param npcId - The ID of the NPC to add to the list of available PartyMembers
   * @param template - The template to add to the list of available PartyMembers
   * @returns boolean
   */
  static AddAvailableNPCByTemplate(npcId = 0, template: string|GFFObject = ''): boolean {
    if(typeof template === 'string'){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utc'], template);
      if(buffer){
        PartyManager.NPCS[npcId].available = true;
        PartyManager.NPCS[npcId].canSelect = true;
        PartyManager.NPCS[npcId].template = new GFFObject(buffer);
        return true;
      }else{
        console.error('Failed to load character template');
      }
    }else if(template instanceof GFFObject){
      //We already have the template (From SAVEGAME)
      PartyManager.NPCS[npcId].available = true;
      PartyManager.NPCS[npcId].canSelect = true;
      PartyManager.NPCS[npcId].template = template;
      return true;
    }else{
      console.error('Failed to load character template');
    }
    return false;
  }

  static AddAvailableNPCByObject(npcId = 0, object: ModuleCreature): boolean {
    if(!BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)){
      return false;
    }
    PartyManager.NPCS[npcId].available = true;
    PartyManager.NPCS[npcId].canSelect = true;
    PartyManager.NPCS[npcId].template = object.save();
    return true;
  }

  /**
   * TSL AddAvailablePUPByTemplate (CSWPartyTable::AddPUP by resref @ 007002b0).
   * Marks slot available and stores UTC; does not spawn.
   */
  static AddAvailablePUPByTemplate(pupId = 0, template: string = ''): boolean {
    if(GameState.GameKey != GameEngineType.TSL) return false;
    if(pupId < 0 || pupId >= PartyManager.MaxPuppetCount) return false;
    if(PartyManager.Puppets[pupId]?.available) return false;
    const resref = (template || '').trim();
    if(!resref) return false;
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utc'], resref);
    if(!buffer){
      console.error('Failed to load puppet template', resref);
      return false;
    }
    const pup = PartyManager.Puppets[pupId] || { available: false, select: true };
    pup.available = true;
    pup.select = true;
    pup.template = new GFFObject(buffer);
    PartyManager.Puppets[pupId] = pup;
    void PartyManager.ExportPuppetTemplate(pupId, pup.template);
    return true;
  }

  /**
   * TSL AddAvailablePUPByObject (CSWPartyTable::AddPUP @ 006fff20).
   * Saves creature to AVAILPUP{n}.utc; does not spawn.
   */
  static AddAvailablePUPByObject(pupId = 0, object: ModuleCreature): boolean {
    if(GameState.GameKey != GameEngineType.TSL) return false;
    if(pupId < 0 || pupId >= PartyManager.MaxPuppetCount) return false;
    if(PartyManager.Puppets[pupId]?.available) return false;
    if(!BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)) return false;
    const pup = PartyManager.Puppets[pupId] || { available: false, select: true };
    pup.available = true;
    pup.select = true;
    pup.template = object.save();
    PartyManager.Puppets[pupId] = pup;
    void PartyManager.ExportPuppetTemplate(pupId, pup.template);
    return true;
  }

  /**
   * TSL AssignPUP @ 00700400 — set owner NPC's assignedPuppetId (creature+0x11f8).
   * Both PUP and NPC must be available; NPC must already exist in-game.
   */
  static AssignPUP(pupId = 0, npcId = 0): boolean {
    if(GameState.GameKey != GameEngineType.TSL) return false;
    if(pupId < 0 || pupId >= PartyManager.MaxPuppetCount) return false;
    if(npcId < 0 || npcId >= PartyManager.MaxPartyCount) return false;
    if(!PartyManager.NPCS[npcId]?.available) return false;
    if(!PartyManager.Puppets[pupId]?.available) return false;
    const owner =
      PartyManager.GetPartyMemberByNPCId(npcId) ||
      PartyManager.NPCS[npcId]?.moduleObject;
    if(!BitWise.InstanceOfObject(owner, ModuleObjectType.ModuleCreature)) return false;
    owner.assignedPuppetId = pupId;
    return true;
  }

  /**
   * TSL SpawnAvailablePUP / SpawnPUP @ 007031c0 — load from AVAILPUP if needed, place at location.
   * Does not add to the party puppet list (call AddPartyPuppet for that).
   */
  static SpawnAvailablePUP(pupId = 0, location?: EngineLocation): ModuleCreature | undefined {
    if(GameState.GameKey != GameEngineType.TSL) return undefined;
    if(pupId < 0 || pupId >= PartyManager.MaxPuppetCount) return undefined;
    const pup = PartyManager.Puppets[pupId];
    if(!pup?.available) return undefined;

    let partyMember = pup.moduleObject;
    if(!BitWise.InstanceOfObject(partyMember, ModuleObjectType.ModuleCreature)){
      if(!(pup.template instanceof GFFObject)) return undefined;
      partyMember = new ModuleCreature(pup.template);
      pup.moduleObject = partyMember;
    }

    partyMember.clearAllActions();

    const area = location?.area || GameState.module?.area;
    if(!area) return partyMember;

    area.attachObject(partyMember);
    partyMember.load();
    const pos = location?.position?.clone?.() || location?.position || partyMember.position;
    const facing = location?.getFacing?.() ?? partyMember.getFacing?.() ?? 0;
    partyMember.loadModel().then( (model: OdysseyModel3D) => {
      partyMember.model.userData.moduleObject = partyMember;
      if(pos) partyMember.setPosition(pos);
      partyMember.setFacing(facing, true);
      partyMember.box = new THREE.Box3().setFromObject(partyMember.container);
      model.hasCollision = true;
      GameState.group.creatures.add( partyMember.container );
      partyMember.getCurrentRoom();
      partyMember.onSpawn();
    });
    return partyMember;
  }

  /**
   * TSL GetPUPID @ 007035f0 — puppet slot index for a spawned puppet object, or -1.
   */
  static GetPUPID(object: ModuleCreature): number {
    if(!BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)) return -1;
    for(let i = 0; i < PartyManager.MaxPuppetCount; i++){
      if(PartyManager.Puppets[i]?.moduleObject === object) return i;
    }
    return -1;
  }

  /**
   * TSL GetPUPOwner @ 00704c70 — party member / player whose assignedPuppetId matches.
   */
  static GetPUPOwner(object: ModuleCreature): ModuleCreature | undefined {
    if(GameState.GameKey != GameEngineType.TSL) return undefined;
    const pupId = PartyManager.GetPUPID(object);
    if(pupId < 0) return undefined;
    for(let i = 0; i < PartyManager.party.length; i++){
      const member = PartyManager.party[i];
      if(member?.assignedPuppetId === pupId) return member;
    }
    const player = PartyManager.Player;
    if(BitWise.InstanceOfObject(player, ModuleObjectType.ModuleCreature) && player.assignedPuppetId === pupId){
      return player;
    }
    return undefined;
  }

  /**
   * TSL SaveMemberByObject / SaveNPCByObject @ 006fdca0 — write creature to AVAILNPC{n}.utc.
   */
  static SaveNPCByObject(npcId = 0, object: ModuleCreature): void {
    if(npcId < 0 || npcId >= PartyManager.MaxPartyCount) return;
    if(!BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)) return;
    object.clearAllActions();
    const npc = PartyManager.NPCS[npcId] || {
      available: false,
      canSelect: false,
      spawned: false,
    };
    npc.template = object.save();
    npc.moduleObject = object;
    PartyManager.NPCS[npcId] = npc;
    void PartyManager.ExportPartyMemberTemplate(npcId, npc.template);
  }

  /**
   * TSL RebuildPartyTable @ ExecuteCommandRebuildPartyTable 007b1a30 —
   * rebind NPC/PUP object caches by companion tag when the NPC/PUP is available.
   */
  static RebuildPartyTable(): void {
    if(GameState.GameKey != GameEngineType.TSL) return;
    const tags = [
      'atton', 'baodur', 'mand', 'g0t0', 'handmaiden', 'hk47',
      'kreia', 'mira', 't3m4', 'visasmarr', 'hanharr', 'disciple',
    ];
    for(let i = 0; i < tags.length; i++){
      if(!PartyManager.NPCS[i]?.available) continue;
      const obj = GameState.ModuleObjectManager.GetObjectByTag(tags[i], 0);
      if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)){
        PartyManager.NPCS[i].moduleObject = obj as ModuleCreature;
        (obj as ModuleCreature).npcId = i;
      }
    }
    if(PartyManager.Puppets[0]?.available){
      const remote = GameState.ModuleObjectManager.GetObjectByTag('remote', 0);
      if(BitWise.InstanceOfObject(remote, ModuleObjectType.ModuleCreature)){
        PartyManager.Puppets[0].moduleObject = remote as ModuleCreature;
      }
    }
  }

  /**
   * TSL SavePuppetByObject @ 006fe0e0 — write creature to GAMEINPROGRESS:AVAILPUP{n}.utc.
   */
  static SavePUPByObject(pupId = 0, object: ModuleCreature): void {
    if(GameState.GameKey != GameEngineType.TSL) return;
    if(pupId < 0 || pupId >= PartyManager.MaxPuppetCount) return;
    if(!BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)) return;
    object.clearAllActions();
    const pup = PartyManager.Puppets[pupId] || { available: false, select: true };
    pup.template = object.save();
    pup.moduleObject = object;
    PartyManager.Puppets[pupId] = pup;
    void PartyManager.ExportPuppetTemplate(pupId, pup.template);
  }

  /**
   * TSL AddPartyPuppet / AddPuppet @ 006feb00 — add available puppet to active party list + SetIsPuppet.
   */
  static AddPartyPuppet(pupId = 0, object?: ModuleCreature): boolean {
    if(GameState.GameKey != GameEngineType.TSL) return false;
    if(pupId < 0 || pupId >= PartyManager.MaxPuppetCount) return false;
    const pup = PartyManager.Puppets[pupId];
    if(!pup?.available) return false;
    if(PartyManager.CurrentPuppets.some((p) => p.puppetID === pupId)){
      return true;
    }
    if(PartyManager.CurrentPuppets.length >= PartyManager.MaxPuppetCount) return false;
    // Retail: reject if another slot already caches this object id
    if(object && BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)){
      for(let i = 0; i < PartyManager.MaxPuppetCount; i++){
        if(i !== pupId && PartyManager.Puppets[i]?.moduleObject === object) return false;
      }
      pup.moduleObject = object;
      object.isPuppet = true;
    }else if(pup.moduleObject){
      pup.moduleObject.isPuppet = true;
    }
    PartyManager.CurrentPuppets.push({ puppetID: pupId });
    PartyManager.PuppetCount = PartyManager.CurrentPuppets.length;
    return true;
  }

  /**
   * TSL GetIsPuppet — reads creature isPuppet (SetIsPuppet / +0x11fc), not mere spawn cache.
   */
  static GetIsPartyPuppet(object: ModuleCreature): boolean {
    if(!BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)) return false;
    return !!object.isPuppet;
  }

  /**
   * Add a world creature to the list of Party Members and remove it from the creatures array
   * @param slot - The slot to add the creature to
   * @param creature - The creature to add to the list of Party Members
   * @returns void
   */
  static AddCreatureToParty(slot = 1, creature: ModuleCreature){
    if(!BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature)){
      return;
    }

    creature = creature as ModuleCreature;
    creature.isPM = true;
    creature.npcId = slot;
    creature.clearAllActions();
    PartyManager.NPCS[slot].available = true;
    //PartyManager.NPCS[nID].canSelect = true;
    PartyManager.NPCS[slot].template = creature.template;
    PartyManager.NPCS[slot].moduleObject = creature;
    //Add the creature to the party array
    if(PartyManager.party.indexOf(creature) == -1){
      PartyManager.party.push(creature);
    }
    // Keep PT_MEMBERS / CurrentMembers in sync with live party
    if(!PartyManager.GetCurrentMemberByNPCId(slot)){
      PartyManager.CurrentMembers.push({
        isLeader: false,
        memberID: slot,
      });
    }
    // Retail SetInParty → AI level VERY_HIGH
    GameState.ServerAIMaster?.setAILevel?.(creature, AILevel.VERY_HIGH);
    //Check to see if the creature needs to be removed from the creatures array
    let cIdx = GameState.module.area.creatures.indexOf(creature);
    if(cIdx > -1){
      GameState.module.area.creatures.splice(cIdx, 1);
    }
  }

  /**
   * Switch the player character
   * @param npcId - The ID of the NPC to switch the player character to
   * @returns ModuleCreature
   */
  static SwitchPlayerCharacter(npcId = 0){
    let partyMember: ModuleCreature;
    if(npcId == -1){
      partyMember = new ModulePlayer(PartyManager.ActualPlayerTemplate);
      PartyManager.PlayerTemplate = PartyManager.ActualPlayerTemplate;
    }else{
      partyMember = new ModuleCreature(PartyManager.NPCS[npcId].template);
    }
     
    const oldPC = PartyManager.Player;
    const oldNpcId = typeof oldPC?.npcId === 'number' ? oldPC.npcId : -1;
    // While a conversation is active, schedule restore of the prior controlled
    // character at dialog end (CancelPostDialogCharacterSwitch clears it).
    if(GameState.CutsceneManager?.active){
      GameState.CutsceneManager.schedulePostDialogCharacterSwitch(oldNpcId);
    }
    PartyManager.Player = partyMember;

    if(PartyManager.Player.isPlayer && npcId >= 0){
      PartyManager.ActualPlayerTemplate = PartyManager.Player.save();
      CurrentGame.WriteFile('pc.utc', PartyManager.ActualPlayerTemplate.getExportBuffer());
    }

    try{
      const spawn = oldPC.position.clone();
      const quaternion = oldPC.quaternion.clone();

      partyMember.isPM = true;
      partyMember.isPC = 1;
      partyMember.npcId = npcId;
      partyMember.load();
      partyMember.clearAllActions();
      partyMember.position.copy(spawn);
      partyMember.quaternion.copy(quaternion);
      partyMember.loadScripts();
      partyMember.loadModel().then( (model: OdysseyModel3D) => {
        PartyManager.party[0] = partyMember;
        
        model.userData.moduleObject = partyMember;
        partyMember.position.copy(spawn);
        partyMember.quaternion.copy(quaternion);
        model.hasCollision = true;
        
        GameState.group.party.add( partyMember.container );
        oldPC.destroy();
        partyMember.onSpawn();
        PartyManager.resetFollowPath(partyMember);
      });
      return partyMember;
    }catch(e){
      console.error(e);
      return undefined;
    }
  }

  /**
   * Save the current party member templates.
   * Retail GetNPCObject requires availability — unavailable CNPCs (e.g. prologue
   * 3CFD after RemoveAvailableNPC(NPC_MIRA)) must not remain in PT_MEMBERS /
   * CurrentMembers or they will respawn on the next module load.
   * @returns void
   */
  static Save(){
    const npcs = PartyManager.party.filter(
      (pm) => pm.npcId >= 0 && PartyManager.IsAvailable(pm.npcId)
    );
    PartyManager.CurrentMembers = npcs.map((pm, i) => ({
      isLeader: i == 0,
      memberID: pm.npcId
    }));
    for(let i = 0; i < npcs.length; i++){
      PartyManager.SavePartyMember(npcs[i].npcId);
    }
  }

  /**
   * Apply retail PT_CONTROLLED_NPC after party spawn (-1 = PC at index 0).
   */
  static ApplyControlledNPC(){
    const idx = PartyManager.ControlledNPC;
    if(typeof idx !== 'number' || idx < 0){
      return;
    }
    if(idx > 0 && idx < PartyManager.party.length){
      PartyManager.SwitchLeaderAtIndex(idx);
    }
  }

  /**
   * Shift the current leader to the end of the party array
   * @returns void
   */
  static ShiftLeader(){
    PartyManager.party.push( PartyManager.party.shift() );
    PartyManager.UpdateLeader();
    PartyManager.resetFollowPath(PartyManager.party[0]);
  }

  /**
   * Update the party members to see if any of them is the current party leader
   * @returns void
   */
  static UpdateLeader(){
    for(let i = 0; i < PartyManager.CurrentMembers.length; i++){
      const isLeader = (PartyManager.party[0].npcId == PartyManager.CurrentMembers[i].memberID);
      PartyManager.CurrentMembers[i].isLeader = isLeader;
    }

    PartyManager.RebuildPortraitOrder();
  }

  /**
   * Check to see if the current leader is a party member and not the player
   * @returns boolean
   */
  static IsPartyMemberLeader(){
    return (PartyManager.party[0].npcId >= 0);
  }

  /**
   * Check to see if the player character is the leader of the party
   * @returns boolean
   */
  static IsPlayerPartyLeader(){
    return !PartyManager.IsPartyMemberLeader();
  }

  /**
   * Get the party member by the NPC ID
   * @param npcId - The NPC ID
   * @returns PartyMember
   */
  static GetPMByNPCId(npcId: number = -1){
    return PartyManager.party.find( (obj) => obj.npcId == npcId);
  }

  /**
   * Make the player character the leader of the party
   * @param swapWorldPositions - Whether to swap the world positions of the player and the party leader
   * @returns void
   */
  static MakePlayerLeader(swapWorldPositions: boolean = true){
    const idx = PartyManager.party.indexOf(PartyManager.Player);
    if(idx <= 0){ return; }

    const old_pm = PartyManager.party[0];
    const old_pm_pos = PartyManager.party[0].position.clone();
    const old_player_pos = PartyManager.Player.position.clone();
    PartyManager.SwitchLeaderAtIndex(idx);
    if(swapWorldPositions){
      PartyManager.Player.setPosition(old_pm_pos);
      old_pm.setPosition(old_player_pos);
    }
  }

  /**
   * True if orderResRef is this creature's current portrait or any Good/Evil
   * variant of the same portraits.2da row (NFO PORTRAIT* can lag live GoodEvil).
   */
  static portraitResRefMatches(creature: ModuleCreature, orderResRef: string = ''): boolean {
    if(!creature || !orderResRef){ return false; }
    const order = orderResRef.toLowerCase();
    const current = creature.getPortraitResRef()?.toLowerCase();
    if(current && current == order){ return true; }
    const portrait = creature.portrait;
    if(!portrait){ return false; }
    const variants = [
      portrait.baseresref,
      portrait.baseresrefe,
      portrait.baseresrefve,
      portrait.baseresrefvve,
      portrait.baseresrefvvve,
    ];
    for(let i = 0; i < variants.length; i++){
      if(variants[i] && variants[i].toLowerCase() == order){
        return true;
      }
    }
    return false;
  }

  /**
   * Get the index of the creature in the party array by the order of it's portrait resref in the PortraitOrder array
   * @param creature - The creature to get the index of
   * @returns number
   */
  static GetCreatureStartingPartyIndex(creature: ModuleCreature){
    if(!creature){
      return PartyManager.party.length;
    }
    for(let i = 0; i < 3; i++){
      if(PartyManager.portraitResRefMatches(creature, PartyManager.PortraitOrder[i])){
        return i;
      }
    }
    return PartyManager.party.length;
  }

  /**
   * Load the PartyMember by it's index in the CurrentMembers array.
   * Retail CSWPartyTable::GetNPCObject @ 00700660 — unavailable → OBJECT_INVALID
   * (SpawnNPC no-ops). Prologue skip uses RemoveAvailableNPC(7) for 3CFD.
   * @param nIdx - The index of the party member to load
   * @returns void
   */
  static async LoadPartyMember(nIdx: number = 0){
    const member = PartyManager.CurrentMembers[nIdx];
    if(!member){
      return;
    }
    const memberID = member.memberID;
    if(!PartyManager.IsAvailable(memberID)){
      return;
    }

    const npc = PartyManager.NPCS[memberID];
    const template = npc?.template;
    if(!template){
      return;
    }
    // Prefer saved ObjectId so CombatRound Target/MasterID refs still resolve after load.
    const savedId = template.RootNode.hasField('ObjectId')
      ? template.getFieldByLabel('ObjectId').getValue()
      : 0;
    if(!savedId || savedId === ModuleObjectConstant.OBJECT_INVALID){
      template.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(
        GameState.ModuleObjectManager.GetNextPlayerId()
      );
    }
    const partyMember = new ModuleCreature(template);

    if(nIdx < 0 || nIdx > 1){
      console.log('LoadPartyMember', 'Wrong index', nIdx, npc, partyMember);
      return;
    }

    let currentSlot: ModuleCreature;

    try{
      if(!(currentSlot instanceof ModuleCreature)){
        partyMember.isPM = true;
        partyMember.npcId = memberID;
        partyMember.load();
        // Do not clearAllActions after load — that wipes restored ActionList /
        // CombatRound SchedActionList / combat targets (mid-combat save resume).
        //PartyManager.party[nIdx+1] = partyMember;

        /*if(PartyManager.CurrentMembers[nIdx].isLeader){
          PartyManager.party.unshift(PartyManager.party.splice(nIdx+1, 1)[0]);
        }*/
        PartyManager.AddPortraitToOrder( partyMember.getPortraitResRef() );
        PartyManager.party[ PartyManager.GetCreatureStartingPartyIndex(partyMember) ] = partyMember;
        let spawn = PartyManager.GetSpawnLocation(partyMember);
        // Retail PositionParty: companions share the leader/waypoint orientation (Yaw @ 004aa0f0).
        const spawnFacing = -Math.atan2(spawn.rotation.x, spawn.rotation.y);
        partyMember.position.copy(spawn.position);
        partyMember.setFacing(spawnFacing, true);
        
        const model = await partyMember.loadModel();
        model.userData.moduleObject = partyMember;

        partyMember.position.copy(spawn.position);
        partyMember.setFacing(spawnFacing, true);
  
        model.hasCollision = true;
        GameState.group.party.add( partyMember.container );

        partyMember.getCurrentRoom();
        partyMember.onSpawn();
      }else{
        const spawn = PartyManager.GetSpawnLocation(currentSlot);
        const spawnFacing = -Math.atan2(spawn.rotation.x, spawn.rotation.y);
        currentSlot.position.copy(spawn.position);
        currentSlot.setFacing(spawnFacing, true);
        if(!currentSlot.room){
          currentSlot.getCurrentRoom();
        }
      }
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Used in the TSL PartySelection menu to load creature for the 3D preview of the selected party member
   * @param npcId - The NPC ID
   * @param onLoad - The function to call when the party member is loaded
   * @returns void
   */
  static LoadPartyMemberCreature(npcId = 0, onLoad?: Function){
    const npc = PartyManager.NPCS[npcId];
    if(!npc){
      if(typeof onLoad === 'function')
        onLoad(null);

      return;
    }

    if(!npc.template){
      if(typeof onLoad === 'function')
        onLoad(null);

      return;
    }
    
    const partyMember = new ModuleCreature(npc.template);
    partyMember.npcId = npcId;
    partyMember.isPM = true;
    partyMember.load();
    if(!partyMember.partyFollowInfo){
      partyMember.partyFollowInfo = createDefaultPartyFollowInfo();
    }
    partyMember.clearAllActions();
    partyMember.loadModel().then( (model: OdysseyModel3D) => {
      model.userData.moduleObject = partyMember;
      partyMember.onSpawn();
      if(typeof onLoad === 'function')
        onLoad(partyMember);

    });
    
  }

  /**
   * Retail CSWParty formation local offsets (CSWParty ctor @ 00636170 → field16_0x1c8).
   * Each pattern stores companion slot1 then slot2 (+X right, +Y forward).
   * Leader is always (0,0). SetFormation @ 00634760 selects pattern 0–2.
   */
  static readonly FORMATION_PATTERN_COMPANIONS: ReadonlyArray<
    ReadonlyArray<Readonly<{ x: number; y: number }>>
  > = [
    // Pattern 0
    [ { x: 1.5, y: -0.7 }, { x: -1.5, y: 0.8 } ],
    // Pattern 1 (ctor zeros for slots — companions stack on leader locally)
    [ { x: 0.0, y: 0.0 }, { x: 0.0, y: 0.0 } ],
    // Pattern 2
    [ { x: -2.0, y: 1.5 }, { x: 2.0, y: 4.5 } ],
  ];

  /**
   * Active party follow formation (retail CSWParty.formation). Default 0 after ctor SetFormation(0).
   * −9999 cycles to next unlocked pattern.
   */
  static formation: number = 0;
  /** Retail field12_0x1c4 — when set, SetFormation swaps slot1/slot2 offsets. */
  static formationInvert: boolean = false;

  /**
   * Leader + companion offsets for the active formation pattern.
   * Index 0 = leader (0,0); 1/2 = companions from FORMATION_PATTERN_COMPANIONS.
   */
  static getFormationOffsets(): ReadonlyArray<Readonly<{ x: number; y: number }>> {
    const pattern = PartyManager.formation;
    const idx = (pattern >= 0 && pattern < 3) ? pattern : 0;
    let c0 = PartyManager.FORMATION_PATTERN_COMPANIONS[idx][0];
    let c1 = PartyManager.FORMATION_PATTERN_COMPANIONS[idx][1];
    if(PartyManager.formationInvert){
      const tmp = c0;
      c0 = c1;
      c1 = tmp;
    }
    return [ { x: 0, y: 0 }, c0, c1 ];
  }

  /** @deprecated Prefer getFormationOffsets(); kept for callers expecting formation-0 shape. */
  static get FORMATION_OFFSETS(): ReadonlyArray<Readonly<{ x: number; y: number }>> {
    return PartyManager.getFormationOffsets();
  }

  /**
   * Retail CSWParty::SetFormation @ 00634760.
   * @param pattern 0–2, or −9999 to cycle
   */
  static setFormation(pattern: number): void {
    if(pattern === -9999){
      let next = PartyManager.formation + 1;
      if(next >= 3) next = 0;
      PartyManager.setFormation(next);
      return;
    }
    if(pattern < 0 || pattern >= 3){
      return;
    }
    if(pattern === PartyManager.formation){
      return;
    }
    PartyManager.formation = pattern;
  }

  /**
   * Retail CSWParty::InvertFormation — toggle companion offset swap.
   */
  static invertFormation(on?: boolean): void {
    if(typeof on === 'boolean'){
      PartyManager.formationInvert = on;
    }else{
      PartyManager.formationInvert = !PartyManager.formationInvert;
    }
  }

  /** Scratch vectors for GetSpawnLocation / PositionParty safe snap. */
  static #spawnPos = new THREE.Vector3();
  static #spawnSafe = new THREE.Vector3();

  /**
   * Get the spawn location of the creature when entering a module.
   * Retail: MovePlayerToArea (waypoint/entry + ComputeSafeLocation r=20) then
   * PositionParty (formation offsets + ComputeSafeLocation r=10).
   * @param creature - The creature to get the spawn location of
   * @returns EngineLocation
   */
  static GetSpawnLocation( creature: ModuleCreature ){
    if( !BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature) ){
      return GameState.module.area.getSpawnLocation();
    }

    if( GameState.isLoadingSave ){
      return new EngineLocation(
        creature.position.x,
        creature.position.y,
        creature.position.z,
        creature.getXOrientation(),
        creature.getYOrientation(),
        creature.getZOrientation()
      );
    }

    const spawnLoc = GameState.module.area.getSpawnLocation();
    const ox = spawnLoc.rotation.x;
    const oy = spawnLoc.rotation.y;
    // Retail Yaw @ 004aa0f0: atan2(-x, y) in degrees → radians here.
    const yaw = -Math.atan2(ox, oy);

    let index = PartyManager.party.indexOf(creature);
    if(index < 0){
      index = PartyManager.PortraitOrder.indexOf(creature.getPortraitResRef().toLowerCase());
    }
    if(index < 0) index = 0;
    if(index > 2) index = 2;

    const offset = PartyManager.getFormationOffsets()[index];
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    // Rotate local formation offset around Z (Quaternion * Vector @ 004a9bb0).
    PartyManager.#spawnPos.set(
      spawnLoc.position.x + (offset.x * cos - offset.y * sin),
      spawnLoc.position.y + (offset.x * sin + offset.y * cos),
      spawnLoc.position.z
    );

    // MovePlayerToArea uses r=20 for the PC; PositionParty uses r=10 for NPCs.
    const radius = index === 0 ? 20 : 10;
    const area = GameState.module?.area;
    if(computeSafeLocation(area, PartyManager.#spawnPos, PartyManager.#spawnSafe, {
      radius,
      owner: creature,
    })){
      PartyManager.#spawnPos.copy(PartyManager.#spawnSafe);
    }

    return new EngineLocation(
      PartyManager.#spawnPos.x,
      PartyManager.#spawnPos.y,
      PartyManager.#spawnPos.z,
      ox,
      oy,
      0
    );
  }

  static #tmpFollowPositionTarget = new THREE.Vector3();
  static #tmpFollowPosition = new THREE.Vector3();
  /**
   * Record leader trail for party follow (retail ProcessPoint).
   * Call when the controlled party leader moves.
   */
  static processLeaderFollowPoint(leader: ModuleCreature){
    if(!leader || PartyManager.party[0] !== leader) return;
    if(GameState.SOLOMODE) return;
    partyFollowPath.processPoint(leader, leader.area);
  }

  /**
   * Reset follow ring (area transition / party rearrange).
   */
  static resetFollowPath(leader?: ModuleCreature){
    if(leader){
      partyFollowPath.reset(leader.position, leader.rotation?.z ?? 0);
    }else{
      partyFollowPath.reset();
    }
  }

  /**
   * Get the follow position of the creature
   * @param creature - The creature to get the follow position of
   * @returns THREE.Vector3
   */
  static GetFollowPosition(creature: ModuleCreature){
    return this.GetFollowPositionAtIndex(PartyManager.party.indexOf(creature));
  }

  /**
   * Get the follow position of the creature at the index.
   * Prefers formation-lateral approach goal on a warm ring (count > 4);
   * Recalc/Teleport still use center trail. Cold ring returns the companion's
   * current position so WaitingForPath does not chase a live ±1.5m lateral.
   */
  static GetFollowPositionAtIndex(idx: number = 1){
    const leader = PartyManager.party[0];
    const creature = PartyManager.party[idx];

    if(!creature)
      return new THREE.Vector3();

    const area = creature.area ?? GameState.module?.area;
    const snapWalkable = (point: THREE.Vector3) => {
      if(!area || typeof area.isPointWalkable !== 'function'){
        return point;
      }
      return area.isPointWalkable(point)
        ? point
        : (typeof area.getNearestWalkablePoint === 'function'
          ? area.getNearestWalkablePoint(point, getPathPersonalSpace(creature))
          : point);
    };

    // Retail WaitingForPath holds until count > 4 — keep cold goals at feet
    if(partyFollowPath.count <= 4){
      return this.#tmpFollowPosition.copy(creature.position);
    }

    if(idx >= 1 && idx <= 2 && partyFollowPath.getApproachGoal(idx, this.#tmpFollowPosition)){
      return snapWalkable(this.#tmpFollowPosition);
    }

    if(idx >= 1 && idx <= 2 && partyFollowPath.getFollowGoal(idx, this.#tmpFollowPosition)){
      return snapWalkable(this.#tmpFollowPosition);
    }

    if(!leader){
      return this.#tmpFollowPosition.copy(creature.position);
    }

    // Warm-ring fallback only (should be rare): live formation lateral
    const offsets = PartyManager.getFormationOffsets();
    const targetOffset = (idx == 2) ? (offsets[2]?.x ?? -1.5) : (offsets[1]?.x ?? 1.5);
    const lateral = Math.abs(targetOffset) > 1e-4 ? targetOffset : (idx == 2 ? -1.5 : 1.5);

    this.#tmpFollowPositionTarget.set(
      lateral * Math.cos(leader.rotation.z),
      lateral * Math.sin(leader.rotation.z),
      0
    );
    this.#tmpFollowPosition.copy(leader.position).sub(this.#tmpFollowPositionTarget);

    return snapWalkable(this.#tmpFollowPosition);
  }

  /**
   * Retail TeleportForward — advance along the follow ring to a safe offset.
   */
  static teleportFollowForward(creature: ModuleCreature, out: THREE.Vector3): boolean {
    const idx = PartyManager.party.indexOf(creature);
    if(idx < 1) return false;
    return partyFollowPath.teleportForward(idx, creature.area, out);
  }

  /**
   * Give XP to the party (retail CSWPartyTable::DistributeExperience @ 005653a0).
   * Adds to PT_XP_POOL and awards the full amount to each active party member + player.
   */
  static GiveXP(nXP = 0){
    const amount = nXP | 0;
    if(amount <= 0){ return; }

    PartyManager.XPPool = (PartyManager.XPPool | 0) + amount;

    const awarded = new Set<ModuleCreature>();
    for(let i = 0; i < PartyManager.party.length; i++){
      const member = PartyManager.party[i];
      if(!member || awarded.has(member)) continue;
      awarded.add(member);
      if(typeof member.addXP === 'function'){
        member.addXP(amount);
      }else if(typeof member.experience === 'number'){
        member.experience += amount;
      }
    }
    if(PartyManager.Player && !awarded.has(PartyManager.Player as ModuleCreature)){
      if(typeof PartyManager.Player.addXP === 'function'){
        PartyManager.Player.addXP(amount);
      }else{
        PartyManager.Player.experience += amount;
      }
    }

    GameState.UINotificationManager.EnableUINotificationIconType(UIIconTimerType.PLOT_XP_RECEIVED);
  }

  /**
   * Export the party member template
   * @param index - The index of the party member to export
   * @param template - The template to export
   * @returns void
   */
  static async ExportPartyMemberTemplate( index = 0, template: GFFObject ){
    if(!(template instanceof GFFObject)){ return; }
    template.removeFieldByLabel('TemplateResRef');
    await template.export( path.join( CurrentGame.gameinprogress_dir, 'AVAILNPC'+index+'.utc'));
  }

  /**
   * TSL GetPupFilename — export AVAILPUP{n}.utc into GAMEINPROGRESS.
   */
  static async ExportPuppetTemplate( index = 0, template: GFFObject ){
    if(!(template instanceof GFFObject)){ return; }
    template.removeFieldByLabel('TemplateResRef');
    await template.export( path.join( CurrentGame.gameinprogress_dir, 'AVAILPUP'+index+'.utc'));
  }

  /**
   * Export the party member templates
   * @returns void
   */
  static async ExportPartyMemberTemplates(){
    return new Promise<void>( async (resolve, reject) => {
      let maxPartyMembers = (GameState.GameKey == GameEngineType.KOTOR) ? 9 : 12;
      for(let i = 0; i < maxPartyMembers; i++){
        let pm = PartyManager.NPCS[i];
        if(!pm){
          console.warn(`ExportPartyMemberTemplates: Failed to export template for NPC at index [${i}]. pm was undefined.`);
          continue;
        }

        if(!(pm.template instanceof GFFObject)){
          console.warn(`ExportPartyMemberTemplates: Failed to export template for NPC at index [${i}]. template was not an instance of GFFObject`);
          continue;
        }

        await PartyManager.ExportPartyMemberTemplate(i, pm.template);
      }
      if(GameState.GameKey == GameEngineType.TSL){
        for(let i = 0; i < PartyManager.MaxPuppetCount; i++){
          const pup = PartyManager.Puppets[i];
          if(pup?.template instanceof GFFObject){
            await PartyManager.ExportPuppetTemplate(i, pup.template);
          }
        }
      }
      await PartyManager.ExportPlayerCharacter();
      resolve();
    });
  }

  /**
   * Export the player character
   * @returns void
   */
  static async ExportPlayerCharacter(){
    // Retail GAMEINPROGRESS:PC only while controlling an NPC (pt_controlled_npc != -1)
    const player = GameState.PartyManager.Player;
    if(!(player?.npcId >= 0)){ return; }
    if(!GameState.PartyManager.ActualPlayerTemplate){ return; }
    const gff = GameState.PartyManager.ActualPlayerTemplate;
    await gff.export( path.join( CurrentGame.gameinprogress_dir, 'pc.utc'));
  }

  /**
   * Save the party member
   * @param npcId - The NPC ID
   * @returns void
   */
  public static async SavePartyMember(npcId: number = 0){
    const pm = PartyManager.party.find( (pm) => pm.npcId == npcId );
    if(pm) pm.save();
    const npc = PartyManager.NPCS[npcId];
    if(!npc){ return; }
    if(npc.template instanceof GFFObject){
      await PartyManager.ExportPartyMemberTemplate(npcId, npc.template);
    }
  }

  /**
   * Generate the player template
   * @returns GFFObject
   */
  public static GeneratePlayerTemplate(): GFFObject {
    let pTPL = new GFFObject();

    pTPL.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue( GameState.ModuleObjectManager.GetNextPlayerId() );
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'Appearance_Type') ).setValue(GameState.GameKey == GameEngineType.TSL ? 134 : 177);
    pTPL.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'FirstName') ).setValue(GameState.GameKey == GameEngineType.TSL ? 'Leia Organa' : 'Luke Skywalker');
    pTPL.RootNode.addField( new GFFField(GFFDataType.INT, 'Age') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.SHORT, 'ArmorClass') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ChallengeRating') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'FactionID') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') ).setValue(GameState.GameKey == GameEngineType.TSL ? 10 : 26);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'HitPoints') ).setValue(100);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'MaxHitPoints') ).setValue(100);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'CurrentHitPoints') ).setValue(70);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'ForcePoints') ).setValue(15);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'MaxForcePoints') ).setValue(15);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'Commandable') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'CurrentForce') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'DeadSelectable') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'DetectMode') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'Disarmable') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'IsDestroyable') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'IsPC') ).setValue(1);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'IsRaiseable') ).setValue(1);
    let equipment = pTPL.RootNode.addField( new GFFField(GFFDataType.LIST, 'Equip_ItemList') );
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptAttacked') ).setValue('k_hen_attacked01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDamaged') ).setValue('k_def_damage01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDeath') ).setValue('');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDialogue') ).setValue('k_hen_dialogue01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptDisturbed') ).setValue('');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndDialogu') ).setValue('');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptEndRound') ).setValue('k_hen_combend01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') ).setValue('k_hen_heartbt01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnBlocked') ).setValue('k_def_blocked01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnNotice') ).setValue('k_hen_percept01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptRested') ).setValue('');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpawn') ).setValue('k_hen_spawn01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptSpellAt') ).setValue('k_def_spellat01');
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') ).setValue('k_def_userdef01');

    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'GoodEvil') ).setValue(50);

    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'NaturalAC') ).setValue(0);

    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Con') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Dex') ).setValue(14);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Str') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Wis') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Cha') ).setValue(10);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Int') ).setValue(10);

    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'fortbonus') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'refbonus') ).setValue(0);
    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'willbonus') ).setValue(0);

    pTPL.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PerceptionRange') ).setValue(12);

    let classList = pTPL.RootNode.addField( new GFFField(GFFDataType.LIST, 'ClassList') );
    for(let i = 0; i < 1; i++){
      let _class = new GFFStruct();
      _class.addField( new GFFField(GFFDataType.INT, 'Class') ).setValue(0);
      _class.addField( new GFFField(GFFDataType.SHORT, 'ClassLevel') ).setValue(1);
      _class.addField( new GFFField(GFFDataType.LIST, 'KnownList0') );
      classList.addChildStruct(_class);
    }

    let skillList = pTPL.RootNode.addField( new GFFField(GFFDataType.LIST, 'SkillList') );

    for(let i = 0; i < 8; i++){
      let _skill = new GFFStruct();
      _skill.addField( new GFFField(GFFDataType.RESREF, 'Rank') ).setValue(0);
      skillList.addChildStruct(_skill);
    }

    let armorStruct = new GFFStruct(ModuleCreatureArmorSlot.ARMOR);
    armorStruct.addField( new GFFField(GFFDataType.RESREF, 'EquippedRes') ).setValue('g_a_jedirobe01');
    let rhStruct = new GFFStruct(ModuleCreatureArmorSlot.RIGHTHAND);
    rhStruct.addField( new GFFField(GFFDataType.RESREF, 'EquippedRes') ).setValue('g_w_lghtsbr01');

    equipment.addChildStruct( armorStruct );
    equipment.addChildStruct( rhStruct );

    // SoundSetFile
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'SoundSetFile') ).setValue(85);
    pTPL.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Race') ).setValue(6);

    /*let spawnLoc = this.getSpawnLocation();
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'XPosition') ).setValue(spawnLoc.XPosition);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'YPosition') ).setValue(spawnLoc.YPosition);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'ZPosition') ).setValue(spawnLoc.ZPosition);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'XOrientation') ).setValue(spawnLoc.XOrientation);
    pTPL.RootNode.addField( new GFFField(GFFDataType.WORD, 'YOrientation') ).setValue(spawnLoc.YOrientation);*/
    PartyManager.PlayerTemplate = pTPL;
    PartyManager.PlayerTemplate.json = PartyManager.PlayerTemplate.toJSON();
    return PartyManager.PlayerTemplate;
  }

  /**
   * Add an event listener
   * @param type - The type of event to add
   * @param cb - The function to call when the event is triggered
   * @returns void
   */
  static AddEventListener(type: PartyManagerEvent, cb: Function){
    if(typeof cb !== 'function'){ return; }

    const events: Function[] = PartyManager.#eventListeners.get(type) || [];
    if(events.indexOf(cb) === -1){
      events.push(cb);
    }

    if(!PartyManager.#eventListeners.has(type)){
      PartyManager.#eventListeners.set(type, events);
    }
  }

  /**
   * Remove an event listener
   * @param type - The type of event to remove
   * @param cb - The function to remove
   * @returns void
   */
  static RemoveEventListener(type: PartyManagerEvent, cb: Function){
    if(!PartyManager.#eventListeners.has(type)){ return; }

    const events: Function[] = PartyManager.#eventListeners.get(type) || [];
    const idx = events.indexOf(cb);
    if(idx >= -1){
      events.splice(idx, 1);
    }
  }

  /**
   * Process an event listener
   * @param type - The type of event to process
   * @param args - The arguments to pass to the event listener
   * @returns void
   */
  static ProcessEventListener(type: PartyManagerEvent, args: any[]){
    const events: Function[] = PartyManager.#eventListeners.get(type) || [];
    for(let i = 0; i < events.length; i++){
      events[i](...args);
    }
  }

}
