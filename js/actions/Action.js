class Action {
  constructor( groupId = 0 ){
    this.type = 0;
    this.groupId = groupId;

    this.owner = undefined; //The owner of the action
    this.target = undefined; //The target of the action

    this.parameters = [];

    this.path = undefined;
    this.openSpot = undefined;
  }

  update(delta){
    return Action.STATUS.FAILED;
  }

  setOwner( owner = undefined ){
    this.owner = owner;
  }

  getOwner(){
    return this.owner;
  }

  setTarget( target = undefined ){
    this.target = target;
  }

  getTarget(){
    this.target;
  }

  actionPathfinder(distance, run = !this.owner.walk, delta = 1){
    let distanceToTarget = Utility.Distance2D(this.owner.position, this.target.position);
    if(this.path == undefined){
      if(this.type == Action.TYPE.ActionFollowLeader){
        this.path = Game.module.area.path.traverseToPoint(this.owner.position, PartyManager.GetFollowPosition(this));
        //this.path.push(PartyManager.GetFollowPosition(this));
        distanceToTarget = Utility.Distance2D(this.owner.position, this.target.position);
      }else if(this.type == Action.TYPE.ActionPhysicalAttacks){
        if(this.getEquippedWeaponType() == 4){ //RANGED
          this.path = Game.module.area.path.traverseToPoint(this.owner.position, this.target.position);
        }else{ //MELEE
          this.path_realtime = true;
          let openSpot = this.target.getClosesetOpenSpot(this);
          if(typeof openSpot != 'undefined'){
            //console.log('openSpot', this.owner.getName(), openSpot);
            this.path = Game.module.area.path.traverseToPoint(this.owner.position, openSpot.targetVector);
            this.path.unshift(this.target.position.clone());
            this.openSpot = openSpot;
            distanceToTarget = Utility.Distance2D(this.owner.position, openSpot.targetVector);
          }else{
            distanceToTarget = Utility.Distance2D(this.owner.position, this.target.position);
            console.error('openSpot', 'Not found');
          }
        }
      }else if(this.type == Action.TYPE.ActionCastSpell){
        //if(PartyManager.party.indexOf(this) >= 0){
          this.path_realtime = true;
          let openSpot = this.target.getClosesetOpenSpot(this);
          if(typeof openSpot != 'undefined'){
            //console.log('openSpot', this.owner.getName(), openSpot);
            this.path = Game.module.area.path.traverseToPoint(this.owner.position, openSpot.targetVector);
            this.path.unshift(this.target.position.clone());
            this.openSpot = openSpot;
            distanceToTarget = Utility.Distance2D(this.owner.position, openSpot.targetVector);
          }else{
            distanceToTarget = Utility.Distance2D(this.owner.position, this.target.position);
            console.error('openSpot', 'Not found');
          }
        //}
      }else{
        this.path = Game.module.area.path.traverseToPoint(this.owner.position, this.target.position);
        distanceToTarget = Utility.Distance2D(this.owner.position, this.target.position);
      }
      this.path_timer = 20;
    }

    if(this.openSpot){
      distanceToTarget = Utility.Distance2D(this.owner.position, this.openSpot.targetVector);
    }

    this.invalidateCollision = true;
    let point = this.path[0];

    if(this.blockingTimer >= 5 || this.collisionTimer >= 1){
      this.owner.blockingTimer = 0;
      this.owner.collisionTimer = 0;
    }

    if(point == undefined)
      point = this.target.position;

    if(!(point instanceof THREE.Vector3))
      point = point.vector;

    let pointDistance = Utility.Distance2D(this.owner.position, point);
    if(pointDistance > distance){
      let tangent = point.clone().sub(this.owner.position.clone());
      let atan = Math.atan2(-tangent.y, -tangent.x);
      this.owner.setFacing(atan + Math.PI/2, false);
      this.owner.AxisFront.x = Math.cos(atan);
      this.owner.AxisFront.y = Math.sin(atan);

      this.runCreatureAvoidance(delta);

      let arrivalDistance = distance;
      if(this.openSpot){
        arrivalDistance = 1.5;
      }

      this.owner.AxisFront.negate();
      this.owner.force = Math.min( 1, Math.max( 0, ( ( distanceToTarget - arrivalDistance ) / 1 ) ) );
      this.owner.walk = !run;
      this.owner.animState = run ? ModuleCreature.AnimState.RUNNING : ModuleCreature.AnimState.WALKING;
    }else{
      this.path.shift();
    }

    if(this.path_timer < 0){
      if(this.path_realtime){
        this.path = undefined;
        this.path_timer = 20;
        //console.log('Path invalidated');
      }
    }else{
      this.path_timer -= 10*delta;
    }

    if(pointDistance > distance){
      return false;
    }else{
      return true;
    }

  }

  runCreatureAvoidance(delta = 0){
    if(PartyManager.party.indexOf(this) >= 0){

      //Check Creature Avoidance
      let threatening = undefined;
      let threateningDistance = Infinity;
      let ahead = this.owner.position.clone().sub(this.owner.AxisFront.clone().normalize()).multiplyScalar(1);
      let ahead2 = this.owner.position.clone().sub(this.owner.AxisFront.clone().normalize()).multiplyScalar(1).multiplyScalar(0.5);
      for(let i = 0; i < Game.module.area.creatures.length; i++){
        let creature = Game.module.area.creatures[i];
        if(creature === this.owner || creature.isDead())
          continue;

        let hitDistance = parseInt(creature.getAppearance().hitdist);
        let creaturePos = creature.position.clone();
        let distance = this.owner.position.distanceTo(creature.position);

        if(ahead.distanceTo(creaturePos) <= hitDistance){
          if(ahead.distanceTo(creaturePos) < threateningDistance){
            threatening = creature;
            threateningDistance = ahead.distanceTo(creaturePos);
          }
        }else if(ahead2.distanceTo(creaturePos) <= hitDistance){
          //console.log('threatening', creature.firstName, ahead.distanceTo(creaturePos), hitDistance)
          if(ahead2.distanceTo(creaturePos) < threateningDistance){
            threatening = creature;
            threateningDistance = ahead2.distanceTo(creaturePos);
          }
        }   
      }

      for(let i = 0; i < PartyManager.party.length; i++){
        let creature = PartyManager.party[i];
        if(creature === this.owner || creature.isDead())
          continue;

        let hitDistance = parseInt(creature.getAppearance().hitdist);
        let creaturePos = creature.position.clone();
        let distance = this.owner.position.distanceTo(creature.position);

        if(ahead.distanceTo(creaturePos) <= hitDistance){
          if(ahead.distanceTo(creaturePos) < threateningDistance){
            threatening = creature;
            threateningDistance = ahead.distanceTo(creaturePos);
          }
        }else if(ahead2.distanceTo(creaturePos) <= hitDistance){
          //console.log('threatening', creature.firstName, ahead.distanceTo(creaturePos), hitDistance)
          if(ahead2.distanceTo(creaturePos) < threateningDistance){
            threatening = creature;
            threateningDistance = ahead2.distanceTo(creaturePos);
          }
        }
      }

      if(threatening instanceof ModuleCreature){
        //console.log(threatening.getName(), 'is threatening', this.owner.getName());

        let dVector = threatening.position.clone().sub(this.owner.position).normalize();
        
        let creaturePos = threatening.position.clone();        
        let avoidance_force = ahead.clone().sub(dVector);
        avoidance_force.z = 0;
        let newTarget = this.owner.position.clone().add(avoidance_force);

        let tangent = newTarget.sub(this.owner.position.clone());
        let atan = Math.atan2(-avoidance_force.y, -avoidance_force.x);
        this.owner.rotation.z = (atan + Math.PI/2); //(1 - delta) * this.owner.rotation.z + delta * (atan + Math.PI/2)
        this.owner.AxisFront.x = Math.cos(atan);
        this.owner.AxisFront.y = Math.sin(atan);

        this.owner.blockingTimer += 1;
      }else{
        if(this.owner.blockingTimer > 0){
          this.owner.blockingTimer -= 0.5;
        }
        if(this.owner.blockingTimer > 0)
          this.owner.blockingTimer = 0;
      }

    }
  }

  setParameters( params = [], count = 0 ){
    if(count){
      if(Array.isArray(params)){
        for(let i = 0; i < count; i++){
          this.parameters[i] = ActionParameter.FromStruct( params[i] );
        }
      }
    }
  }

  getParameter( index = 0 ){
    let param = this.parameters[index];
    switch(param.type){
      case ActionParameter.TYPE.DWORD:
        return ModuleObject.GetObjectById(param.value);
      default:
        return param.value;
    }
  }

  setParameter( index = 0, type = 0, value = 0 ){
    let param = this.parameters[index];

    if(typeof param == 'undefined'){
      param = new ActionParameter( type );
    }

    switch(param.type){
      case ActionParameter.TYPE.INT:
        param.value = !isNaN(parseInt(value)) ? parseInt(value) : 0;
      break;
      case ActionParameter.TYPE.FLOAT:
        param.value = !isNaN(parseFloat(value)) ? parseFloat(value) : 0;
      break;
      case ActionParameter.TYPE.DWORD:
        if(value instanceof ModuleObject){
          param.value = value.id ? value.id : ModuleObject.OBJECT_INVALID;
        }else{
          param.value = !isNaN(parseInt(value)) ? parseInt(value) : 0;
        }
      break;
      case ActionParameter.TYPE.STRING:
        param.value = value.toString();
      break;
      case ActionParameter.TYPE.SCRIPT_SITUATION:
        if(value instanceof NWScriptInstance)
          param.value = value;
      break;
      default:
        throw 'setParameter: Invalid type: ('+type+')';
    }
  }

  static FromStruct( struct ){
    let action = undefined;
    let actionId = struct.GetFieldByLabel('ActionId').GetValue();
    let groupId = struct.GetFieldByLabel('GroupActionId').GetValue();
    let paramCount = struct.GetFieldByLabel('NumParams').GetValue();

    let paramStructs = [];
    if(struct.HasField('Paramaters'))
      paramStructs = struct.GetFieldByLabel('Paramaters').GetChildStructs();

    switch(actionId){
      case Action.TYPE.ActionMoveToPoint:
        action = new ActionMoveToPoint(groupId);
      break;
      case Action.TYPE.ActionPlayAnimation:
        action = new ActionPlayAnimation(groupId);
      break;
      case Action.TYPE.ActionWait:
        action = new ActionWait(groupId);
      break;
      case Action.TYPE.ActionDoCommand:
        action = new ActionDoCommand(groupId);
      break;
      default:
        console.log('ActionList Unhandled Action', '0x'+(actionId.toString(16).toUpperCase()), action, this);
      break;
    }

    if(action instanceof Action){
      action.setParameters(paramStructs, paramCount);
    }

    return action;
  }

}

