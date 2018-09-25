/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleObject class.
 */

class ModuleObject {

  constructor () {

    this.id = ModuleObject.COUNT++;

    //this.moduleObject = null;
    this.AxisFront = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.force = 0;
    this.invalidateCollision = false;
    this.room = undefined;
    this.model = null;
    this.template = undefined;
    this.inventory = [];
    this.scripts = {
      onAttacked: undefined,
      onDamaged: undefined,
      onDeath: undefined,
      onDialog: undefined,
      onDisturbed: undefined,
      onEndDialog: undefined,
      onEndRound: undefined,
      onHeartbeat: undefined,
      onBlocked: undefined,
      onNotice: undefined,
      onRested: undefined,
      onSpawn: undefined,
      onSpellAt: undefined,
      onUserDefined: undefined
    };

    this.tag = '';
    this.templateResRef = '';

    this.xPosition = 0;
    this.yPosition = 0;
    this.zPosition = 0;
    this.xOrientation = 0;
    this.yOrientation = 0;
    this.zOrientation = 0;
    this.bearing = 0;

    this.hp = 0;
    this.currentHP = 0;

    this.actionQueue = [];
    this.effects = [];

    this._locals = {
      Booleans: [],
      Numbers: {}
    };

    this.objectsInside = [];

    this.context = Game;
    this.heartbeatTimer = null;
    this._heartbeatTimerOffset = Math.floor(Math.random() * 600) + 100;
    this._heartbeatTimeout = Game.HeartbeatTimer + this._heartbeatTimerOffset;
    //this._heartbeat();

    //Combat Info
    this._lastAttackObject = undefined;
    this._lastAttackAction = -1;
    this._lastForcePowerUsed = -1;
    this._lastForcePowerSuccess = 0;

  }

  _heartbeat(){
    this.heartbeatTimer = setTimeout( () => {
      process.nextTick( ()=> {
        this._heartbeat();
      });
      if(Game.module){
        try{
          this.triggerHeartbeat();
        }catch(e){}
      }
    }, Game.HeartbeatTimer + this._heartbeatTimerOffset);
  }

  setContext(ctx = Game){
    this.context = ctx;
  }

  //Reload the template
  Invalidate(){



  }

  getModel(){
    if(this.model instanceof THREE.Object3D)
      return this.model;
    else
      return this.model = new THREE.Object3D()
  }

  update(delta = 0){
    
    //Process the heartbeat timer
    if(this._heartbeatTimeout <= 0){
      if(Game.module){
        this.triggerHeartbeat();
      }
      this._heartbeatTimeout = Game.HeartbeatTimer + this._heartbeatTimerOffset;
    }else{
      this._heartbeatTimeout -= 1000*delta;
    }

  }

  onHover(){
    
  }

  onClick(){

  }

  triggerUserDefinedEvent(caller = this, iValue = 0, onComplete = null ){

    switch(iValue){
      case 50://I think this is onDialogue ??? wish I could find a list of the main event numbers :/
        this.actionQueue.push({
          object: caller,
          conversation: caller.GetConversation(),
          ignoreStartRange: false,
          goal: ModuleCreature.ACTION.DIALOGOBJECT
        });
      break;
    }

    if(this.scripts.onUserDefined instanceof NWScript){
      this.scripts.onUserDefined.run(this, parseInt(iValue), onComplete);
    }
  }

  triggerHeartbeat(){
    if(this.scripts.onHeartbeat instanceof NWScript){
      if(PartyManager.party.indexOf(this) > -1){
        this.scripts.onHeartbeat.run(this, 2001);
      }else{
        this.scripts.onHeartbeat.run(this, 1001);
      }
    }
  }

  addItem(template = new GFFObject(), onLoad = null){
    let item = undefined;
    if(template instanceof GFFObject){
      item = new ModuleItem(template);
    }else if(template instanceof ModuleItem){
      item = template;
    }

    if(item instanceof ModuleItem){
      item.Load( () => {
        //console.log('LOADED')
        let hasItem = this.getItem(item.getTag());
        if(hasItem){
          hasItem.setStackSize(hasItem.getStackSize() + 1);
          if(typeof onLoad === 'function')
            onLoad(hasItem);
        }else{
          this.inventory.push(item);
          if(typeof onLoad === 'function')
            onLoad(item);
        }
      });
    }else{
      throw 'You can only add an item of type ModuleItem to an inventory';
    }
  }

  removeItem(resRef = '', nCount = 1){
    let item = this.getItem(resRef);
    let idx = this.inventory.indexOf(item);
    if(item){
      if(nCount < item.getStackSize()){
        item.setStackSize(item.getStackSize() - nCount);
      }else{
        this.inventory.splice(idx, 1);
      }
    }
  }

