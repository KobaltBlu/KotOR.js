
export class UI {

}

export enum UIItemTYPE {
  DEFAULT = 0,
  ICON = 1,
  GLYPHICON = 2,
  SEPARATOR = 3
};

export interface UIItemOptions {
  type?: UIItemTYPE;
  name?: string;
  icon?: string;
  color?: string;
  onClick?: Function;
  parent?: JQuery<HTMLElement>;
}

export class UIItem {

  type?: UIItemTYPE;
  name?: string;
  icon?: string;
  color?: string;
  onClick?: Function;
  parent?: JQuery<HTMLElement>;

  $item: JQuery<HTMLElement>;
  static TYPE: any;

  constructor (args: UIItemOptions = {}) {

    args = Object.assign({
      type: UIItemTYPE.DEFAULT,
      name: '',
      icon: '',
      color: 'white',
      onClick: null,
      parent: null
    }, args);

    this.type = args.type;
    this.name = args.name;
    this.icon = args.icon;
    this.color = args.color;
    this.onClick = args.onClick;
    this.parent = args.parent;

    switch(this.type){
      case UIItemTYPE.DEFAULT:
        this.$item = $('<li class="title">'+this.name+'</li>');
      break;
      case UIItemTYPE.ICON:
        this.$item = $('<li><img src="'+this.icon+'" title="'+this.name+'" style="width: 20px; height: 20px;"/></a></li>');
      break;
      case UIItemTYPE.GLYPHICON:
        this.$item = $('<li><a href="#" class="glyphicon '+this.icon+'" style="color: '+this.color+';"></a></li>');
      break;
      case UIItemTYPE.SEPARATOR:
        this.$item = $('<li role="separator" class="divider" />');
      break;
      default:
        this.$item = $('<li><a href="#">'+this.name+'</a></li>');
      break;
    }

    //Set onClick Event
    if (typeof this.onClick === 'function') {
      this.$item.on("click", this.onClick as any);
    }else{
      this.$item.on('click', function(e){
        e.preventDefault();
      });
    }

    if(this.parent != null){
      this.parent.append(this.$item);
    }

  }

}