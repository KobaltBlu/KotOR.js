/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuSaveLoad menu class.
 */

class MenuSaveLoad extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.mode = 'load';

    this.background = '1600x1200back';
    this.voidFill = true;
    this.mode = MenuSaveLoad.MODE.LOADGAME;

    this.LoadMenu({
      name: 'saveload',
      onLoad: () => {

        this.LB_GAMES = this.getControlByName('LB_GAMES');
        this.LBL_PANELNAME = this.getControlByName('LBL_PANELNAME');
        this.LBL_SCREENSHOT = this.getControlByName('LBL_SCREENSHOT');
        this.LBL_PLANETNAME = this.getControlByName('LBL_PLANETNAME');
        this.LBL_AREANAME = this.getControlByName('LBL_AREANAME');
        this.LBL_PM1 = this.getControlByName('LBL_PM1');
        this.LBL_PM2 = this.getControlByName('LBL_PM2');
        this.LBL_PM3 = this.getControlByName('LBL_PM3');
        this.BTN_DELETE = this.getControlByName('BTN_DELETE');
        this.BTN_SAVELOAD = this.getControlByName('BTN_SAVELOAD');
        this.BTN_SAVELOAD.setText('Load');
        this.BTN_SAVELOAD.addEventListener('click', (e) => {
          e.stopPropagation();
          if(this.mode == MenuSaveLoad.MODE.LOADGAME){
            if(this.selected instanceof SaveGame){
              this.Close();

              if(Game.module instanceof Module){
                Game.module.dispose();
              }

              this.selected.Load();
            }
          }else{
            if(this.selected instanceof NewSaveItem){
              Game.MenuSaveName.Show();
              Game.MenuSaveName.onSave = ( name = '' ) => {
                console.log('SavGame', name);
              };
            }else{

            }
          }
        });
        this.BTN_EXIT = this.getControlByName('BTN_BACK');
        this.BTN_EXIT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        this.LB_GAMES.onSelected = (save) => {
          this.selected = save;
          this.UpdateSelected();
        }

        this.tGuiPanel.getFill().position.z = -1;

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();
    
    Game.MenuActive = true;

    this.LB_GAMES.GUIProtoItemClass = GUISaveGameItem;
    this.LB_GAMES.clearItems();
    let saves = []

    if(this.mode == MenuSaveLoad.MODE.SAVEGAME){
      saves = SaveGame.saves.filter( (save) => {
        return !save.getIsQuickSave() && !save.getIsAutoSave();
      });
      this.BTN_SAVELOAD.setText(Global.kotorTLK.TLKStrings[1587].Value);
      saves.unshift(new NewSaveItem());
    }else{
      saves = SaveGame.saves;
      this.BTN_SAVELOAD.setText(Global.kotorTLK.TLKStrings[1589].Value);
    }

    for(let i = 0; i < saves.length; i++){
      let save = saves[i];
      this.LB_GAMES.addItem(save, null);
    }

    this.selected = saves[0];
    this.UpdateSelected();

    TextureLoader.LoadQueue();

  }

  UpdateSelected(){
    this.LBL_SCREENSHOT.setFillTexture(undefined);
    this.LBL_PM1.setFillTexture(undefined);
    this.LBL_PM2.setFillTexture(undefined);
    this.LBL_PM3.setFillTexture(undefined);
    this.LBL_PLANETNAME.setText('');
    this.LBL_AREANAME.setText('');
    
    if(this.selected instanceof SaveGame){
      this.selected.GetThumbnail( (texture) => {
        this.LBL_SCREENSHOT.setFillTexture(texture);
        this.LBL_SCREENSHOT.getFill().material.transparent = false;
      })
    

      this.selected.GetPortrait(0, (texture) => {
        this.LBL_PM1.setFillTexture(texture);
        this.LBL_PM1.getFill().material.transparent = false;
      });

      this.selected.GetPortrait(1, (texture) => {
        this.LBL_PM2.setFillTexture(texture);
        this.LBL_PM2.getFill().material.transparent = false;
      });

      this.selected.GetPortrait(2, (texture) => {
        this.LBL_PM3.setFillTexture(texture);
        this.LBL_PM3.getFill().material.transparent = false;
      });

      let areaNames = this.selected.getAreaName().split(' - ');
      if(areaNames.length == 2){
        this.LBL_PLANETNAME.setText(areaNames[0]);
        this.LBL_AREANAME.setText(areaNames[1]);
      }else{
        this.LBL_PLANETNAME.setText('');
        this.LBL_AREANAME.setText(areaNames[0]);
      }

      this.BTN_SAVELOAD.show();
      this.BTN_DELETE.show();
    }else if(this.selected instanceof NewSaveItem){

      this.BTN_SAVELOAD.show();
      this.BTN_DELETE.hide();
    }else{
      this.BTN_SAVELOAD.hide();
      this.BTN_DELETE.hide();
    }

  }

}

MenuSaveLoad.MODE = {
  LOADGAME: 0,
  SAVEGAME: 1
};

class NewSaveItem {
  constructor(){

  }

  getFullName(){
    return Global.kotorTLK.TLKStrings[1586].Value;
  }
}

class GUISaveGameItem extends GUIProtoItem {

  constructor(menu = null, control = null, parent = null, scale = false){
    super(menu, control, parent, scale);
  }

  createControl(){
    try{
      super.createControl();
      this.setText(this.node.getFullName());
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

}

module.exports = MenuSaveLoad;