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
      param = this.parameters[index] = new ActionParameter( type );
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
      case Action.TYPE.ActionCastSpell:
        action = new ActionCastSpell(groupId);
      break;
      case Action.TYPE.ActionCloseDoor:
        action = new ActionCloseDoor(groupId);
      break;
      case Action.TYPE.ActionDialogObject:
        action = new ActionDialogObject(groupId);
      break;
      case Action.TYPE.ActionDoCommand:
        action = new ActionDoCommand(groupId);
      break;
      case Action.TYPE.ActionDropItem:
        action = new ActionDropItem(groupId);
      break;
      case Action.TYPE.ActionEquipItem:
        action = new ActionEquipItem(groupId);
      break;
      case Action.TYPE.ActionFollowLeader:
        action = new ActionFollowLeader(groupId);
      break;
      case Action.TYPE.ActionGiveItem:
        action = new ActionGiveItem(groupId);
      break;
      case Action.TYPE.ActionItemCastSpell:
        action = new ActionItemCastSpell(groupId);
      break;
      case Action.TYPE.ActionJumpToObject:
        action = new ActionJumpToObject(groupId);
      break;
      case Action.TYPE.ActionJumpToPoint:
        action = new ActionJumpToPoint(groupId);
      break;
      case Action.TYPE.ActionLockObject:
        action = new ActionLockObject(groupId);
      break;
      case Action.TYPE.ActionMoveToPoint:
        action = new ActionMoveToPoint(groupId);
      break;
      case Action.TYPE.ActionOpenDoor:
        action = new ActionOpenDoor(groupId);
      break;
      case Action.TYPE.ActionPauseDialog:
        action = new ActionPauseDialog(groupId);
      break;
      case Action.TYPE.ActionPlayAnimation:
        action = new ActionPlayAnimation(groupId);
      break;
      case Action.TYPE.ActionPhysicalAttacks:
        action = new ActionPhysicalAttacks(groupId);
      break;
      case Action.TYPE.ActionResumeDialog:
        action = new ActionResumeDialog(groupId);
      break;
      case Action.TYPE.ActionSetCommandable:
        action = new ActionSetCommandable(groupId);
      break;
      case Action.TYPE.ActionTakeItem:
        action = new ActionTakeItem(groupId);
      break;
      case Action.TYPE.ActionUnlockObject:
        action = new ActionUnlockObject(groupId);
      break;
      case Action.TYPE.ActionUseObject:
        action = new ActionUseObject(groupId);
      break;
      case Action.TYPE.ActionWait:
        action = new ActionWait(groupId);
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
          scriptInstance.offset = scriptInstance.address = scriptParamStructs.GetFieldByLabel('InstructionPtr').GetValue();
      
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

class ActionQueue extends Array {

  constructor(...items){
    super(...items);
    this.groupId = 1;
    this.lastGroupId = 0;
    this.owner = undefined;
  }

  setOwner( owner = undefined ){
    this.owner = owner;
  }

  add( actionNode = undefined ){
    if(actionNode instanceof Action){
      actionNode.owner = this.owner;
      super.push( actionNode );
    }
  }

  addFront( actionNode = undefined ){
    if(actionNode instanceof Action){
      actionNode.owner = this.owner;
      super.unshift( actionNode );
    }
  }

  push( actionNode = undefined ){
    actionNode.owner = this.owner;
    this.add( actionNode );
  }

  unshift( actionNode = undefined ){
    actionNode.owner = this.owner;
    this.addFront( actionNode );
  }

  process( delta ){
    let action = this[0];
    if(action instanceof Action){
      action.owner = this.owner;
      let status = action.update( delta );
      if(status != Action.STATUS.IN_PROGRESS){
        this.shift();
      }
    }
  }

  clear(){
    this.splice(0, this.length);
  }

}

Action.ActionQueue = ActionQueue;

module.exports = Action;