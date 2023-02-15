/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleObject } from ".";
import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { OdysseyFace3, OdysseyModel3D } from "../three/odyssey";
import { GameState } from "../GameState";
import { TemplateLoader } from "../loaders/TemplateLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { PartyManager } from "../managers/PartyManager";
import { AsyncLoop } from "../utility/AsyncLoop";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { NWScript } from "../nwscript/NWScript";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFStruct } from "../resource/GFFStruct";
import { ModuleTriggerType } from "../enums/module/ModuleTriggerType";
import { ConfigClient } from "../utility/ConfigClient";
import { ResourceLoader } from "../resource/ResourceLoader";
import { EngineMode } from "../enums/engine/EngineMode";
import { FactionManager } from "../FactionManager";

/* @file
 * The ModuleTrigger class.
 */

export class ModuleTrigger extends ModuleObject {
  objectsInsideIdx: number;
  lastObjectEntered: any;
  lastObjectExited: any;
  triggered: boolean;
  trapFlag: any;
  trapDetectDC: any;

  constructor ( gff = new GFFObject() ) {
    super(gff);

    this.template = gff;
    this.objectsInside = [];
    this.objectsInsideIdx = 0;
    this.lastObjectEntered = null;
    this.lastObjectExited = null;

    this.setByPlayerParty = 0;

    this.tag = '';
    this.vertices = [];
    this.box = new THREE.Box3();

    this.triggered = false;
    this.InitProperties();

  }

  getType(){
    return this.type;
  }

  getTag(){
    return this.tag;
  }

  getTemplateResRef(){
    return this.templateResRef;
  }

  getXOrientation(){
    return this.xOrientation;
  }

  getYOrientation(){
    return this.yOrientation;
  }

  getZOrientation(){
    return this.zOrientation;
  }

  isDead(){
    return false;
  }

  getCurrentRoom(){
    let _distance = 1000000000;
    for(let i = 0; i < GameState.module.area.rooms.length; i++){
      let room = GameState.module.area.rooms[i];
      let model = room.model;
      if(model instanceof OdysseyModel3D){
        let pos = this.position.clone();
        if(model.box.containsPoint(pos)){
          let roomCenter = model.box.getCenter(new THREE.Vector3()).clone();
          let distance = pos.distanceTo(roomCenter);
          if(distance < _distance){
            _distance = distance;
            this.attachToRoom(room);
          }
        }
      }
    }
  }

  getGeometry(){
    let trigGeom = new THREE.BufferGeometry();
    let vertices = this.vertices.slice();

    try{
      let holes: THREE.Vec2[][] = [];
      // let faces: OdysseyFace3[] = [];
      let triangles = THREE.ShapeUtils.triangulateShape ( vertices, holes );
      trigGeom.setIndex(triangles.flat()); //Works with indices
      trigGeom.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices.map( (v: THREE.Vector3) => v.toArray() ).flat(), 3 ) ); //Works with indices
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