Action.NEXT_GROUP_ID = 0;

Action.STATUS = {
  IN_PROGRESS: 1,
  COMPLETE: 2,
  ERROR: 3,
  WAITING: 4,
};

Action.TYPE = {
  ActionMoveToPoint: 0x01,
  ActionCheckMoveToObject: 0x02,
  ActionCheckMoveAwayFromObject: 0x03,
  ActionCheckInterAreaPathfinding: 0x04,
  ActionJumpToPoint: 0x05,
  ActionPlayAnimation: 0x06,
  ActionPickUpItem: 0x07,
  ActionEquipItem: 0x08,
  ActionDropItem: 0x09,
  ActionCheckMoveToPoint: 0x0A,
  ActionUnequipItem: 0x0B,
  ActionPhysicalAttacks: 0x0C,
  
  ActionSpeak: 0x0E,
  ActionCastSpell: 0x0F,
  ActionWaitForEndOfRound: 0x10,
  ActionCheckMoveToObjectRadius: 0x11,
  ActionCheckMoveToPointRadius: 0x12,
  ActionChangeFacingObject: 0x13,
  ActionOpenDoor: 0x14,
  ActionCloseDoor: 0x15,
  ActionOrientCamera: 0x16,
  ActionPlaySound: 0x17,
  ActionDialogObject: 0x18,
  ActionDisarmMine: 0x19,
  ActionRecoverMine: 0x1A,
  ActionFlagMine: 0x1B,
  ActionExamineMine: 0x1C,
  ActionSetMine: 0x1D,
  ActionWait: 0x1E,
  ActionPauseDialog: 0x1F,
  ActionResumeDialog: 0x20,
  ActionSpeakStrRef: 0x21,
  ActionGiveItem: 0x22,
  ActionTakeItem: 0x23,
  ActionEncounterCreatureDestroySelf: 0x24,
  ActionDoCommand: 0x25,
  ActionUnlockObject: 0x26,
  ActionLockObject: 0x27,
  ActionUseObject: 0x28,
  ActionAnimalEmpathy: 0x29,
  ActionRest: 0x2A,
  ActionTaunt: 0x2B,
  ActionCheckMoveAwayFromLocation: 0x2C,
  ActionRandomWalk: 0x2D,
  ActionItemCastSpell: 0x2E,
  ActionSetCommandable: 0x2F,
  ActionJumpToObject: 0x30,
  ActionChangeFacingPoint: 0x31,
  ActionCounterSpell: 0x32,
  ActionDrive: 0x33,
  ActionAppear: 0x34,
  ActionDisappear: 0x35,
  ActionPickPocket: 0x36,
  ActionForceFollowObject: 0x37,
  ActionHeal: 0x38,
  
  ActionCheckForceFollowObject: 0x3A,
  ActionFollowLeader: 0x3D,
  ActionAreaWait: 0x3C,
  ActionPartyFollowLeader: 0x3D,
  ActionBarkString: 0x3E,
  ActionCombat: 0x3F,
  ActionCheckMoveToFollowRadius: 0x40,
  ActionSurrenderToEnemies: 0x41,
  
};