  getItem(resRef = ''){
    for(let i = 0; i<this.inventory.length; i++){
      let item = this.inventory[i];
      if(item.getTag() == resRef)
        return item;
    }
    return false;
  }

  updateCollision(delta=0){
    //START Gravity

    /*let playerFeetRay = new THREE.Vector3().copy( this.position.clone().add( ( new THREE.Vector3(0, 0, 0.25) ) ) );
    Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    
    //this.position.z += (-10 * delta);
    playerFeetRay.z += 10;
    
    Game.raycaster.ray.direction.set(0, 0,-1);
    
    var intersects = Game.raycaster.intersectObjects( Game.walkmeshList );
    if ( intersects.length > 0 ) {
      if(intersects[ 0 ].distance < 0.5) {
        let faceIdx = intersects[0].faceIndex;
        let walkableType = intersects[0].object.wok.walkTypes[faceIdx];
        let pDistance = 0.25 - intersects[ 0 ].distance;
        this.position.z = intersects[ 0 ].point.z;
      }
    }

    //START: PLAYER WORLD COLLISION

    playerFeetRay = new THREE.Vector3().copy( this.position.clone().add( ( new THREE.Vector3(0, 0, 0.25) ) ) );

    for(let i = 0; i < 360; i += 36) {
      Game.raycaster.ray.direction.set(Math.cos(i), Math.sin(i),-1);
      Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
      var intersects = Game.raycaster.intersectObjects( Game.walkmeshList );
      if ( intersects.length > 0 ) {
        if(intersects[ 0 ].distance < 0.5){
          let faceIdx = intersects[0].faceIndex;
          if(intersects[0].object.wok.walkTypes[faceIdx] == 7){
            let pDistance = 0.5 - intersects[ 0 ].distance;
            this.position.sub( new THREE.Vector3( pDistance * Math.cos(i), pDistance * Math.sin(i), 0 ) );
          }
        }
      }
    }
    
    //END: PLAYER WORLD COLLISION

    //END Gravity
    this.invalidateCollision = false;*/
  }

  doCommand(script, action, instruction){
    this.actionQueue.push({
      goal: ModuleCreature.ACTION.SCRIPT,
      script: script,
      action, action,
      instruction, instruction
    });
  }

