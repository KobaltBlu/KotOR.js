import { ActionParameterType } from "../enums/actions/ActionParameterType";

export class ActionCastSpell extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionCastSpell;

    //PARAMS
    // 0 - int: nSpellId
    // 1 - int: Unknown: -1 if cheat enabled
    // 2 - int: nDomainLevel
    // 3 - int: Unknown: Always 0?
    // 4 - int: Unknown: Always 0?
    // 5 - dword: target object id
    // 6 - float: target x
    // 7 - float: target y
    // 8 - float: target z
    // 9 - int: nProjectilePath
    // 10 - int: Unknown: Always -1?
    // 11 - int: Unknown: -1 if cheat enabled

  }

  update(delta: number = 0){
    //console.log('ActionCastSpell', this);
    this.target = this.getParameter(5);
    this.spell = new TalentSpell( this.getParameter(0) );

    if(this.spell instanceof TalentSpell){
      if(!this.spell.inRange(this.target, this.owner)){

        this.owner.openSpot = undefined;
        let actionMoveToTarget = new ActionMoveToPoint();
        actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
        actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
        actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
        actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
        actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target instanceof ModuleObject ? this.target.id : ModuleObject.OBJECT_INVALID);
        actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
        actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, this.spell.getCastRange() );
        actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
        actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);

        return ActionStatus.IN_PROGRESS;

      }else{
        this.owner.animState = ModuleCreatureAnimState.IDLE;
        this.owner.force = 0;
        this.owner.speed = 0;
        this.spell.useTalentOnObject(this.target, this.owner);
        return ActionStatus.COMPLETE;
      }
    }

    return ActionStatus.FAILED;
  }

}
