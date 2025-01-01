import { MenuTopItem } from "../MenuTopItem";


export class MenuTopState {

  static title: string = `KotOR Forge`;
  static items: MenuTopItem[] = [];
  
  static menuItemExample: MenuTopItem;

  static buildMenuItems(){

    //File Menu Item
    this.menuItemExample = new MenuTopItem({
      name: `File`
    });


    // MenuTopState.items.push(
    //   this.menuItemExample
    // );

    // this.menuItemExample.items.push(
    //   this.menuItemSubExample
    // );

  }

}

MenuTopState.buildMenuItems();
