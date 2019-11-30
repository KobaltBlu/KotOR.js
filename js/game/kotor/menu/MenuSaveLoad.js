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
          if(this.selected instanceof SaveGame){
            this.Close();
            this.selected.Load()
          }
        });
        this.BTN_EXIT = this.getControlByName('BTN_BACK');
        this.BTN_EXIT.addEventListener('click', (e) => {
          e.stopPropagation();
          /*this.Hide();
          if(Game.Mode == Game.MODES.MAINMENU){
            Game.MainMenu.Show();
          }else{
            Game.MenuOptions.Show();
          }*/
          this.Close();
        });

        this.tGuiPanel.widget.fill.children[0].position.z = -1;

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();
    
    Game.MenuActive = true;
    /*Game.MainMenu.Hide();
    Game.InGameOverlay.Hide();
    Game.MenuOptions.Hide();
    Game.MenuCharacter.Hide();
    Game.MenuEquipment.Hide();
    Game.MenuMessages.Hide();
    Game.MenuJournal.Hide();
    Game.MenuMap.Hide();
    Game.MenuInventory.Hide();
    Game.MenuPartySelection.Hide();
    Game.MenuTop.Hide();*/

    this.LB_GAMES.clearItems();
    let saves = SaveGame.saves;
    console.log('CREATEz');
    for(let i = 0; i < saves.length; i++){

      if(!i){
        this.selected = saves[i];
        this.UpdateSelected();
      }

      //console.log('CREATE');
      let save = saves[i]
      this.LB_GAMES.addItem(save, null, (control, type) => {
        //console.log('CREATE2', this);
        control.GetFieldByLabel('TEXT').GetChildStructs()[0].GetFieldByLabel('TEXT').SetValue(save.getFullName());
        let _ctrl = new GUIProtoItem(this.LB_GAMES.menu, control, this.LB_GAMES, this.LB_GAMES.scale);
        _ctrl.setList( this.LB_GAMES );
        this.LB_GAMES.children.push(_ctrl);
        let idx = this.LB_GAMES.itemGroup.children.length;
        let item = _ctrl.createControl();
        this.LB_GAMES.itemGroup.add(item);
        //console.log('CREATE3');
        _ctrl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selected = save;
          this.UpdateSelected();
          //Pick Save Item
        });;
      });
    }

    TextureLoader.LoadQueue();

  }

  UpdateSelected(){
    if(this.selected instanceof SaveGame){
      this.selected.GetThumbnail( (texture) => {
        this.LBL_SCREENSHOT.setFillTexture(texture);
        this.LBL_SCREENSHOT.widget.fill.children[0].material.transparent = false;
      })
    }

    this.selected.GetPortrait(0, (texture) => {
      console.log(texture);
      this.LBL_PM1.setFillTexture(texture);
      this.LBL_PM1.widget.fill.children[0].material.transparent = false;
    });

    this.selected.GetPortrait(1, (texture) => {
      this.LBL_PM2.setFillTexture(texture);
      this.LBL_PM2.widget.fill.children[0].material.transparent = false;
    });

    this.selected.GetPortrait(2, (texture) => {
      this.LBL_PM3.setFillTexture(texture);
      this.LBL_PM3.widget.fill.children[0].material.transparent = false;
    });

    let areaNames = this.selected.getAreaName().split(' - ');
    if(areaNames.length == 2){
      this.LBL_PLANETNAME.setText(areaNames[0]);
      this.LBL_AREANAME.setText(areaNames[1]);
    }else{
      this.LBL_PLANETNAME.setText('');
      this.LBL_AREANAME.setText(areaNames[0]);
    }

  }

}

module.exports = MenuSaveLoad;