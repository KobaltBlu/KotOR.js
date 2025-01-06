import { ModuleObject } from "./ModuleObject";
import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { OdysseyModel3D, OdysseyObject3D } from "../three/odyssey";
import { GameState } from "../GameState";
import { ResourceTypes } from "../resource/ResourceTypes";
// import { ModuleObjectManager, PartyManager, FactionManager } from "../managers";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { NWScript } from "../nwscript/NWScript";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFStruct } from "../resource/GFFStruct";
import { ModuleTriggerType } from "../enums/module/ModuleTriggerType";
import { ConfigClient } from "../utility/ConfigClient";
import { MDLLoader, ResourceLoader } from "../loaders";
import { EngineMode } from "../enums/engine/EngineMode";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleDoorAnimState, SignalEventType } from "../enums";

/**
* ModuleTrigger class.
* 
* Class representing a trigger object found in modules areas.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleTrigger.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleTrigger extends ModuleObject {
  objectsInsideIdx: number;
  lastObjectEntered: ModuleObject;
  lastObjectExited: ModuleObject;
  triggered: boolean;

  trapModel: OdysseyModel3D;
  trapAnimationState: ModuleDoorAnimState = ModuleDoorAnimState.DEFAULT;
  trapName: string = '';

  reticleNode: OdysseyObject3D = new OdysseyObject3D();
  trapModelResRef: string;
  trapExplosionSound: string;
  trapTriggered: boolean;
  trapResRef: string;
  trapDetected: boolean = false;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= ModuleObjectType.ModuleTrigger;

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
    this.highlightHeight = 0.10000000149011612;
    this.initProperties();

    this.container.add(this.reticleNode);
    this.reticleNode.position.z = this.highlightHeight;

  }

  getReticleNode(){
    return this.reticleNode;
  }

  getName(){
    if(this.type == ModuleTriggerType.TRAP){
      return this.trapName;
    }
    return '';
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

  load( onLoad?: Function ){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utt'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        this.loadScripts()
        this.buildGeometry();
        this.initObjectsInside();
        this.loadTrap();
      }else{
        console.error('Failed to load ModuleTrigger template');
        if(this.template instanceof GFFObject){
          this.initProperties();
          this.loadScripts();
          this.buildGeometry();
          this.initObjectsInside();
          this.loadTrap();
        }
      }

    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      this.loadScripts()
      this.buildGeometry();
      this.initObjectsInside();
      this.loadTrap();
    }
  }

  loadTrap(){
    if(this.type == 2 && this.trapModelResRef && this.trapModelResRef != '***'){
      MDLLoader.loader.load(this.trapModelResRef).then( (trapMDL) => {
        OdysseyModel3D.FromMDL(trapMDL, {
          context: this.context,
          castShadow: false,
          receiveShadow: false,
          mergeStatic: false
        }).then( (model: OdysseyModel3D) => {
          this.trapModel = model;
          this.container.add(model);
          if(this.trapDetected){
            this.model.playAnimation('detect', false);
          }else{
            this.model.playAnimation('default', false);
          }
        });
      });
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

  detectTrap(){
    if(this.trapDetected){ return; }
    this.trapDetected = true;

    if(this.trapDetected){
      this.model.playAnimation('detect', false);
    }else{
      this.model.playAnimation('default', false);
    }
  }

  //Some modules have exit triggers that are placed in the same location that the player spawns into
  //This is my way of keeping the player from immediately activating the trigger
  //They will be added to the objectsInside array without triggering the onEnter script
  //If they leave the trigger and then return it will then fire normally
  initObjectsInside(){
    //Check to see if this trigger is linked to another module
    if(this.linkedToModule && this.type == 1){
      //Check Party Members
      let partyLen = GameState.PartyManager.party.length;
      for(let i = 0; i < partyLen; i++){
        let partymember = GameState.PartyManager.party[i];
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

  isUseable(): boolean {
    return this.type == ModuleTriggerType.TRAP;
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

    if(this.trapModel){
      this.trapModel.update(delta);
      if(this.trapDetected && this.trapModel.animationManager.currentAnimation?.name != 'detect'){
        this.trapModel.playAnimation('detect', false);
      }else if(!this.trapDetected && this.trapModel.animationManager.currentAnimation?.name != 'default'){
        this.trapModel.playAnimation('default', false);
      }
    }

    /*
    let pos = GameState.PartyManager.Player.getModel().position.clone();
    if(this.box.containsPoint(pos)){
      if(this.objectsInside.indexOf(GameState.PartyManager.Player.getModel()) == -1){
        this.objectsInside.push(GameState.PartyManager.Player.getModel());
        this.onEnter(GameState.PartyManager.Player.getModel());
      }
    }else{
      if(this.objectsInside.indexOf(GameState.PartyManager.Player.getModel()) <= 0){
        //this.onExit(GameState.PartyManager.Player.getModel());
        this.objectsInside.splice(this.objectsInside.indexOf(GameState.PartyManager.Player.getModel()), 1)
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
    let partyLen = GameState.PartyManager.party.length;
    for(let i = 0; i < partyLen; i++){
      let partymember = GameState.PartyManager.party[i];
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

    if(this.mesh){
      this.mesh.visible = ConfigClient.get('Game.debug.trigger_geometry_show') ? true : false;
    }
  }

  onEnter(object?: ModuleObject){
    console.log('ModuleTrigger.onEnter', this.type,  this.getTag());
    if(this.type == ModuleTriggerType.TRAP && !this.trapTriggered){
      if(object.isHostile(this)){
        this.trapTriggered = true;
        console.log('ModuleTrigger.onEnter', 'Trap Triggered')
        const event = new GameState.GameEventFactory.EventSignalEvent();
        event.setCaller(object);
        event.setObject(this);
        event.setDay(GameState.module.timeManager.pauseDay);
        event.setTime(GameState.module.timeManager.pauseTime);
        event.eventType = SignalEventType.OnTrapTriggered;
        GameState.module.addEvent(event);
      }
    }else if(this.linkedToModule && (GameState.Mode != EngineMode.DIALOG)){
      if(object == GameState.getCurrentPlayer()){
        GameState.LoadModule(this.linkedToModule.toLowerCase(), this.linkedTo.toLowerCase());
      }
      return;
    }

    console.log('ModuleTrigger', this.getTag(), 'enter 1')
    const event = new GameState.GameEventFactory.EventSignalEvent();
    event.setCaller(object);
    event.setObject(this);
    event.setDay(GameState.module.timeManager.pauseDay);
    event.setTime(GameState.module.timeManager.pauseTime);
    event.eventType = SignalEventType.OnObjectEnter;
    GameState.module.addEvent(event);
  }

  onExit(object?: ModuleObject){
    console.log('ModuleTrigger', this.getTag(), 'exit')
    const event = new GameState.GameEventFactory.EventSignalEvent();
    event.setCaller(object);
    event.setObject(this);
    event.setDay(GameState.module.timeManager.pauseDay);
    event.setTime(GameState.module.timeManager.pauseTime);
    event.eventType = SignalEventType.OnObjectExit;
    GameState.module.addEvent(event);
  }

  loadScripts(){

    this.scripts = {
      onClick: undefined,
      onDisarm: undefined,
      onTrapTriggered: undefined,
      onHeartbeat: undefined,
      onEnter: undefined,
      onExit: undefined,
      onUserDefined: undefined
    };

    if(this.template.RootNode.hasField('OnClick'))
      this.scripts.onClick = this.template.getFieldByLabel('OnClick').getValue();
    
    if(this.template.RootNode.hasField('OnDisarm'))
      this.scripts.onDisarm = this.template.getFieldByLabel('OnDisarm').getValue();

    if(this.template.RootNode.hasField('OnTrapTriggered'))
      this.scripts.onTrapTriggered = this.template.getFieldByLabel('OnTrapTriggered').getValue();

    if(this.template.RootNode.hasField('ScriptHeartbeat'))
      this.scripts.onHeartbeat = this.template.getFieldByLabel('ScriptHeartbeat').getValue();

    if(this.template.RootNode.hasField('ScriptOnEnter'))
      this.scripts.onEnter = this.template.getFieldByLabel('ScriptOnEnter').getValue();

    if(this.template.RootNode.hasField('ScriptOnExit'))
      this.scripts.onExit = this.template.getFieldByLabel('ScriptOnExit').getValue();
    
    if(this.template.RootNode.hasField('ScriptUserDefine'))
      this.scripts.onUserDefined = this.template.getFieldByLabel('ScriptUserDefine').getValue();

    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
        this.scripts[key].caller = this;
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
    }

    if(this.template.RootNode.hasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.getFieldByLabel('AutoRemoveKey').getValue();

    if(this.template.RootNode.hasField('Commandable'))
      this.commandable = this.template.getFieldByLabel('Commandable').getValue();

    if(this.template.RootNode.hasField('Cursor'))
      this.cursor = this.template.getFieldByLabel('Cursor').getValue();

    if(this.template.RootNode.hasField('Faction')){
      this.factionId = this.template.getFieldByLabel('Faction').getValue();
      if((this.factionId & 0xFFFFFFFF) == -1){
        this.factionId = 0;
      }
    }
    this.faction = GameState.FactionManager.factions.get(this.factionId);

    if(this.template.RootNode.hasField('Geometry')){
      this.geometry = this.template.getFieldByLabel('Geometry').getChildStructs();

      //Push verticies
      for(let i = 0; i < this.geometry.length; i++){
        let tgv = this.geometry[i];
        this.vertices[i] = new THREE.Vector3( 
          tgv.getFieldByLabel('PointX').getValue(),
          tgv.getFieldByLabel('PointY').getValue(),
          tgv.getFieldByLabel('PointZ').getValue()
        );
      }
    }

    if(this.template.RootNode.hasField('HighlightHeight'))
      this.highlightHeight = this.template.getFieldByLabel('HighlightHeight').getValue();

    if(this.template.RootNode.hasField('KeyName'))
      this.keyName = this.template.getFieldByLabel('KeyName').getValue();

    if(this.template.RootNode.hasField('LinkedTo'))
      this.linkedTo = this.template.getFieldByLabel('LinkedTo').getValue();

    if(this.template.RootNode.hasField('LinkedToFlags'))
      this.linkedToFlags = this.template.getFieldByLabel('LinkedToFlags').getValue();
  
    if(this.template.RootNode.hasField('LinkedToModule'))
      this.linkedToModule = this.template.RootNode.getFieldByLabel('LinkedToModule').getValue();
        
    if(this.template.RootNode.hasField('LoadScreenID'))
      this.loadScreenID = this.template.getFieldByLabel('LoadScreenID').getValue();

    if(this.template.RootNode.hasField('LocalizedName'))
      this.localizedName = this.template.getFieldByLabel('LocalizedName').getCExoLocString();

    if(this.template.RootNode.hasField('PortraidId'))
      this.portraidId = this.template.getFieldByLabel('PortraidId').getValue();

    if(this.template.RootNode.hasField('SetByPlayerParty'))
      this.setByPlayerParty = this.template.getFieldByLabel('SetByPlayerParty').getValue();

    if(this.setByPlayerParty){
      this.trapFlag = this.setByPlayerParty;
    }

    if(this.template.RootNode.hasField('Tag'))
      this.tag = this.template.getFieldByLabel('Tag').getValue();

    if(this.template.RootNode.hasField('TemplateResRef'))
      this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();

    if(this.template.RootNode.hasField('TransitionDestin'))
      this.transitionDestin = this.template.getFieldByLabel('TransitionDestin').getCExoLocString();

    if(this.template.RootNode.hasField('TrapDetectable'))
      this.trapDetectable = this.template.RootNode.getFieldByLabel('TrapDetectable').getValue();

    if(this.template.RootNode.hasField('TrapDisarmable'))
      this.trapDisarmable = this.template.RootNode.getFieldByLabel('TrapDisarmable').getValue();

    if(this.template.RootNode.hasField('TrapOneShot'))
      this.trapOneShot = this.template.getFieldByLabel('TrapOneShot').getValue();

    if(this.template.RootNode.hasField('TrapDetectDC'))
      this.trapDetectDC = this.template.getFieldByLabel('TrapDetectDC').getValue();

    if(this.template.RootNode.hasField('TrapFlag'))
      this.trapFlag = this.template.getFieldByLabel('TrapFlag').getValue();

    if(this.template.RootNode.hasField('TrapType'))
      this.trapType = this.template.getFieldByLabel('TrapType').getValue();

    if(this.template.RootNode.hasField('Type'))
      this.type = this.template.getFieldByLabel('Type').getValue();

    if(this.template.RootNode.hasField('XPosition'))
      this.position.x = this.template.RootNode.getFieldByLabel('XPosition').getValue();

    if(this.template.RootNode.hasField('YPosition'))
      this.position.y = this.template.RootNode.getFieldByLabel('YPosition').getValue();

    if(this.template.RootNode.hasField('ZPosition'))
      this.position.z = this.template.RootNode.getFieldByLabel('ZPosition').getValue();

    if(this.template.RootNode.hasField('XOrientation'))
      this.xOrientation = this.template.RootNode.getFieldByLabel('XOrientation').getValue();

    if(this.template.RootNode.hasField('YOrientation'))
      this.yOrientation = this.template.RootNode.getFieldByLabel('YOrientation').getValue();

    if(this.template.RootNode.hasField('ZOrientation'))
      this.zOrientation = this.template.RootNode.getFieldByLabel('ZOrientation').getValue();

    if(this.template.RootNode.hasField('SWVarTable')){
      let localBools = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
      //console.log(localBools);
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].getFieldByLabel('Variable').getValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }
    
    this.initialized = true;

    if(this.type == ModuleTriggerType.TRAP){
      const trap = GameState.TwoDAManager.datatables.get('traps')?.rows[this.trapType];
      if(trap){
        this.trapName = GameState.TLKManager.GetStringById(trap.name).Value;
        this.trapModelResRef = trap.model;
        this.trapExplosionSound = trap.explosionsound;
        this.trapResRef = trap.resref;
      }
    }

  }

  destroy(): void {
    super.destroy();

    if(this.trapModel){
      this.trapModel.removeFromParent();
      this.trapModel.dispose();
    }

    if(this.area) this.area.detachObject(this);
  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTT ';

    let actionList = gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') ).setValue(this.autoRemoveKey);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue( this.commandable );
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'CreatorId') ).setValue(2130706432);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Cursor') ).setValue(this.cursor);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Faction') ).setValue(this.faction ? this.faction.id : this.factionId);

    let geometry = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'Geometry') );
    for(let i = 0; i < this.vertices.length; i++){
      let vertStruct = new GFFStruct();
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'PointX') ).setValue(this.vertices[i].x);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'PointY') ).setValue(this.vertices[i].y);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'PointZ') ).setValue(this.vertices[i].z);
      geometry.addChildStruct(vertStruct);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'HighlightHeight') ).setValue(this.highlightHeight);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') ).setValue(this.keyName);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo') ).setValue(this.linkedTo);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'LinkedToFlags') ).setValue(this.linkedToFlags);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'LinkedToModule') ).setValue(this.linkedToModule);
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'LoadscreenID') ).setValue(this.loadScreenID);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') ).setValue(this.locName);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);

    //Scripts
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnClick') ).setValue(this.scripts.onClick ? this.scripts.onClick.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDisarm') ).setValue(this.scripts.onDisarm ? this.scripts.onDisarm.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnTrapTriggered') ).setValue(this.scripts.onTrapTriggered ? this.scripts.onTrapTriggered.name : '');
    
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') ).setValue(this.portraidId);

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    //Scripts
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptHeartbeat') ).setValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnEnter') ).setValue(this.scripts.onEnter ? this.scripts.onEnter.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptOnExit') ).setValue(this.scripts.onExit ? this.scripts.onExit.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'ScriptUserDefine') ).setValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'SetByPartyPlayer') ).setValue(this.setByPlayerParty);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'TransitionDestin') ).setValue(this.transitionDestin);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDetectDC') ).setValue(this.trapDetectDC);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDetectable') ).setValue(this.trapDetectable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDisarmable') ).setValue(this.trapDisarmable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapFlag') ).setValue(this.trapFlag);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapOneShot') ).setValue(this.trapOneShot);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapType') ).setValue(this.trapType);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Type') ).setValue(this.type);
    gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue(this.template.RootNode.getFieldByLabel('XOrientation').getValue());
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue(this.template.RootNode.getFieldByLabel('YOrientation').getValue());
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue(this.template.RootNode.getFieldByLabel('ZOrientation').getValue());
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }

  toToolsetInstance(){
    let instance = new GFFStruct(1);

    let geometryField = new GFFField(GFFDataType.LIST, 'Geometry');
    for(let i = 0, len = this.vertices.length; i < len; i++){
      let vertStruct = new GFFStruct(14);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'PointX') ).setValue(this.vertices[i].x);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'PointY') ).setValue(this.vertices[i].y);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'PointZ') ).setValue(this.vertices[i].z);
      geometryField.addChildStruct(vertStruct);
    }
    instance.addField(geometryField);
    
    instance.addField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'XOrientation', this.xOrientation)
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'XPosition', this.position.x)
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'YOrientation', this.yOrientation)
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'YPosition', this.position.y)
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'ZOrientation', this.zOrientation)
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;
  }

}
