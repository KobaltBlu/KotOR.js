/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleTrigger class.
 */

class ModuleTrigger extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super(gff);

    this.template = gff;
    this.objectsInside = [];
    this.objectsInsideIdx = 0;
    this.lastObjectEntered = null;
    this.lastObjectExited = null;

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
  
  getXPosition(){
    return this.position.x;
  }

  getYPosition(){
    return this.position.y;
  }

  getZPosition(){
    return this.position.z;
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
    this.room = undefined;
    let _distance = 1000000000;
    for(let i = 0; i < Game.module.area.rooms.length; i++){
      let room = Game.module.area.rooms[i];
      let model = room.model;
      if(model instanceof THREE.AuroraModel){
        let pos = this.position.clone();
        if(model.box.containsPoint(pos)){
          let roomCenter = model.box.getCenter(new THREE.Vector3()).clone();
          let distance = pos.distanceTo(roomCenter);
          if(distance < _distance){
            _distance = distance;
            this.room = room;
          }
        }
      }
    }
  }

  getGeometry(){
    var trigGeom = new THREE.Geometry();
    trigGeom.vertices = this.vertices.slice();

    try{
      let holes = [];
      let triangles = THREE.ShapeUtils.triangulateShape ( trigGeom.vertices, holes );
      for( var i = 0; i < triangles.length; i++ ){
        trigGeom.faces.push( new THREE.Face3( triangles[i][0], triangles[i][1], triangles[i][2] ));
      }
    }catch(e){
      console.error('ModuleTrigger', 'Failed to generate faces', {
        trigger: this,
        error: e
      })
    }

    trigGeom.computeFaceNormals();
    trigGeom.computeVertexNormals();
    trigGeom.computeBoundingSphere();

    return trigGeom;
  }

  Load( onLoad = null ){
    if(this.getTemplateResRef()){
      //Load template and merge fields

      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: UTTObject.ResType,
        onLoad: (gff) => {

          this.template.Merge(gff);
          this.InitProperties();
          this.LoadScripts( () => {
            this.buildGeometry();
            this.initObjectsInside();
            if(onLoad != null)
              onLoad(this.template);
          });
          
        },
        onFail: () => {
          console.error('Failed to load trigger template');
        }
      });

    }else{
      //We already have the template (From SAVEGAME)
      //console.log('Trigger savegame')
      try{
        this.InitProperties();
        this.LoadScripts( () => {
          try{
            this.buildGeometry();
            this.initObjectsInside();
            if(onLoad != null)
              onLoad(this.template);
          }catch(e){
            if(onLoad != null)
              onLoad(this.template);
          }
        });
      }catch(e){
        if(onLoad != null)
          onLoad(this.template);
      }

    }
  }

  buildGeometry(){
    var trigGeom = this.getGeometry();

    let material = new THREE.MeshBasicMaterial({
      color: new THREE.Color( 0xFFFFFF ),
      side: THREE.DoubleSide
    });

    switch(this.getType()){
      case UTTObject.Type.GENERIC:
        material.color.setHex(0xFF0000)
      break;
      case UTTObject.Type.TRANSITION:
        material.color.setHex(0x00FF00)
      break;
      case UTTObject.Type.TRAP:
        material.color.setHex(0xFFEB00)
      break;
    }

    this.mesh = new THREE.Mesh( trigGeom, material );
    this.mesh.position.set(this.getXPosition(), this.getYPosition(), this.getZPosition());
    if(!this.mesh.box){
      this.mesh.box = new THREE.Box3();
    }
    this.mesh.box.min.z -= 100;
    this.mesh.box.max.z += 100;
    this.box = this.mesh.box;

    /*
     * Orientation values are wrong in savegames. If rotation is not set they are always placed correctly
     * // this.mesh.rotation.set(this.getXOrientation(), this.getYOrientation(), this.getZOrientation());
     */

    this.mesh.moduleObject = this;
    this.mesh.visible = false;
    Game.group.triggers.add(this.mesh);
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
      let creatureLen = Game.module.area.creatures.length;
      for(let i = 0; i < creatureLen; i++){
        let creature = Game.module.area.creatures[i];
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
    
    this.getCurrentRoom();
    try{
      if(!this.room.model.visible)
        return;
    }catch(e){}

    this.action = this.actionQueue[0];

    if(this.action != null){
            
      /*if(this.action.object instanceof ModuleObject){
        
      }else{*/
        switch(this.action.goal){
          case ModuleCreature.ACTION.DIALOGOBJECT:
            Game.InGameDialog.StartConversation(this.action.conversation, this.action.object, this);
            this.actionQueue.shift()
          break;
          case ModuleCreature.ACTION.WAIT:
            this.action.elapsed += delta;
            if(this.action.elapsed > this.action.time){
              this.actionQueue.shift()
            }
          break;
          case ModuleCreature.ACTION.SCRIPT: //run a code block of an NWScriptInstance file
            //console.log('Action Script', this.action);
            if(this.action.script instanceof NWScriptInstance){
              this.action.action.script.caller = this;
              this.action.action.script.beginLoop({
                _instr: null, 
                index: -1, 
                seek: this.action.action.offset, 
                onComplete: () => {
                  //console.log('ACTION.SCRIPT', 'Complete');
                }
              });
            }
            this.actionQueue.shift();
          break;
        }
      //}

    } else {
      
    }

    /*
    let pos = Game.player.getModel().position.clone();
    if(this.box.containsPoint(pos)){
      if(this.objectsInside.indexOf(Game.player.getModel()) == -1){
        this.objectsInside.push(Game.player.getModel());
        this.onEnter(Game.player.getModel());
      }
    }else{
      if(this.objectsInside.indexOf(Game.player.getModel()) <= 0){
        //this.onExit(Game.player.getModel());
        this.objectsInside.splice(this.objectsInside.indexOf(Game.player.getModel()), 1)
      }
    }
    */
    
    //Check Module Creatures
    let creatureLen = Game.module.area.creatures.length;
    for(let i = 0; i < creatureLen; i++){
      let creature = Game.module.area.creatures[i];
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
  }

  onEnter(object = undefined){
    console.log('enter 2')
    if(this.linkedToModule && !Game.inDialog){
      if(object == Game.getCurrentPlayer()){
        Game.LoadModule(this.linkedToModule.toLowerCase(), this.linkedTo.toLowerCase(), () => { 
          //console.log('Module Lded', this.getLinkedToModule().toLowerCase());
        });
      }
    }else{
      console.log('enter 1')
      if(this.scripts.onEnter instanceof NWScriptInstance && this.scripts.onEnter.running != true){
        console.log('enter running')
        this.scripts.onEnter.running = true;
        //let script = this.scripts.onEnter.clone();
        this.scripts.onEnter.debug.action = true;
        this.scripts.onEnter.enteringObject = object;
        this.scripts.onEnter.run(this, 0, () => {
          this.scripts.onEnter.running = false;
        });
        //console.log('trigger', object, this);
      }
    }
  }

  onExit(object = undefined){
    if(this.scripts.onExit instanceof NWScriptInstance && this.scripts.onEnter.onExit != true){
      //this.scripts.onExit.running = true;
      this.scripts.onExit.exitingObject = object;
      /*this.scripts.onExit.run(this, 0, () => {
        this.scripts.onExit.running = false;
      });*/
    }
  }

  LoadScripts( onLoad = null ){

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
    let loop = new AsyncLoop({
      array: keys,
      onLoop: async (key, asyncLoop) => {
        let _script = this.scripts[key];
        if(_script != '' && !(_script instanceof NWScriptInstance)){
          //let script = await NWScript.Load(_script);
          this.scripts[key] = await NWScript.Load(_script);
          //this.scripts[key].name = _script;
          asyncLoop._Loop();
        }else{
          asyncLoop._Loop();
        }
      }
    });
    loop.Begin(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  InitProperties(){
    
    if(this.template.RootNode.HasField('ObjectId'))
      this.id = this.template.GetFieldByLabel('ObjectId').GetValue();

    if(this.template.RootNode.HasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.GetFieldByLabel('AutoRemoveKey').GetValue();

    if(this.template.RootNode.HasField('Commandable'))
      this.commandable = this.template.GetFieldByLabel('Commandable').GetValue();

    if(this.template.RootNode.HasField('Cursor'))
      this.cursor = this.template.GetFieldByLabel('Cursor').GetValue();

    if(this.template.RootNode.HasField('Faction')){
      this.faction = this.template.GetFieldByLabel('Faction').GetValue();
      if((this.faction & 0xFFFFFFFF) == -1){
        this.faction = 0;
      }
    }

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
      this.transitionDestin = this.template.GetFieldByLabel('TransitionDestin').GetValue();

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
      this.xPosition = this.position.x = this.template.RootNode.GetFieldByLabel('XPosition').GetValue();

    if(this.template.RootNode.HasField('YPosition'))
      this.yPosition = this.position.y = this.template.RootNode.GetFieldByLabel('YPosition').GetValue();

    if(this.template.RootNode.HasField('ZPosition'))
      this.zPosition = this.position.z = this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();

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

  }

  //this.vertices

  toToolsetInstance(){
    let instance = new Struct(1);

    let geometryField = new Field(GFFDataTypes.LIST, 'Geometry');
    for(let i = 0, len = this.vertices.length; i < len; i++){
      let vertStruct = new Struct(14);
      vertStruct.AddField( new Field(GFFDataTypes.FLOAT, 'PointX') ).SetValue(this.vertices[i].x);
      vertStruct.AddField( new Field(GFFDataTypes.FLOAT, 'PointY') ).SetValue(this.vertices[i].y);
      vertStruct.AddField( new Field(GFFDataTypes.FLOAT, 'PointZ') ).SetValue(this.vertices[i].z);
      geometryField.AddChildStruct(vertStruct);
    }
    instance.AddField(geometryField);
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XOrientation', this.xOrientation)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XPosition', this.position.x)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YOrientation', this.yOrientation)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YPosition', this.position.y)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'ZOrientation', this.zOrientation)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;
  }

}

module.exports = ModuleTrigger;
