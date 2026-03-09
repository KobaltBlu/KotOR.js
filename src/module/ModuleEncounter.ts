import * as THREE from "three";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceTypes } from "../resource/ResourceTypes";
import { OdysseyFace3 } from "../three/odyssey";
import type { OdysseyModel3D } from "../three/odyssey";
import { ConfigClient } from "../utility/ConfigClient";
import { ResourceLoader } from "../loaders";
// import { ModuleObjectManager, PartyManager, FactionManager } from "../managers";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleObject } from "./ModuleObject";
import type { ModuleCreature } from "./ModuleCreature";
import { EncounterCreatureEntry } from "./EncounterCreatureEntry";
import { EncounterSpawnPointEntry } from "./EncounterSpawnPointEntry";
import { EncounterSpawnEntry } from "./EncounterSpawnEntry";
import { ModuleObjectScript } from "../enums/module/ModuleObjectScript";

/**
* ModuleEncounter class.
* 
* Class representing an encounter found in module areas.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleEncounter.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleEncounter extends ModuleObject {
  creatureList: EncounterCreatureEntry[];
  spawnPointList: EncounterSpawnPointEntry[];
  spawnList: EncounterSpawnEntry[];
  active: number;
  difficulty: number;
  difficultyIndex: number;
  maxCreatures: number;
  playerOnly: number;
  recCreatures: number;
  reset: number;
  resetTime: number;
  spawnOption: number;
  started: number;
  objectsInsideIdx: number;
  lastObjectEntered: any;
  lastObjectExited: any;
  triggered: boolean;
  areaPoints: any;
  paletteId: any;
  respawns: any;
  numberSpawned: any;
  heartbeatDay: any;
  heartbeatTime: any;
  lastSpawnDay: any;
  lastSpawnTime: any;
  lastEntered: any;
  lastLeft: any;
  exhausted: any;
  currentSpawns: any;
  customScriptId: any;
  areaListMaxSize: any;
  spawnPoolActive: any;
  /** Creatures spawned by this encounter; tracked for reset/exhaustion logic. */
  spawnedCreatures: ModuleCreature[];
  /** Elapsed time (seconds) since the encounter was exhausted, for reset cooldown. */
  private resetTimer: number;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= ModuleObjectType.ModuleEncounter;
    this.template = gff;
    this.vertices = []; 

    this.creatureList = [];

    this.spawnPointList = [];  

    this.spawnList = [];

    this.active = 1; //0: Inactive | 1: Active
    this.difficulty = 1; //OBSOLETE FIELD; Should always be identical to the VALUE in encdifficulty.2da pointed to by the DifficultyIndex Field.
    this.difficultyIndex = 1; //Index into encdifficulty.2da
    // this.faction = 0; //Faction ID; Only spawn when entered by creatures hostile to this faction
    this.localizedName = undefined;
    this.maxCreatures = 1; //Maximum number of creatures this encounter can spawn; 1-8
    this.playerOnly = 0; //0: Any Creature | 1: Only Player ; Can Trigger
    this.recCreatures = 1; //Recommneded number of creatures; 1-8
    this.reset = 0; //0: No Respawn | 1: Respawn
    this.resetTime = 32000; //Seconds before encounter respawns
    this.spawnOption = 0; //0: Continuous Spawn | 1: Single-Shot Spawn
    this.started = 0; //0: if there are no creatures currently belonging to the encounter. | 1: if any creatures currently exist that belong to the encounter.
    this.spawnedCreatures = [];
    this.resetTimer = 0;

    this.scripts = {
      onEntered: undefined,
      onExhausted: undefined,
      onExit: undefined,
      onHeartbeat: undefined,
      onUserDefined: undefined
    };

    this.objectsInside = [];
    this.objectsInsideIdx = 0;
    this.lastObjectEntered = null;
    this.lastObjectExited = null;

  }

  update(delta = 0){
    
    super.update(delta);
    
    this.getCurrentRoom();

    // Clean up dead/destroyed spawned creatures to prevent stale references
    if(this.spawnedCreatures.length > 0){
      this.spawnedCreatures = this.spawnedCreatures.filter(c => c && !c.isDead() && !c.willDestroy);
      // If all spawned creatures are gone and encounter has started, mark as not started
      if(this.spawnedCreatures.length === 0 && this.started){
        this.started = 0;
      }
    }

    // Reset cooldown: if encounter is inactive and reset is allowed, tick timer and reactivate
    if(!this.active && this.reset && this.resetTime > 0){
      this.resetTimer += delta;
      if(this.resetTimer >= this.resetTime){
        this.resetTimer = 0;
        this.active = 1;
        this.started = 0;
        this.spawnedCreatures = [];
      }
    }
    
    //Check Module Creatures
    const areaCreatures = GameState.module?.area?.creatures;
    if(areaCreatures){
      let creatureLen = areaCreatures.length;
      for(let i = 0; i < creatureLen; i++){
        let creature = areaCreatures[i];
        let pos = creature.position.clone();
        if(this.box.containsPoint(pos)){
          if(this.objectsInside.indexOf(creature) == -1){
            this.objectsInside.push(creature);
            if(this.isHostile(creature)){
              creature.lastTriggerEntered = this;
              this.lastObjectEntered = creature;

              this.onEnter(creature);
              this.triggered = true;
            }
          }
        }else{
          if(this.objectsInside.indexOf(creature) >= 0){
            this.objectsInside.splice(this.objectsInside.indexOf(creature), 1);
            if(this.isHostile(creature)){
              creature.lastTriggerExited = this;
              this.lastObjectExited = creature;
              this.onExit(creature);
            }
          }
        }
      }
    }

    //Check Party Members
    let partyLen = GameState.PartyManager.party.length;
    for(let i = 0; i < partyLen; i++){
      let partymember = GameState.PartyManager.party[i];
      let pos = partymember.position.clone();
      
      if(this.box.containsPoint(pos)){
        if(this.objectsInside.indexOf(partymember) == -1){
          this.objectsInside.push(partymember);
          // Party members always trigger encounter spawn (engine-level behaviour)
          partymember.lastTriggerEntered = this;
          this.lastObjectEntered = partymember;
          this.triggerEncounterEntry(partymember);
        }
      }else{
        if(this.objectsInside.indexOf(partymember) >= 0){
          this.objectsInside.splice(this.objectsInside.indexOf(partymember), 1);
          partymember.lastTriggerExited = this;
          this.lastObjectExited = partymember;
          this.onExit(partymember);
        }
      }
    }

    this.mesh.visible = ConfigClient.get('Game.debug.trigger_geometry_show') ? true : false;

  }

  /**
   * Handle a party member entering the encounter zone.
   * Spawns creatures from the creature list (engine-level) then runs the
   * OnEntered NWScript.
   */
  triggerEncounterEntry(entering: ModuleObject){
    // Spawn creatures only when encounter is active and not yet started
    if(this.active && !this.started && this.creatureList.length > 0){
      this.spawnEncounterCreatures();
    }
    this.onEnter(entering);
    this.triggered = true;
  }

  /**
   * Spawn creatures from the creature list at the designated spawn points.
   * The number spawned is capped at recCreatures (or maxCreatures as fallback).
   */
  spawnEncounterCreatures(){
    if(!GameState.module?.area) return;
    const area = GameState.module.area;

    const targetCount = this.recCreatures > 0 ? this.recCreatures : this.maxCreatures;
    let spawned = 0;

    // Build a shuffled copy of spawn points so we cycle through them
    const points = this.spawnPointList.slice();

    for(let i = 0; i < this.creatureList.length && spawned < targetCount; i++){
      const entry = this.creatureList[i];
      if(!entry.resref) continue;

      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utc'], entry.resref);
      if(!buffer){
        console.error('ModuleEncounter: failed to load creature template', entry.resref);
        continue;
      }

      const creature = new GameState.Module.ModuleArea.ModuleCreature(new GFFObject(buffer)) as ModuleCreature;
      creature.load();
      creature.encounterCreature = true;

      // Pick spawn position: use explicit spawn point if available, otherwise encounter centre
      if(points.length > 0){
        const ptIdx = spawned % points.length;
        const pt = points[ptIdx];
        creature.position.set(pt.position.x, pt.position.y, pt.position.z);
        creature.setFacing(pt.orientation, true);
      } else {
        // Fall back to encounter bounding-box centre
        const centre = new THREE.Vector3();
        this.box.getCenter(centre);
        creature.position.copy(centre);
      }

      area.attachObject(creature);
      this.spawnedCreatures.push(creature);

      creature.loadModel().then((model: OdysseyModel3D) => {
        if(!model) return;
        model.userData.moduleObject = creature;
        model.hasCollision = true;
        model.name = creature.getTag();
        GameState.group.creatures.add(creature.container);
        creature.getCurrentRoom();
        creature.onSpawn();
      }).catch((e: any) => console.error('ModuleEncounter: creature model load error', e));

      spawned++;
    }

    if(spawned > 0){
      this.started = 1;
      // Single-shot spawn: deactivate after first wave
      if(this.spawnOption === 1){
        this.active = 0;
      }
    }
  }

  onEnter(object: ModuleObject){
    const nwscript = this.scripts[ModuleObjectScript.EncounterOnEntered];
    if(!nwscript){ return; }
    const instance = nwscript.newInstance();
    instance.enteringObject = object;
    instance.run(this, 0);
  }

  onExit(object: ModuleObject){
    const nwscript = this.scripts[ModuleObjectScript.EncounterOnExit];
    if(!nwscript){ return; }
    const instance = nwscript.newInstance();
    instance.exitingObject = object;
    instance.run(this, 0);
  }

  load(){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['ute'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        this.loadScripts();
        try{ this.buildGeometry(); }catch(e){console.error(e)}
        //this.initObjectsInside();
      }else{
        console.error('Failed to load ModuleTrigger template');
        if(this.template instanceof GFFObject){
          this.initProperties();
          this.loadScripts();
          try{ this.buildGeometry(); }catch(e){console.error(e)}
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      this.loadScripts();
      try{ this.buildGeometry(); }catch(e){console.error(e)}
    }
  }

  buildGeometry(){
    let trigGeom = this.getGeometry();

    let material = new THREE.MeshBasicMaterial({
      color: new THREE.Color( 0xFFFFFF ),
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh( trigGeom, material );
    this.mesh.position.copy(this.position);
    this.box.setFromObject(this.mesh);
    this.box.min.z -= 100;
    this.box.max.z += 100;

    this.mesh.userData.moduleObject = this;
    this.mesh.visible = false;
    GameState.group.triggers.add(this.mesh);
  }

  getGeometry(){
    let trigGeom = new THREE.BufferGeometry();
    let vertices = this.vertices.slice();
    let faces: any[] = [];

    try{
      let holes: any = [];
      let triangles = THREE.ShapeUtils.triangulateShape ( vertices, holes );
      for( let i = 0; i < triangles.length; i++ ){
        faces.push( new OdysseyFace3( triangles[i][0], triangles[i][1], triangles[i][2] ));
      }
    }catch(e){
      console.error('ModuleTrigger', 'Failed to generate faces', {
        trigger: this,
        error: e
      })
    }

    // trigGeom.computeFaceNormals();
    trigGeom.computeVertexNormals();
    trigGeom.computeBoundingSphere();

    return trigGeom;
  }

  loadScripts(){
    const scriptKeys = [
      ModuleObjectScript.EncounterOnEntered,
      ModuleObjectScript.EncounterOnExhausted,
      ModuleObjectScript.EncounterOnExit,
      ModuleObjectScript.EncounterOnHeartbeat,
      ModuleObjectScript.EncounterOnUserDefined,
    ];

    const scriptsNode = this.template?.RootNode;
    if(!scriptsNode){ return; }
    for(const scriptKey of scriptKeys){
      if(scriptsNode.hasField(scriptKey)){
        const resRef = scriptsNode.getFieldByLabel(scriptKey).getValue();
        if(!resRef){ continue; }
        const nwscript = GameState.NWScript.Load(resRef);
        if(!nwscript){ 
          console.warn(`ModuleEncounter.loadScripts: Failed to load script [${scriptKey}]:${resRef} for object ${this.name}`);
          continue; 
        }
        nwscript.caller = this;
        this.scripts[scriptKey] = nwscript;
      }
    }
  }

  initProperties(){
    
    if(!this.initialized){
      if(this.template.RootNode.hasField('ObjectId')){
        this.id = this.template.getFieldByLabel('ObjectId').getValue();
      }else if(this.template.RootNode.hasField('ID')){
        this.id = this.template.getFieldByLabel('ID').getValue();
      }
      
      GameState.ModuleObjectManager.AddObjectById(this);

      if(this.template.RootNode.hasField('Geometry')){
        this.geometry = this.template.getFieldByLabel('Geometry').getChildStructs();

        //Push verticies
        for(let i = 0; i < this.geometry.length; i++){
          let tgv = this.geometry[i];
          this.vertices[i] = new THREE.Vector3( 
            tgv.getFieldByLabel('X').getValue(),
            tgv.getFieldByLabel('Y').getValue(),
            tgv.getFieldByLabel('Z').getValue()
          );
        }
      }

      if(this.template.RootNode.hasField('SWVarTable')){
        const swVarTableStruct = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0];
        if(swVarTableStruct?.hasField('BitArray')){
          let localBools = swVarTableStruct.getFieldByLabel('BitArray').getChildStructs();
          //console.log(localBools);
          for(let i = 0; i < localBools.length; i++){
            let data = localBools[i].getFieldByLabel('Variable').getValue();
            for(let bit = 0; bit < 32; bit++){
              this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
            }
          }
        }
      }

      if(this.template.RootNode.hasField('CreatureList')){
        let creatures = this.template.RootNode.getFieldByLabel('CreatureList').getChildStructs();
        let entry = undefined;
        for(let i = 0, len = creatures.length; i < len; i++){
          entry = EncounterCreatureEntry.FromStruct(creatures[i]);
          if(entry instanceof EncounterCreatureEntry){
            this.creatureList.push(entry);
          }
        }
      }

      if(this.template.RootNode.hasField('SpawnPointList')){
        let spawnPoints = this.template.RootNode.getFieldByLabel('SpawnPointList').getChildStructs();
        let entry = undefined;
        for(let i = 0, len = spawnPoints.length; i < len; i++){
          entry = EncounterSpawnPointEntry.FromStruct(spawnPoints[i]);
          if(entry instanceof EncounterSpawnPointEntry){
            this.spawnPointList.push(entry);
          }
        }
      }

      if(this.template.RootNode.hasField('SpawnList')){
        let spawns = this.template.RootNode.getFieldByLabel('SpawnList').getChildStructs();
        let entry = undefined;
        for(let i = 0, len = spawns.length; i < len; i++){
          entry = EncounterSpawnEntry.FromStruct(spawns[i]);
          if(entry instanceof EncounterSpawnEntry){
            this.spawnList.push(entry);
          }
        }
      }

      if(this.template.RootNode.hasField('Active'))
        this.active = this.template.getFieldByLabel('Active').getValue();

      if(this.template.RootNode.hasField('AreaPoints'))
        this.areaPoints = this.template.getFieldByLabel('AreaPoints').getValue();

      if(this.template.RootNode.hasField('Difficulty'))
        this.difficulty = this.template.getFieldByLabel('Difficulty').getValue();

      if(this.template.RootNode.hasField('DifficultyIndex'))
        this.difficultyIndex = this.template.getFieldByLabel('DifficultyIndex').getValue();

      if(this.template.RootNode.hasField('Faction')){
        this.factionId = this.template.getFieldByLabel('Faction').getValue();
        if((this.factionId & 0xFFFFFFFF) == -1){
          this.factionId = 0;
        }
      }
      this.faction = GameState.FactionManager.factions.get(this.factionId);

      if(this.template.RootNode.hasField('LocalizedName'))
        this.localizedName = this.template.getFieldByLabel('LocalizedName').getValue();

      if(this.template.RootNode.hasField('MaxCreatures'))
        this.maxCreatures = this.template.getFieldByLabel('MaxCreatures').getValue();

      if(this.template.RootNode.hasField('PaletteID'))
        this.paletteId = this.template.getFieldByLabel('PaletteID').getValue();

      if(this.template.RootNode.hasField('PlayerOnly'))
        this.playerOnly = this.template.getFieldByLabel('PlayerOnly').getValue();

      if(this.template.RootNode.hasField('RecCreatures'))
        this.recCreatures = this.template.getFieldByLabel('RecCreatures').getValue();

      if(this.template.RootNode.hasField('Reset'))
        this.reset = this.template.getFieldByLabel('Reset').getValue();

      if(this.template.RootNode.hasField('ResetTime'))
        this.resetTime = this.template.getFieldByLabel('ResetTime').getValue();

      if(this.template.RootNode.hasField('Respawns'))
        this.respawns = this.template.getFieldByLabel('Respawns').getValue();

      if(this.template.RootNode.hasField('SpawnOption'))
        this.spawnOption = this.template.getFieldByLabel('SpawnOption').getValue();

      if(this.template.RootNode.hasField('Tag'))
        this.tag = this.template.getFieldByLabel('Tag').getValue();
  
      if(this.template.RootNode.hasField('TemplateResRef'))
        this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();

      if(this.template.RootNode.hasField('XPosition'))
        this.position.x = this.template.getFieldByLabel('XPosition').getValue();

      if(this.template.RootNode.hasField('YPosition'))
        this.position.y = this.template.getFieldByLabel('YPosition').getValue();
  
      if(this.template.RootNode.hasField('ZPosition'))
        this.position.z = this.template.getFieldByLabel('ZPosition').getValue();

      if(this.template.RootNode.hasField('Commandable'))
        this.commandable = this.template.getFieldByLabel('Commandable').getValue();

      if(this.template.RootNode.hasField('NumberSpawned'))
        this.numberSpawned = this.template.getFieldByLabel('NumberSpawned').getValue();

      if(this.template.RootNode.hasField('HeartbeatDay'))
        this.heartbeatDay = this.template.getFieldByLabel('HeartbeatDay').getValue();

      if(this.template.RootNode.hasField('HeartbeatTime'))
        this.heartbeatTime = this.template.getFieldByLabel('HeartbeatTime').getValue();

      if(this.template.RootNode.hasField('LastSpawnDay'))
        this.lastSpawnDay = this.template.getFieldByLabel('LastSpawnDay').getValue();

      if(this.template.RootNode.hasField('LastSpawnTime'))
        this.lastSpawnTime = this.template.getFieldByLabel('LastSpawnTime').getValue();

      if(this.template.RootNode.hasField('LastEntered'))
        this.lastEntered = this.template.getFieldByLabel('LastEntered').getValue();

      if(this.template.RootNode.hasField('LastLeft'))
        this.lastLeft = this.template.getFieldByLabel('LastLeft').getValue();

      if(this.template.RootNode.hasField('Started'))
        this.started = this.template.getFieldByLabel('Started').getValue();

      if(this.template.RootNode.hasField('Exhausted'))
        this.exhausted = this.template.getFieldByLabel('Exhausted').getValue();
        
      if(this.template.RootNode.hasField('CurrentSpawns'))
        this.currentSpawns = this.template.getFieldByLabel('CurrentSpawns').getValue();
    
      if(this.template.RootNode.hasField('CustomScriptId'))
        this.customScriptId = this.template.getFieldByLabel('CustomScriptId').getValue();

      if(this.template.RootNode.hasField('AreaListMaxSize'))
        this.areaListMaxSize = this.template.getFieldByLabel('AreaListMaxSize').getValue();

      if(this.template.RootNode.hasField('SpawnPoolActive'))
        this.spawnPoolActive = this.template.getFieldByLabel('SpawnPoolActive').getValue();

      this.initialized = true;
    }

  }

  destroy(): void {
    super.destroy();
  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTE ';

    let actionList = gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(this.commandable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Active') ).setValue(this.active);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Reset') ).setValue( this.reset );
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'ResetTime') ).setValue(this.resetTime);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Respawns') ).setValue(this.respawns);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'SpawnOption') ).setValue(this.spawnOption);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'MaxCreatures') ).setValue(this.maxCreatures);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'RecCreatures') ).setValue(this.recCreatures);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PlayerOnly') ).setValue( this.playerOnly );
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Faction') ).setValue( this.faction ? this.faction.id : this.factionId );
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'DifficultyIndex') ).setValue( this.difficultyIndex );
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Difficulty') ).setValue( this.difficulty );
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).setValue(this.localizedName);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'NumberSpawned') ).setValue(this.numberSpawned);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'HeartbeatDay') ).setValue(this.heartbeatDay);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'HeartbeatTime') ).setValue(this.heartbeatTime);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastSpawnDay') ).setValue(this.lastSpawnDay);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastSpawnTime') ).setValue(this.lastSpawnTime);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Started') ).setValue(this.started);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Exhausted') ).setValue(this.exhausted);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'CurrentSpawns') ).setValue(this.currentSpawns);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'SpawnPoolActive') ).setValue(this.spawnPoolActive);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastEntered') ).setValue(this.lastEntered);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastLeft') ).setValue(this.lastLeft);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'CustomScriptId') ).setValue(this.customScriptId);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'AreaListMaxSize') ).setValue(this.areaListMaxSize);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'AreaPoints') ).setValue(this.areaPoints);

    let creatureList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'CreatureList') );
    let creature = undefined;
    for(let i = 0; i < this.creatureList.length; i++){
      creature = this.creatureList[i].save();
      if(creature)
        creatureList.addChildStruct( creature );
    }

    let spawnPointList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'SpawnPointList') );
    let spawnPoint = undefined;
    for(let i = 0; i < this.spawnPointList.length; i++){
      spawnPoint = this.spawnPointList[i].save();
      if(spawnPoint)
        spawnPointList.addChildStruct( spawnPoint );
    }

    if(this.spawnList.length){
      let spawnList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'SpawnList') );
      let spawn = undefined;
      for(let i = 0; i < this.spawnList.length; i++){
        spawn = this.spawnList[i].save();
        if(spawn)
          spawnList.addChildStruct( spawn );
      }
    }

    let geometry = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'Geometry') );
    for(let i = 0; i < this.vertices.length; i++){
      let vertStruct = new GFFStruct();
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'X') ).setValue(this.vertices[i].x);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'Y') ).setValue(this.vertices[i].y);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'Z') ).setValue(this.vertices[i].z);
      geometry.addChildStruct(vertStruct);
    }

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    //Scripts
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.EncounterOnEntered) ).setValue(this.scripts[ModuleObjectScript.EncounterOnEntered]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.EncounterOnExit) ).setValue(this.scripts[ModuleObjectScript.EncounterOnExit]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.EncounterOnExhausted) ).setValue(this.scripts[ModuleObjectScript.EncounterOnExhausted]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.EncounterOnHeartbeat) ).setValue(this.scripts[ModuleObjectScript.EncounterOnHeartbeat]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.EncounterOnUserDefined) ).setValue(this.scripts[ModuleObjectScript.EncounterOnUserDefined]?.name || '');

    gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }

}
