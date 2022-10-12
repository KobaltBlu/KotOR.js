import { ActionMenuManager } from "./ActionMenuManager";

export class ActionMenuItem {
  type = 0;
  target: any = undefined;
  action: any = undefined;
  talent: any = undefined;
  icon = '';

  constructor( props: any = {} ){
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