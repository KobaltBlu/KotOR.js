class ActionGiveItem extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionGiveItem;
  }

  update(delta){

    if(!(this.item instanceof ModuleItem))
      return Action.STATUS.FAILED;

    if(PartyManager.party.indexOf(this.target) >= 0){
      InventoryManager.addItem( item );
      return Action.STATUS.COMPLETE;
    }else if(
      (this.target instanceof ModuleCreature) ||
      (this.target instanceof ModulePlaceable) ||
      (this.target instanceof ModuleStore)
    ){
      this.target.addItem( item );
      return Action.STATUS.COMPLETE;
    }

    return Action.STATUS.FAILED;

  }

}

module.exports = ActionGiveItem;