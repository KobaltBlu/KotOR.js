class ActionMenuManager {

  static TARGET_MENU_COUNT = 3;
  static SELF_MENU_COUNT = (GameKey == 'KOTOR' ? 4 : 6);

  static oPC = undefined;
  static oTarget = undefined;

  static ActionPanels = {
    targetPanels: [],
    selfPanels: [],
  };
  
  static SetPC(oPC){
    ActionMenuManager.oPC = oPC;
  }
  
  static SetTarget(oTarget){
    ActionMenuManager.oTarget = oTarget;
  }

  static InitActionMenuPanels(){
    ActionMenuManager.ActionPanels = {
      targetPanels: [],
      selfPanels: [],
    };
    
    for(let i = 0; i < ActionMenuManager.TARGET_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.targetPanels[i] = new ActionMenuPanel();
    }
    
    for(let i = 0; i < ActionMenuManager.SELF_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.selfPanels[i] = new ActionMenuPanel();
    }
  }

  static UpdateMenuActions(){
    for(let i = 0; i < ActionMenuManager.TARGET_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.targetPanels[i].clearActions();
    }
    
    for(let i = 0; i < ActionMenuManager.SELF_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.selfPanels[i].clearActions();
    }

    if(ActionMenuManager.oTarget instanceof ModuleObject){

      if(ActionMenuManager.oTarget instanceof ModulePlaceable){
        if(ActionMenuManager.oTarget.isLocked() && !ActionMenuManager.oTarget.requiresKey()){
          const securityTalent = ActionMenuManager.oPC.getSkillList()[6];
          ActionMenuManager.ActionPanels.targetPanels[1].addAction(new ActionMenuItem({
            talent: securityTalent,
            target: ActionMenuManager.oTarget,
            icon: securityTalent.icon
          }));

          ActionMenuManager.ActionPanels.targetPanels[0].addAction(new ActionMenuItem({
            action: {
              type: Action.TYPE.ActionPhysicalAttacks,
              object: ActionMenuManager.oTarget,
              talent: undefined
            },
            icon: 'i_attack'
          }));
        }
      }else if(ActionMenuManager.oTarget instanceof ModuleDoor){
        if(ActionMenuManager.oTarget.isLocked() && !ActionMenuManager.oTarget.requiresKey()){
          const securityTalent = ActionMenuManager.oPC.getSkillList()[6];
          ActionMenuManager.ActionPanels.targetPanels[1].addAction(new ActionMenuItem({
            talent: securityTalent,
            target: ActionMenuManager.oTarget,
            icon: securityTalent.icon
          }));

          ActionMenuManager.ActionPanels.targetPanels[0].addAction(new ActionMenuItem({
            action: {
              type: Action.TYPE.ActionPhysicalAttacks,
              object: ActionMenuManager.oTarget,
              talent: undefined
            },
            icon: 'i_attack'
          }));
        }
      }else if(ActionMenuManager.oTarget instanceof ModuleCreature && ActionMenuManager.oTarget.isHostile(Game.player)){
        ActionMenuManager.ActionPanels.targetPanels[0].addAction(new ActionMenuItem({
          action: {
            type: Action.TYPE.ActionPhysicalAttacks,
            object: ActionMenuManager.oTarget,
            talent: undefined
          },
          icon: 'i_attack'
        }));

        if(ActionMenuManager.oPC.getEquippedWeaponType() == 1){
          //category = 0x1104
          const feats = ActionMenuManager.oPC.getFeats().filter( (f, i , array) => { 
            return f.category == 0x1104 && (
              f.successor == '****' || 
              (!array.find( f2 => f2.__index == f.successor))
            ) 
          });

          for(let i = 0, len = feats.length; i < len; i++){
            const feat = feats[i];
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new ActionMenuItem({
              talent: feat,
              icon: feat.icon
            }));
          }

        }

        if(ActionMenuManager.oPC.getEquippedWeaponType() == 4){
          //category = 0x1111
          const feats = ActionMenuManager.oPC.getFeats().filter( (f, i , array) => { 
            return f.category == 0x1111 && (
              f.successor == '****' || 
              (!array.find( f2 => f2.__index == f.successor))
            ) 
          });

          for(let i = 0, len = feats.length; i < len; i++){
            const feat = feats[i];
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new ActionMenuItem({
              talent: feat,
              icon: feat.icon
            }));
          }

        }

        const hostileSpells = ActionMenuManager.oPC.getSpells().filter( s => {
          return !isNaN(parseInt(s.forcehostile));
        });

        for(let i = 0; i < hostileSpells.length; i++){
          ActionMenuManager.ActionPanels.targetPanels[1].addAction(new ActionMenuItem({
            talent: hostileSpells[i],
            target: ActionMenuManager.oTarget,
            icon: hostileSpells[i].iconresref
          }));
        }

      }

    }

    const friendlySpells = ActionMenuManager.oPC.getSpells().filter( s => {
      return !isNaN(parseInt(s.forcefriendly));
    });

    for(let i = 0; i < friendlySpells.length; i++){
      ActionMenuManager.ActionPanels.selfPanels[1].addAction(new ActionMenuItem({
        talent: friendlySpells[i],
        target: ActionMenuManager.oPC,
        icon: friendlySpells[i].iconresref
      }));
    }

    return ActionMenuManager.ActionPanels;
  }

  static targetActionCount(){
    return ActionMenuManager.ActionPanels.targetPanels.reduce(
      (previousValue, currentValue, currentIndex, panels) => {
        return previousValue += currentValue.actions.length;
      }, 0
    );
  }

  static selfActionCount(){
    return ActionMenuManager.ActionPanels.selfPanels.reduce(
      (previousValue, currentValue, currentIndex, panels) => {
        return previousValue += currentValue.actions.length;
      }, 0
    );
  }

}

class ActionMenuPanel {
  selectedIndex = 0;
  actions = [];

  constructor(){

  }

  previousAction(){
    if(this.actions.length){
      this.selectedIndex -= 1;
      if(this.selectedIndex < 0)
      this.selectedIndex = this.actions.length - 1;
    }else{
      this.selectedIndex = 0;
    }
  }

  nextAction(){
    if(this.actions.length){
      this.selectedIndex += 1;
      if(this.selectedIndex > (this.actions.length - 1))
        this.selectedIndex = 0;
    }else{
      this.selectedIndex = 0;
    }
  }

  addAction(action){
    if(action instanceof ActionMenuItem){
      this.actions.push(action);
    }
  }

  getSelectedAction(){
    return this.actions[this.selectedIndex];
  }

  clearActions(){
    this.actions = [];
  }

  reset(){
    this.selectedIndex = 0;
  }
}

class ActionMenuItem {
  type = 0;
  target = undefined;
  action = undefined;
  talent = undefined;
  icon = '';

  constructor( props = {} ){
    props = Object.assign({
      action: undefined,
      talent: undefined,
      target: ActionMenuManager.oTarget,
      icon: '',
    }, props);
    this.action = props.action;
    this.talent = props.talent;
    this.icon = props.icon;
    this.target = props.target;
  }

}

ActionMenuManager.InitActionMenuPanels();

module.exports = ActionMenuManager;