export class ActionDropItem extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionDropItem;
  }

}
