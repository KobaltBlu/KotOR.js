/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { EncounterCreatureEntry, ModuleObject, SpawnEntry, SpawnPointEntry } from ".";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceTypes } from "../resource/ResourceTypes";
import { OdysseyFace3 } from "../three/odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";
import { ConfigClient } from "../utility/ConfigClient";
import { ResourceLoader } from "../loaders";
import { FactionManager } from "../FactionManager";
import { PartyManager } from "../managers";

/* @file
 * The ModuleEncounter class.
 */

export class ModuleEncounter extends ModuleObject {
  creatureList: EncounterCreatureEntry[];
  spawnPointList: SpawnPointEntry[];
  spawnList: SpawnEntry[];
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

  constructor ( gff = new GFFObject() ) {
    super(gff);
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
    
    //Check Module Creatures
    let creatureLen = GameState.module.area.creatures.length;
    for(let i = 0; i < creatureLen; i++){
      let creature = GameState.module.area.creatures[i];
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

    //Check Party Members
    let partyLen = PartyManager.party.length;
    for(let i = 0; i < partyLen; i++){
      let partymember = PartyManager.party[i];
      let pos = partymember.position.clone();
      
      if(this.box.containsPoint(pos)){
        if(this.objectsInside.indexOf(partymember) == -1){
          this.objectsInside.push(partymember);
          if(this.isHostile(partymember)){
            partymember.lastTriggerEntered = this;
            this.lastObjectEntered = partymember;

            this.onEnter(partymember);
            this.triggered = true;
          }
        }
      }else{
        if(this.objectsInside.indexOf(partymember) >= 0){
          this.objectsInside.splice(this.objectsInside.indexOf(partymember), 1);
          if(this.isHostile(partymember)){
            partymember.lastTriggerExited = this;
            this.lastObjectExited = partymember;

            this.onExit(partymember);
          }
        }
      }
    }

    this.mesh.visible = ConfigClient.get('Game.debug.trigger_geometry_show') ? true : false;

  }

  onEnter(object: ModuleObject){
    if(this.scripts.onEnter instanceof NWScriptInstance){
      let instance = this.scripts.onEnter.nwscript.newInstance();
      instance.enteringObject = object;
      instance.run(this, 0);
    }
  }

  onExit(object: ModuleObject){
    if(this.scripts.onExit instanceof NWScriptInstance){
      let instance = this.scripts.onExit.nwscript.newInstance();
      instance.exitingObject = object;
      instance.run(this, 0);
    }
  }

  Load(){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['ute'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.Merge(gff);
        this.InitProperties();
        this.LoadScripts();
        try{ this.buildGeometry(); }catch(e){console.error(e)}
        //this.initObjectsInside();
      }else{
        console.error('Failed to load ModuleTrigger template');
        if(this.template instanceof GFFObject){
          this.InitProperties();
          this.LoadScripts();
          try{ this.buildGeometry(); }catch(e){console.error(e)}
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      this.LoadScripts();
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

  LoadScripts(){
    this.scripts.onEntered = this.template.GetFieldByLabel('OnEntered').GetValue();
    this.scripts.onExhausted = this.template.GetFieldByLabel('OnExhausted').GetValue();
    this.scripts.onExit = this.template.GetFieldByLabel('OnExit').GetValue();
    this.scripts.onHeartbeat = this.template.GetFieldByLabel('OnHeartbeat').GetValue();
    this.scripts.onUserDefined = this.template.GetFieldByLabel('OnUserDefined').GetValue();

    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
      }
    }
  }

  InitProperties(){
    
    if(!this.initialized){
      if(this.template.RootNode.HasField('ObjectId')){
        this.id = this.template.GetFieldByLabel('ObjectId').GetValue();
      }else if(this.template.RootNode.HasField('ID')){
        this.id = this.template.GetFieldByLabel('ID').GetValue();
      }else{
        this.id = ModuleObject.COUNT++;
        while(ModuleObject.List.has(this.id)){
          this.id = ModuleObject.COUNT++;
        }
      }
      
      ModuleObject.List.set(this.id, this);

      if(this.template.RootNode.HasField('Geometry')){
        this.geometry = this.template.GetFieldByLabel('Geometry').GetChildStructs();

        //Push verticies
        for(let i = 0; i < this.geometry.length; i++){
          let tgv = this.geometry[i];
          this.vertices[i] = new THREE.Vector3( 
            tgv.GetFieldByLabel('X').GetValue(),
            tgv.GetFieldByLabel('Y').GetValue(),
            tgv.GetFieldByLabel('Z').GetValue()
          );
        }
      }

      if(this.template.RootNode.HasField('SWVarTable')){
        let localBools = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
        //console.log(localBools);
        for(let i = 0; i < localBools.length; i++){
          let data = localBools[i].GetFieldByLabel('Variable').GetValue();
          for(let bit = 0; bit < 32; bit++){
            this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
          }
        }
      }

      if(this.template.RootNode.HasField('CreatureList')){
        let creatures = this.template.RootNode.GetFieldByLabel('CreatureList').GetChildStructs();
        let entry = undefined;
        for(let i = 0, len = creatures.length; i < len; i++){
          entry = EncounterCreatureEntry.FromStruct(creatures[i]);
          if(entry instanceof EncounterCreatureEntry){
            this.creatureList.push(entry);
          }
        }
      }

      if(this.template.RootNode.HasField('SpawnPointList')){
        let spawnPoints = this.template.RootNode.GetFieldByLabel('SpawnPointList').GetChildStructs();
        let entry = undefined;
        for(let i = 0, len = spawnPoints.length; i < len; i++){
          entry = SpawnPointEntry.FromStruct(spawnPoints[i]);
          if(entry instanceof SpawnPointEntry){
            this.spawnPointList.push(entry);
          }
        }
      }

      if(this.template.RootNode.HasField('SpawnList')){
        let spawns = this.template.RootNode.GetFieldByLabel('SpawnList').GetChildStructs();
        let entry = undefined;
        for(let i = 0, len = spawns.length; i < len; i++){
          entry = SpawnEntry.FromStruct(spawns[i]);
          if(entry instanceof SpawnEntry){
            this.spawnList.push(entry);
          }
        }
      }

      if(this.template.RootNode.HasField('Active'))
        this.active = this.template.GetFieldByLabel('Active').GetValue();

      if(this.template.RootNode.HasField('AreaPoints'))
        this.areaPoints = this.template.GetFieldByLabel('AreaPoints').GetValue();

      if(this.template.RootNode.HasField('Difficulty'))
        this.difficulty = this.template.GetFieldByLabel('Difficulty').GetValue();

      if(this.template.RootNode.HasField('DifficultyIndex'))
        this.difficultyIndex = this.template.GetFieldByLabel('DifficultyIndex').GetValue();

      if(this.template.RootNode.HasField('Faction')){
        this.factionId = this.template.GetFieldByLabel('Faction').GetValue();
        if((this.factionId & 0xFFFFFFFF) == -1){
          this.factionId = 0;
        }
      }
      this.faction = FactionManager.factions.get(this.factionId);

      if(this.template.RootNode.HasField('LocalizedName'))
        this.localizedName = this.template.GetFieldByLabel('LocalizedName').GetValue();

      if(this.template.RootNode.HasField('MaxCreatures'))
        this.maxCreatures = this.template.GetFieldByLabel('MaxCreatures').GetValue();

      if(this.template.RootNode.HasField('PaletteID'))
        this.paletteId = this.template.GetFieldByLabel('PaletteID').GetValue();

      if(this.template.RootNode.HasField('PlayerOnly'))
        this.playerOnly = this.template.GetFieldByLabel('PlayerOnly').GetValue();

      if(this.template.RootNode.HasField('RecCreatures'))
        this.recCreatures = this.template.GetFieldByLabel('RecCreatures').GetValue();

      if(this.template.RootNode.HasField('Reset'))
        this.reset = this.template.GetFieldByLabel('Reset').GetValue();

      if(this.template.RootNode.HasField('ResetTime'))
        this.resetTime = this.template.GetFieldByLabel('ResetTime').GetValue();

      if(this.template.RootNode.HasField('Respawns'))
        this.respawns = this.template.GetFieldByLabel('Respawns').GetValue();

      if(this.template.RootNode.HasField('SpawnOption'))
        this.spawnOption = this.template.GetFieldByLabel('SpawnOption').GetValue();

      if(this.template.RootNode.HasField('Tag'))
        this.tag = this.template.GetFieldByLabel('Tag').GetValue();
  
      if(this.template.RootNode.HasField('TemplateResRef'))
        this.templateResRef = this.template.GetFieldByLabel('TemplateResRef').GetValue();

      if(this.template.RootNode.HasField('XPosition'))
        this.position.x = this.template.GetFieldByLabel('XPosition').GetValue();

      if(this.template.RootNode.HasField('YPosition'))
        this.position.y = this.template.GetFieldByLabel('YPosition').GetValue();
  
      if(this.template.RootNode.HasField('ZPosition'))
        this.position.z = this.template.GetFieldByLabel('ZPosition').GetValue();

      if(this.template.RootNode.HasField('Commandable'))
        this.commandable = this.template.GetFieldByLabel('Commandable').GetValue();

      if(this.template.RootNode.HasField('NumberSpawned'))
        this.numberSpawned = this.template.GetFieldByLabel('NumberSpawned').GetValue();

      if(this.template.RootNode.HasField('HeartbeatDay'))
        this.heartbeatDay = this.template.GetFieldByLabel('HeartbeatDay').GetValue();

      if(this.template.RootNode.HasField('HeartbeatTime'))
        this.heartbeatTime = this.template.GetFieldByLabel('HeartbeatTime').GetValue();

      if(this.template.RootNode.HasField('LastSpawnDay'))
        this.lastSpawnDay = this.template.GetFieldByLabel('LastSpawnDay').GetValue();

      if(this.template.RootNode.HasField('LastSpawnTime'))
        this.lastSpawnTime = this.template.GetFieldByLabel('LastSpawnTime').GetValue();

      if(this.template.RootNode.HasField('LastEntered'))
        this.lastEntered = this.template.GetFieldByLabel('LastEntered').GetValue();

      if(this.template.RootNode.HasField('LastLeft'))
        this.lastLeft = this.template.GetFieldByLabel('LastLeft').GetValue();

      if(this.template.RootNode.HasField('Started'))
        this.started = this.template.GetFieldByLabel('Started').GetValue();

      if(this.template.RootNode.HasField('Exhausted'))
        this.exhausted = this.template.GetFieldByLabel('Exhausted').GetValue();
        
      if(this.template.RootNode.HasField('CurrentSpawns'))
        this.currentSpawns = this.template.GetFieldByLabel('CurrentSpawns').GetValue();
    
      if(this.template.RootNode.HasField('CustomScriptId'))
        this.customScriptId = this.template.GetFieldByLabel('CustomScriptId').GetValue();

      if(this.template.RootNode.HasField('AreaListMaxSize'))
        this.areaListMaxSize = this.template.GetFieldByLabel('AreaListMaxSize').GetValue();

      if(this.template.RootNode.HasField('SpawnPoolActive'))
        this.spawnPoolActive = this.template.GetFieldByLabel('SpawnPoolActive').GetValue();

      this.initialized = true;
    }

  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTE ';

    let actionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ActionList') );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Commandable') ).SetValue(this.commandable);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Active') ).SetValue(this.active);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Reset') ).SetValue( this.reset );
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'ResetTime') ).SetValue(this.resetTime);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'Respawns') ).SetValue(this.respawns);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'SpawnOption') ).SetValue(this.spawnOption);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'MaxCreatures') ).SetValue(this.maxCreatures);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'RecCreatures') ).SetValue(this.recCreatures);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PlayerOnly') ).SetValue( this.playerOnly );
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Faction') ).SetValue( this.faction );
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'DifficultyIndex') ).SetValue( this.difficultyIndex );
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'Difficulty') ).SetValue( this.difficulty );
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).SetValue(this.localizedName);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag);

    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'NumberSpawned') ).SetValue(this.numberSpawned);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'HeartbeatDay') ).SetValue(this.heartbeatDay);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'HeartbeatTime') ).SetValue(this.heartbeatTime);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'LastSpawnDay') ).SetValue(this.lastSpawnDay);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'LastSpawnTime') ).SetValue(this.lastSpawnTime);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Started') ).SetValue(this.started);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Exhausted') ).SetValue(this.exhausted);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'CurrentSpawns') ).SetValue(this.currentSpawns);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'SpawnPoolActive') ).SetValue(this.spawnPoolActive);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'LastEntered') ).SetValue(this.lastEntered);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'LastLeft') ).SetValue(this.lastLeft);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'CustomScriptId') ).SetValue(this.customScriptId);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'AreaListMaxSize') ).SetValue(this.areaListMaxSize);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'AreaPoints') ).SetValue(this.areaPoints);

    let creatureList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'CreatureList') );
    let creature = undefined;
    for(let i = 0; i < this.creatureList.length; i++){
      creature = this.creatureList[i].save();
      if(creature)
        creatureList.AddChildStruct( creature );
    }

    let spawnPointList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'SpawnPointList') );
    let spawnPoint = undefined;
    for(let i = 0; i < this.spawnPointList.length; i++){
      spawnPoint = this.spawnPointList[i].save();
      if(spawnPoint)
        spawnPointList.AddChildStruct( spawnPoint );
    }

    if(this.spawnList.length){
      let spawnList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'SpawnList') );
      let spawn = undefined;
      for(let i = 0; i < this.spawnList.length; i++){
        spawn = this.spawnList[i].save();
        if(spawn)
          spawnList.AddChildStruct( spawn );
      }
    }

    let geometry = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Geometry') );
    for(let i = 0; i < this.vertices.length; i++){
      let vertStruct = new GFFStruct();
      vertStruct.AddField( new GFFField(GFFDataType.FLOAT, 'X') ).SetValue(this.vertices[i].x);
      vertStruct.AddField( new GFFField(GFFDataType.FLOAT, 'Y') ).SetValue(this.vertices[i].y);
      vertStruct.AddField( new GFFField(GFFDataType.FLOAT, 'Z') ).SetValue(this.vertices[i].z);
      geometry.AddChildStruct(vertStruct);
    }

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    //Scripts
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnEntered') ).SetValue(this.scripts.onEntered ? this.scripts.onEntered.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnExit') ).SetValue(this.scripts.onExit ? this.scripts.onExit.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnExhausted') ).SetValue(this.scripts.onExhausted ? this.scripts.onExhausted.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnHeartbeat') ).SetValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUserDefined') ).SetValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');

    gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).SetValue(this.position.x);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).SetValue(this.position.y);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).SetValue(this.position.z);

    this.template = gff;
    return gff;
  }

}
