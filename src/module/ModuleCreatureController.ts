/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import THREE from "three";
import { ModuleCreature, ModuleDoor, ModuleItem, ModuleObject, ModuleRoom } from ".";
import { Action, ActionMoveToPoint, ActionJumpToObject, ActionJumpToPoint, ActionPhysicalAttacks, ActionUnlockObject, ActionCastSpell, ActionItemCastSpell } from "../actions";
import { CombatEngine } from "../combat/CombatEngine";
import EngineLocation from "../engine/EngineLocation";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionType } from "../enums/actions/ActionType";
import { EngineMode } from "../enums/engine/EngineMode";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameState } from "../GameState";
import { SSFObjectType } from "../interface/resource/SSFType";
import { PartyManager } from "../managers/PartyManager";
import { TwoDAManager } from "../managers/TwoDAManager";
import { OdysseyModelAnimation } from "../odyssey";
import { GFFObject } from "../resource/GFFObject";
import { LIPObject } from "../resource/LIPObject";
import { TalentFeat } from "../talents/TalentFeat";
import { TalentObject } from "../talents/TalentObject";
import { OdysseyModel3D } from "../three/odyssey";
import { Utility } from "../utility/Utility";

/* @file
 * The ModuleCreatureController class.
 */

export abstract class ModuleCreatureController extends ModuleObject {

  constructor(gff: GFFObject){
    super(gff);
    this.deferEventUpdate = true;
    //this.combat

  }
  
}