  getCurrentRoom(){
    this.room = undefined;
    let _distance = 1000000000;
    for(let i = 0; i < Game.module.rooms.length; i++){
      let room = Game.module.rooms[i];
      let model = room.model;
      if(model instanceof THREE.AuroraModel){
        let pos = this.model.position.clone();
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

  isInConversation(){
    return (Game.InGameDialog.owner == this || Game.InGameDialog.listener == this);
  }

  destroy(){
    try{
      console.log('ModuleObject.destory', this)

      if(this.getModel() instanceof THREE.AuroraModel){
        if(this.getModel().parent instanceof THREE.Object3D){
          this.getModel().parent.remove(this.getModel());
        }
      }

      if(Game.module){
        if(this instanceof ModuleCreature){
          let cIdx = Game.module.area.creatures.indexOf(this);
          console.log('ModuleObject.destory', 'creature', cIdx)
          if(cIdx > -1){
            Game.module.area.creatures.splice(cIdx, 1);
          }
        }else if(this instanceof ModulePlaceable){
          let pIdx = Game.module.area.placeables.indexOf(this);
          console.log('ModuleObject.destory', 'placeable', pIdx)
          if(pIdx > -1){
            Game.module.area.placeables.splice(pIdx, 1);

            try{
              let wmIdx = Game.walkmeshList.indexOf(this.pwk.mesh);
              Game.walkmeshList.splice(wmIdx, 1);
              Game.octree_walkmesh.remove(this.pwk.mesh);
            }catch(e){}

          }
        }else if(this instanceof ModuleRoom){
          let pIdx = Game.module.rooms.indexOf(this);
          console.log('ModuleObject.destory', 'placeable', pIdx)
          if(pIdx > -1){
            Game.module.rooms.splice(pIdx, 1);

            try{
              let wmIdx = Game.walkmeshList.indexOf(this.walkmesh.mesh);
              Game.walkmeshList.splice(wmIdx, 1);
              Game.octree_walkmesh.remove(this.walkmesh.mesh);
            }catch(e){}

          }
        }else if(this instanceof ModuleDoor){
          let pIdx = Game.module.area.doors.indexOf(this);
          console.log('ModuleObject.destory', 'placeable', pIdx)
          if(pIdx > -1){
            Game.module.area.doors.splice(pIdx, 1);

            try{
              let wmIdx = Game.walkmeshList.indexOf(this.dwk.mesh);
              Game.walkmeshList.splice(wmIdx, 1);
              Game.octree_walkmesh.remove(this.dwk.mesh);
            }catch(e){}
            
          }
        }else{
          console.log('ModuleObject.destory', 'not supported '+this.constructor.name)
        }
      }else{
        console.log('ModuleObject.destory', 'No module')
      }

      clearTimeout(this.heartbeatTimer);

    }catch(e){
      console.error('ModuleObject.destory', e);
    }
  }

  SetPosition(x = 0, y = 0, z = 0){
    try{
      this.position.set(x, y, z);
    }catch(e){
      console.error('ModuleObject.SetPosition failed ');
    }
  }

  GetPosition(){
    try{
      return this.position.clone();
    }catch(e){
      console.error('ModuleObject', e);
      return new THREE.Vector3(0);
    }
  }

  GetOrientation(){
    try{
      return this.rotation.clone();
    }catch(e){
      return new THREE.Vector3();
    }
  }

  GetFacing(){
    try{
      return this.rotation.z;
    }catch(e){
      return 0;
    }
  }

  GetRotation(){
    return Math.floor(this.GetFacing() * 180) + 180;
  }


  isStatic(){
    return false;
  }

  isUseable(){
    return false;
  }

  HasTemplate(){
    return (typeof this.template !== 'undefined');
  }

  GetConversation(){
    if(this.template.RootNode.HasField('Conversation')){
      return this.template.RootNode.GetFieldByLabel('Conversation').GetValue();
    }

    return '';
  }

  GetObjectTag(){
    if(this.HasTemplate()){
      if(typeof this.template.json.fields.Tag !== 'undefined')
        return this.template.json.fields.Tag.value;

    }

    return '';
  }

  /*GetPosition(){
    try{
      return this.model.position.clone();
    }catch(e){
      console.error('ModuleObject', e);
      return new THREE.Vector3(0);
    }
  }*/

  /*GetFacing(){
    return 0;
  }*/

  AddEffect(effect){
    console.log('Adding effect', effect, this)
    this.effects.push(effect);

    switch(effect.type){
      case 62: //EFFECT_DISGUISE
        if(this instanceof ModuleCreature){
          this.LoadModel(() => {
            
            //if(this.getModel())
            //  this.getModel().buildSkeleton();

            console.log('Disguise applied', this, effect);
          });
        }
      break;
    }

  }

  GetEffect(idx = -1){
    for(let i = 0; i < this.effects.length; i++){
      if(this.effects[i].type == idx){
        return this.effects[i];
      }
    }
    return null;
  }

  RemoveEffect(idx = -1){
    let effect = this.GetEffect(idx);
    if(effect){
      let arrIdx = this.effects.indexOf(effect);
      this.effects.splice(arrIdx, 1);
    }
  }

  JumpToLocation(lLocation){
    console.log('JumpToLocation', lLocation, this);
    if(typeof lLocation === 'object'){
      if(this.model instanceof THREE.AuroraModel){
        this.model.position.set(
          lLocation.position.x,
          lLocation.position.y,
          lLocation.position.z
        )
      }
    }
  }

  FacePoint(vPoint=new THREE.Vector3){
    this.rotation.z = Math.atan2(
      this.position.y - vPoint.y,
      this.position.x - vPoint.x
    ) + Math.PI/2;
  }



  getXPosition(){
    if(this.template.RootNode.HasField('XPosition')){
      return this.template.RootNode.GetFieldByLabel('XPosition').GetValue();
    }
    return 0;
  }

  getYPosition(){
    if(this.template.RootNode.HasField('YPosition')){
      return this.template.RootNode.GetFieldByLabel('YPosition').GetValue();
    }
    return 0;
  }

  getZPosition(){
    if(this.template.RootNode.HasField('ZPosition')){
      return this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();
    }
    return 0;
  }

  getXOrientation(){
    if(this.template.RootNode.HasField('XOrientation')){
      return this.template.RootNode.GetFieldByLabel('XOrientation').GetValue();
    }
    return 0;
  }

  getYOrientation(){
    if(this.template.RootNode.HasField('XOrientation')){
      return this.template.RootNode.GetFieldByLabel('XOrientation').GetValue();
    }
    return 0;
  }

  getZOrientation(){
    if(this.template.RootNode.HasField('ZOrientation')){
      return this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue();
    }
    return 0;
  }

  GetRotation(){
    if(this.model){
      return Math.floor(this.model.rotation.z * 180) + 180
    }
    return 0;
  }

  getLinkedToModule(){
    if(this.template.RootNode.HasField('LinkedToModule')){
      return this.template.RootNode.GetFieldByLabel('LinkedToModule').GetValue();
    }
    return null;
  }

  getLinkedToFlags(){
    if(this.template.RootNode.HasField('LinkedToFlags')){
      return this.template.RootNode.GetFieldByLabel('LinkedToFlags').GetValue();
    }
    return null;
  }

  getLinkedTo(){
    if(this.template.RootNode.HasField('LinkedTo')){
      return this.template.RootNode.GetFieldByLabel('LinkedTo').GetValue();
    }
    return null;
  }

  getTransitionDestin(){
    if(this.template.RootNode.HasField('TransitionDestin')){
      return this.template.RootNode.GetFieldByLabel('TransitionDestin').GetCExoLocString().GetValue();
    }
    return '';
  }

  getPortraitId(){
    if(this.template.RootNode.HasField('PortraitId')){
      return this.template.RootNode.GetFieldByLabel('PortraitId').GetValue();
    }
    return 0;
  }

  getKeyName(){
    if(this.template.RootNode.HasField('KeyName')){
      return this.template.RootNode.RootNode.GetFieldByLabel('KeyName').GetValue();
    }
    return null;
  }

  getTag(){
    if(this.template.RootNode.HasField('Tag')){
      return this.template.RootNode.GetFieldByLabel('Tag').GetValue()
    }
    return '';
  }

  getTemplateResRef(){
    if(this.template.RootNode.HasField('TemplateResRef')){
      return this.template.RootNode.GetFieldByLabel('TemplateResRef').GetValue()
    }
    return null;
  }

  setTemplateResRef(sRef=''){
    if(this.template.RootNode.HasField('TemplateResRef')){
      this.template.RootNode.GetFieldByLabel('TemplateResRef').SetValue(sRef)
    }else{
      this.template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'TemplateResRef') ).SetValue(sRef)
    }
    
  }

  setHP(nVal = 0){
    this.currentHP = nVal;
  }

  addHP(nVal = 0){
    this.currentHP = (this.getHP() + nVal);
  }

  subtractHP(nVal = 0){
    this.setHP(this.getHP() - nVal);
  }

  getHP(){
    return this.currentHP;
  }

  getMaxHP(){
    return this.hp;
  }

  setMaxHP(nVal = 0){
    return this.hp = nVal;
  }

  setMinOneHP(iVal){
    this.min1HP = iVal ? true : false;
  }

  isPartyMember(){
    return PartyManager.party.indexOf(this) >= 0;
  }

  hasItem(sTag=''){
    sTag = sTag.toLowerCase();
    if(this.isPartyMember()){
      return InventoryManager.getItem(sTag);
    }else{
      return undefined;
    }

  }










  setListening(bListenting = false){
    this.isListening = bListenting ? true : false;
  }

  setListeningPattern(sPattern = '', nNumber = 0){
    this.listening = {
      pattern: sPattern,
      number: nNumber
    }
  }

  getIsListening(){
    return this.isListening ? true : false;
  }






  getLocalBoolean(iNum){
    //console.log('getLocalBoolean', iNum, this);
    return this._locals.Booleans[iNum] ? 1 : 0;
  }

  getLocalNumber(iNum){
    //console.log('getLocalNumber', iNum, this);
    return this._locals.Numbers[iNum] ? this._locals.Numbers[iNum] : 0;
  }

  setLocalBoolean(iNum, bVal){
    //console.log('setLocalBoolean', iNum, bVal, this);
    this._locals.Booleans[iNum] = bVal ? 1 : 0;
  }

  setLocalNumber(iNum, iVal){
    //console.log('setLocalNumber', iNum, iVal, this);
    this._locals.Numbers[iNum] = iVal;
  }

  AssignCommand(command = 0){

  }

































  

  InitProperties(){

    if(this.template.RootNode.HasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.GetFieldByLabel('AutoRemoveKey').GetValue();

    if(this.template.RootNode.HasField('Commandable'))
      this.commandable = this.template.GetFieldByLabel('Commandable').GetValue();

    if(this.template.RootNode.HasField('Cursor'))
      this.cursor = this.template.GetFieldByLabel('Cursor').GetValue();

    if(this.template.RootNode.HasField('Faction'))
      this.faction = this.template.GetFieldByLabel('Faction').GetValue();

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

    if(this.template.RootNode.HasField('HasMapNote'))
      this.hasMapNote = this.template.GetFieldByLabel('HasMapNote').GetValue();

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

    if(this.template.RootNode.HasField('LocName'))
      this.locName = this.template.GetFieldByLabel('LocName').GetCExoLocString();

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

  static TemplateFromJSON(json={}){
    let gff = new GFFObject();
    for(let key in json){
      let field = json[key];
      if(field instanceof Array){
        //TODO
      }else if(typeof field === 'string'){
        gff.RootNode.AddField(
          new Field(GFFDataTypes.RESREF, key, field)
        )
      }else if(typeof field === 'number'){
        gff.RootNode.AddField(
          new Field(GFFDataTypes.INT, key, field)
        )
      }
    }

    return gff;
  }

}

ModuleObject.COUNT = 0;

module.exports = ModuleObject;