  Load( onLoad?: Function ){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utt'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.Merge(gff);
        this.InitProperties();
        this.LoadScripts()
        this.buildGeometry();
        this.initObjectsInside();
      }else{
        console.error('Failed to load ModuleTrigger template');
      }

    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      this.LoadScripts()
      this.buildGeometry();
      this.initObjectsInside();
    }
  }

  buildGeometry(){
    let trigGeom = this.getGeometry();

    let material = new THREE.MeshBasicMaterial({
      color: new THREE.Color( 0xFFFFFF ),
      side: THREE.DoubleSide
    });

    switch(this.getType()){
      case ModuleTriggerType.GENERIC:
        material.color.setHex(0xFF0000)
      break;
      case ModuleTriggerType.TRANSITION:
        material.color.setHex(0x00FF00)
      break;
      case ModuleTriggerType.TRAP:
        material.color.setHex(0xFFEB00)
      break;
    }

    this.mesh = new THREE.Mesh( trigGeom, material );
    this.mesh.position.copy(this.position);
    this.box.setFromObject(this.mesh);
    this.box.min.z -= 100;
    this.box.max.z += 100;
    //this.box = this.mesh.box;

    /*
     * Orientation values are wrong in savegames. If rotation is not set they are always placed correctly
     * // this.mesh.rotation.set(this.getXOrientation(), this.getYOrientation(), this.getZOrientation());
     */

    this.mesh.userData.moduleObject = this;
    this.mesh.visible = false;
    this.container.add(this.mesh);
    GameState.group.triggers.add(this.container);
  }

  //Some modules have exit triggers that are placed in the same location that the player spawns into
  //This is my way of keeping the player from immediately activating the trigger
  //They will be added to the objectsInside array without triggering the onEnter script
  //If they leave the trigger and then return it will then fire normally
  initObjectsInside(){
    //Check to see if this trigger is linked to another module
    if(this.linkedToModule && this.type == 1){
      //Check Party Members
      let partyLen = PartyManager.party.length;
      for(let i = 0; i < partyLen; i++){
        let partymember = PartyManager.party[i];
        if(this.box.containsPoint(partymember.position)){
          if(this.objectsInside.indexOf(partymember) == -1){
            this.objectsInside.push(partymember);

            partymember.lastTriggerEntered = this;
            this.lastObjectEntered = partymember;
          }
        }
      }
    }else{
      //Check Creatures
      let creatureLen = GameState.module.area.creatures.length;
      for(let i = 0; i < creatureLen; i++){
        let creature = GameState.module.area.creatures[i];
        if(this.box.containsPoint(creature.position)){
          if(this.objectsInside.indexOf(creature) == -1){
            this.objectsInside.push(creature);

            creature.lastTriggerEntered = this;
            this.lastObjectEntered = creature;
          }
        }
      }
    }
  }

  update(delta = 0){
    
    super.update(delta);
    
    if(!this.room) this.getCurrentRoom();
    try{
      if(!this.room.model.visible)
        return;
    }catch(e){}

    this.action = this.actionQueue[0];
    this.actionQueue.process( delta );

    /*
    let pos = GameState.player.getModel().position.clone();
    if(this.box.containsPoint(pos)){
      if(this.objectsInside.indexOf(GameState.player.getModel()) == -1){
        this.objectsInside.push(GameState.player.getModel());
        this.onEnter(GameState.player.getModel());
      }
    }else{
      if(this.objectsInside.indexOf(GameState.player.getModel()) <= 0){
        //this.onExit(GameState.player.getModel());
        this.objectsInside.splice(this.objectsInside.indexOf(GameState.player.getModel()), 1)
      }
    }
    */
    
    //Check Module Creatures
    let creatureLen = GameState.module.area.creatures.length;
    for(let i = 0; i < creatureLen; i++){
      let creature = GameState.module.area.creatures[i];
      let pos = creature.position.clone();
      if(this.box.containsPoint(pos)){
        if(this.objectsInside.indexOf(creature) == -1){
          this.objectsInside.push(creature);
          if(!this.triggered && this.isHostile(creature)){
            creature.lastTriggerEntered = this;
            this.lastObjectEntered = creature;

            this.onEnter(creature);
            this.triggered = true;
          }
        }
      }else{
        if(this.objectsInside.indexOf(creature) >= 0){
          this.objectsInside.splice(this.objectsInside.indexOf(creature), 1);
          if(!this.triggered && this.isHostile(creature)){
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
          if(!this.triggered && this.isHostile(partymember)){
            partymember.lastTriggerEntered = this;
            this.lastObjectEntered = partymember;

            this.onEnter(partymember);
            this.triggered = true;
          }
        }
      }else{
        if(this.objectsInside.indexOf(partymember) >= 0){
          this.objectsInside.splice(this.objectsInside.indexOf(partymember), 1);
          if(!this.triggered && this.isHostile(partymember)){
            partymember.lastTriggerExited = this;
            this.lastObjectExited = partymember;

            this.onExit(partymember);
          }
        }
      }
    }

    this.mesh.visible = ConfigClient.get('Game.debug.trigger_geometry_show') ? true : false;

  }

  onEnter(object?: ModuleObject){
    console.log('ModuleTrigger', this.getTag(), 'enter 2')
    if(this.linkedToModule && (GameState.Mode != EngineMode.DIALOG)){
      if(object == GameState.getCurrentPlayer()){
        GameState.LoadModule(this.linkedToModule.toLowerCase(), this.linkedTo.toLowerCase());
      }
    }else{
      console.log('ModuleTrigger', this.getTag(), 'enter 1')
      if(this.scripts.onEnter instanceof NWScriptInstance && this.scripts.onEnter.running != true){
        console.log('ModuleTrigger', this.getTag(), this.scripts.onEnter.name, 'enter running')
        this.scripts.onEnter.running = true;
        //let script = this.scripts.onEnter.clone();
        this.scripts.onEnter.debug.action = true;
        this.scripts.onEnter.enteringObject = object;
        this.scripts.onEnter.runAsync(this, 0).then( () => {
          this.scripts.onEnter.running = false;
        });
        //console.log('trigger', object, this);
      }
    }
  }

  onExit(object?: ModuleObject){
    if(this.scripts.onExit instanceof NWScriptInstance && this.scripts.onEnter.running != true){
      //this.scripts.onExit.running = true;
      this.scripts.onExit.exitingObject = object;
      /*this.scripts.onExit.runAsync(this, 0).then( () => {
        this.scripts.onExit.running = false;
      });*/
    }
  }

  LoadScripts(){

    this.scripts = {
      onClick: undefined,
      onDisarm: undefined,
      onTrapTriggered: undefined,
      onHeartbeat: undefined,
      onEnter: undefined,
      onExit: undefined,
      onUserDefined: undefined
    };

    if(this.template.RootNode.HasField('OnClick'))
      this.scripts.onClick = this.template.GetFieldByLabel('OnClick').GetValue();
    
    if(this.template.RootNode.HasField('OnDisarm'))
      this.scripts.onDisarm = this.template.GetFieldByLabel('OnDisarm').GetValue();

    if(this.template.RootNode.HasField('OnTrapTriggered'))
      this.scripts.onTrapTriggered = this.template.GetFieldByLabel('OnTrapTriggered').GetValue();

    if(this.template.RootNode.HasField('ScriptHeartbeat'))
      this.scripts.onHeartbeat = this.template.GetFieldByLabel('ScriptHeartbeat').GetValue();

    if(this.template.RootNode.HasField('ScriptOnEnter'))
      this.scripts.onEnter = this.template.GetFieldByLabel('ScriptOnEnter').GetValue();

    if(this.template.RootNode.HasField('ScriptOnExit'))
      this.scripts.onExit = this.template.GetFieldByLabel('ScriptOnExit').GetValue();
    
    if(this.template.RootNode.HasField('ScriptUserDefine'))
      this.scripts.onUserDefined = this.template.GetFieldByLabel('ScriptUserDefine').GetValue();

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
      }
      
      ModuleObject.List.set(this.id, this);
    }

    if(this.template.RootNode.HasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.GetFieldByLabel('AutoRemoveKey').GetValue();

    if(this.template.RootNode.HasField('Commandable'))
      this.commandable = this.template.GetFieldByLabel('Commandable').GetValue();

    if(this.template.RootNode.HasField('Cursor'))
      this.cursor = this.template.GetFieldByLabel('Cursor').GetValue();

    if(this.template.RootNode.HasField('Faction')){
      this.factionId = this.template.GetFieldByLabel('Faction').GetValue();
      if((this.factionId & 0xFFFFFFFF) == -1){
        this.factionId = 0;
      }
    }
    this.faction = FactionManager.factions.get(this.factionId);

    if(this.template.RootNode.HasField('Geometry')){
      this.geometry = this.template.GetFieldByLabel('Geometry').GetChildStructs();

      //Push verticies
      for(let i = 0; i < this.geometry.length; i++){
        let tgv = this.geometry[i];
        this.vertices[i] = new THREE.Vector3( 
          tgv.GetFieldByLabel('PointX').GetValue(),
          tgv.GetFieldByLabel('PointY').GetValue(),
          tgv.GetFieldByLabel('PointZ').GetValue()
        );
      }
    }

    if(this.template.RootNode.HasField('HighlightHeight'))
      this.highlightHeight = this.template.GetFieldByLabel('HighlightHeight').GetValue();

    if(this.template.RootNode.HasField('KeyName'))
      this.keyName = this.template.GetFieldByLabel('KeyName').GetValue();

    if(this.template.RootNode.HasField('LinkedTo'))
      this.linkedTo = this.template.GetFieldByLabel('LinkedTo').GetValue();

    if(this.template.RootNode.HasField('LinkedToFlags'))
      this.linkedToFlags = this.template.GetFieldByLabel('LinkedToFlags').GetValue();
  
    if(this.template.RootNode.HasField('LinkedToModule'))
      this.linkedToModule = this.template.RootNode.GetFieldByLabel('LinkedToModule').GetValue();
        
    if(this.template.RootNode.HasField('LoadScreenID'))
      this.loadScreenID = this.template.GetFieldByLabel('LoadScreenID').GetValue();

    if(this.template.RootNode.HasField('LocalizedName'))
      this.localizedName = this.template.GetFieldByLabel('LocalizedName').GetCExoLocString();

    if(this.template.RootNode.HasField('PortraidId'))
      this.portraidId = this.template.GetFieldByLabel('PortraidId').GetValue();

    if(this.template.RootNode.HasField('SetByPlayerParty'))
      this.setByPlayerParty = this.template.GetFieldByLabel('SetByPlayerParty').GetValue();

    if(this.template.RootNode.HasField('Tag'))
      this.tag = this.template.GetFieldByLabel('Tag').GetValue();

    if(this.template.RootNode.HasField('TemplateResRef'))
      this.templateResRef = this.template.GetFieldByLabel('TemplateResRef').GetValue();

    if(this.template.RootNode.HasField('TransitionDestin'))
      this.transitionDestin = this.template.GetFieldByLabel('TransitionDestin').GetCExoLocString();

    if(this.template.RootNode.HasField('TrapDetectable'))
      this.trapDetectable = this.template.RootNode.GetFieldByLabel('TrapDetectable').GetValue();

    if(this.template.RootNode.HasField('TrapDisarmable'))
      this.trapDisarmable = this.template.RootNode.GetFieldByLabel('TrapDisarmable').GetValue();

    if(this.template.RootNode.HasField('TrapOneShot'))
      this.trapOneShot = this.template.GetFieldByLabel('TrapOneShot').GetValue();

    if(this.template.RootNode.HasField('TrapType'))
      this.trapType = this.template.GetFieldByLabel('TrapType').GetValue();

    if(this.template.RootNode.HasField('Type'))
      this.type = this.template.GetFieldByLabel('Type').GetValue();

    if(this.template.RootNode.HasField('XPosition'))
      this.position.x = this.template.RootNode.GetFieldByLabel('XPosition').GetValue();

    if(this.template.RootNode.HasField('YPosition'))
      this.position.y = this.template.RootNode.GetFieldByLabel('YPosition').GetValue();

    if(this.template.RootNode.HasField('ZPosition'))
      this.position.z = this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();

    if(this.template.RootNode.HasField('XOrientation'))
      this.xOrientation = this.template.RootNode.GetFieldByLabel('XOrientation').GetValue();

    if(this.template.RootNode.HasField('YOrientation'))
      this.yOrientation = this.template.RootNode.GetFieldByLabel('YOrientation').GetValue();

    if(this.template.RootNode.HasField('ZOrientation'))
      this.zOrientation = this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue();

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
    
    this.initialized = true;

  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTT ';

    let actionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ActionList') );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') ).SetValue(this.autoRemoveKey);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Commandable') ).SetValue( this.commandable );
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'CreatorId') ).SetValue(2130706432);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Cursor') ).SetValue(this.cursor);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Faction') ).SetValue(this.faction ? this.faction.id : this.factionId);

    let geometry = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'Geometry') );
    for(let i = 0; i < this.vertices.length; i++){
      let vertStruct = new GFFStruct();
      vertStruct.AddField( new GFFField(GFFDataType.FLOAT, 'PointX') ).SetValue(this.vertices[i].x);
      vertStruct.AddField( new GFFField(GFFDataType.FLOAT, 'PointY') ).SetValue(this.vertices[i].y);
      vertStruct.AddField( new GFFField(GFFDataType.FLOAT, 'PointZ') ).SetValue(this.vertices[i].z);
      geometry.AddChildStruct(vertStruct);
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'HighlightHeight') ).SetValue(this.highlightHeight);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') ).SetValue(this.keyName);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo') ).SetValue(this.linkedTo);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'LinkedToFlags') ).SetValue(this.linkedToFlags);
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'LinkedToModule') ).SetValue(this.linkedToModule);
    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'LoadscreenID') ).SetValue(this.loadScreenID);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') ).SetValue(this.locName);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);

    //Scripts
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnClick') ).SetValue(this.scripts.onClick ? this.scripts.onClick.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDisarm') ).SetValue(this.scripts.onDisarm ? this.scripts.onDisarm.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnTrapTriggered') ).SetValue(this.scripts.onTrapTriggered ? this.scripts.onTrapTriggered.name : '');
    
    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'PortraitId') ).SetValue(this.portraidId);

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    //Scripts
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') ).SetValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptOnEnter') ).SetValue(this.scripts.onEnter ? this.scripts.onEnter.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptOnExit') ).SetValue(this.scripts.onExit ? this.scripts.onExit.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') ).SetValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');

    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'SetByPartyPlayer') ).SetValue(this.setByPlayerParty);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'TransitionDestin') ).SetValue(this.transitionDestin);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapDetectDC') ).SetValue(this.trapDetectDC);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapDetectable') ).SetValue(this.trapDetectable);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapDisarmable') ).SetValue(this.trapDisarmable);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapFlag') ).SetValue(this.trapFlag);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapOneShot') ).SetValue(this.trapOneShot);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapType') ).SetValue(this.trapType);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Type') ).SetValue(this.type);
    gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).SetValue(this.template.RootNode.GetFieldByLabel('XOrientation').GetValue());
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).SetValue(this.position.x);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).SetValue(this.template.RootNode.GetFieldByLabel('YOrientation').GetValue());
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).SetValue(this.position.y);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).SetValue(this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue());
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).SetValue(this.position.z);

    this.template = gff;
    return gff;
  }

  toToolsetInstance(){
    let instance = new GFFStruct(1);

    let geometryField = new GFFField(GFFDataType.LIST, 'Geometry');
    for(let i = 0, len = this.vertices.length; i < len; i++){
      let vertStruct = new GFFStruct(14);
      vertStruct.AddField( new GFFField(GFFDataType.FLOAT, 'PointX') ).SetValue(this.vertices[i].x);
      vertStruct.AddField( new GFFField(GFFDataType.FLOAT, 'PointY') ).SetValue(this.vertices[i].y);
      vertStruct.AddField( new GFFField(GFFDataType.FLOAT, 'PointZ') ).SetValue(this.vertices[i].z);
      geometryField.AddChildStruct(vertStruct);
    }
    instance.AddField(geometryField);
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XOrientation', this.xOrientation)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XPosition', this.position.x)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YOrientation', this.yOrientation)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YPosition', this.position.y)
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'ZOrientation', this.zOrientation)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;
  }

}
