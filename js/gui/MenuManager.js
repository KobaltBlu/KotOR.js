

class MenuManager {

  static Init(){

    MenuManager.activeMenus = [];

  }

  static Add(menu = null){
    console.log('MenuManager.Add', menu);
    if(!menu.isOverlayGUI){
      //Hide the current top most menu in the list before adding the new Menu
      if(MenuManager.activeMenus.length)
        MenuManager.activeMenus[MenuManager.activeMenus.length-1].Hide();
    }

    if(menu instanceof GameMenu)
      MenuManager.activeMenus.push(menu);

    MenuManager.Resize();
  }

  static Remove(menu = null){
    console.log('MenuManager.Remove', menu);
    let mIdx = MenuManager.activeMenus.indexOf(menu);
    if(mIdx >= 0)
      MenuManager.activeMenus.splice(mIdx, 1);

    //Reshow the new top most menu in the list
    if(MenuManager.activeMenus.length)
      MenuManager.GetCurrentMenu().Show();

    MenuManager.Resize();
  }

  static ClearMenus(){
    while(MenuManager.activeMenus.length){
      MenuManager.activeMenus[0].Close();
    }
  }

  static GetCurrentMenu(){
    return MenuManager.activeMenus[MenuManager.activeMenus.length-1];
  }

  static Resize(){
    for(let i = 0, len = MenuManager.activeMenus.length; i < len; i++){
      MenuManager.activeMenus[i].Resize();
    }
  }

}

MenuManager.Init();

module.exports = MenuManager;