class ActionParameter {

  constructor(type = 0, value = 0){
    this.type = type;
    this.value = value;

    switch(this.type){

    }

    if(!this.type){
      throw 'ActionParameter: Invalid Type ('+type+')';
    }
  }

  static FromStruct( struct ){
    if(struct instanceof Struct){
      let type = struct.GetFieldByLabel('Type').GetValue();
      let value = undefined;
      switch(type){
        case ActionParameter.TYPE.INT:
        case ActionParameter.TYPE.FLOAT:
        case ActionParameter.TYPE.DWORD:
        case ActionParameter.TYPE.STRING:
          value = struct.GetFieldByLabel('Value').GetValue();
        break;
        case ActionParameter.TYPE.SCRIPT_SITUATION:
          let scriptParamStructs = struct.GetFieldByLabel('Value').GetChildStructs()[0];
          let script = new NWScript();
          script.name = scriptParamStructs.GetFieldByLabel('Name').GetValue();
          script.init(
            scriptParamStructs.GetFieldByLabel('Code').GetVoid(),
            scriptParamStructs.GetFieldByLabel('CodeSize').GetValue()
          );
      
          let scriptInstance = script.newInstance();
          scriptInstance.isStoreState = true;
          scriptInstance.offset = scriptParamStructs.GetFieldByLabel('InstructionPtr').GetValue();
          scriptInstance.setCaller(this);
      
          let stackStruct = scriptParamStructs.GetFieldByLabel('Stack').GetChildStructs()[0];
          scriptInstance.stack = NWScriptStack.FromActionStruct(stackStruct);

          value = scriptInstance;
        break;
        default:
          throw 'ActionParameter.FromStruct: Invalid Type ('+type+')';
      }
      return new ActionParameter(type, value);
    }
    return undefined;
  }

}

ActionParameter.TYPE = {
  INT:    1,
  FLOAT:  2,
  DWORD:  3,
  STRING: 4,
  SCRIPT_SITUATION: 5
};

Action.Parameter = ActionParameter;

class ActionList extends Array {

  constructor(...items){
    super(...items);
    this.groupId = 1;
    this.lastGroupId = 0;
  }

  add( actionNode = undefined ){
    if(actionNode instanceof Action){
      super.push( actionNode );
    }
  }

  addFront( actionNode = undefined ){
    if(actionNode instanceof Action){
      super.unshift( actionNode );
    }
  }

  push( actionNode = undefined ){
    this.add( actionNode );
  }

  unshift( actionNode = undefined ){
    this.addFront( actionNode );
  }

}

Action.ActionList = ActionList;

module.exports = Action;