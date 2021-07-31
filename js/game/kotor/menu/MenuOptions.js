/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuOptions menu class.
 */

class MenuOptions extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';
    this.voidFill = true;

    this.LoadMenu({
      name: 'optionsingame',
      onLoad: () => {

        //this.lbl_hint = this.getControlByName('LBL_HINT');

        this.BTN_LOADGAME = this.getControlByName('BTN_LOADGAME');
        this.BTN_SAVEGAME = this.getControlByName('BTN_SAVEGAME');
        this.BTN_FEEDBACK = this.getControlByName('BTN_FEEDBACK');
        this.BTN_GRAPHICS = this.getControlByName('BTN_GRAPHICS');
        this.BTN_GAMEPLAY = this.getControlByName('BTN_GAMEPLAY');
        this.BTN_SOUND = this.getControlByName('BTN_SOUND');
        this.BTN_AUTOPAUSE = this.getControlByName('BTN_AUTOPAUSE');
        this.BTN_EXIT = this.getControlByName('BTN_EXIT');
        this.BTN_QUIT = this.getControlByName('BTN_QUIT');

        this.BTN_EXIT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        this.BTN_LOADGAME.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuSaveLoad.mode = MenuSaveLoad.MODE.LOADGAME;
          Game.MenuSaveLoad.Open();
        });

        this.BTN_SAVEGAME.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuSaveLoad.mode = MenuSaveLoad.MODE.SAVEGAME;
          Game.MenuSaveLoad.Open();
        });

        this.BTN_GRAPHICS.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuGraphics.Open();
        });

        this.BTN_SOUND.addEventListener('click', (e) => {
          e.stopPropagation();
          Game.MenuSound.Open();
        });

        this.BTN_LOADGAME.addEventListener( 'hover', () => {
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(Global.kotorTLK.TLKStrings[42300].Value)
        });

        this.BTN_SAVEGAME.addEventListener( 'hover', () => {
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(Global.kotorTLK.TLKStrings[42301].Value)
        });

        this.BTN_GAMEPLAY.addEventListener( 'hover', () => {
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(Global.kotorTLK.TLKStrings[48006].Value)
        });

        this.BTN_FEEDBACK.addEventListener( 'hover', () => {
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(Global.kotorTLK.TLKStrings[42274].Value)
        });

        this.BTN_AUTOPAUSE.addEventListener( 'hover', () => {
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(Global.kotorTLK.TLKStrings[48572].Value)
        });

        this.BTN_GRAPHICS.addEventListener( 'hover', () => {
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(Global.kotorTLK.TLKStrings[48010].Value)
        });

        this.BTN_SOUND.addEventListener( 'hover', () => {
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(Global.kotorTLK.TLKStrings[48012].Value)
        });

        this.BTN_QUIT.addEventListener( 'hover', () => {
          this.LB_DESC.clearItems();
          this.LB_DESC.addItem(Global.kotorTLK.TLKStrings[42302].Value)
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();

    Game.MenuActive = true;

    /*Game.InGameOverlay.Hide();
    //Game.MenuOptions.Hide();
    Game.MenuCharacter.Hide();
    Game.MenuEquipment.Hide();
    Game.MenuMessages.Hide();
    Game.MenuJournal.Hide();
    Game.MenuMap.Hide();
    Game.MenuInventory.Hide();
    Game.MenuPartySelection.Hide();
    Game.MenuTop.Show();*/

  }

}

module.exports = MenuOptions;