import { EventListenerModel } from "@/apps/forge/EventListenerModel";


export type MenuTopItemOnClickType = (menuItem: MenuTopItem) => void;

export type MenuTopItemType = 'item'|'separator'|'title';

export interface MenuTopItemProps {
  name?: string;
  type?: MenuTopItemType;
  onClick?: MenuTopItemOnClickType;
  items?: MenuTopItem[];
}

export class MenuTopItem extends EventListenerModel {

  uuid: string = crypto.randomUUID();
  name: string = ``;
  type: MenuTopItemType = 'item';
  items: MenuTopItem[] = [];

  //User Events
  onClick: MenuTopItemOnClickType;

  constructor( props: MenuTopItemProps = {} as MenuTopItemProps ){
    super();
    props = Object.assign({
      name: ``,
      items: [],
      type: 'item'
    }, props);

    this.name = props.name as string;
    this.type = props.type as MenuTopItemType;
    this.onClick = props.onClick as MenuTopItemOnClickType;
    this.items = props.items as MenuTopItem[];

  }

  rebuild(){
    this.processEventListener('onRebuild', []);
  }

}