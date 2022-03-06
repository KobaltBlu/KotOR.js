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
        this._button_b = this.BTN_EXIT;

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

        this.BTN_QUIT.addEventListener('click', () => {
          Game.Mode = Game.MODES.MAINMENU;
          Game.UnloadModule();
          Game.State = Game.STATES.RUNNING;
                
          if(Game.module instanceof Module){
            Game.module.dispose();
            Game.module = undefined;
          }

          //Remove all cached scripts and kill all running instances
          NWScript.Reload();

          //Resets all keys to their default state
          Game.controls.InitKeys();
          Game.MainMenu.Open();
        });

        this.selectedControl = this.BTN_LOADGAME;

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();
    Game.MenuTop.LBLH_OPT.onHoverIn();
    Game.MenuActive = true;
  }

  triggerControllerDUpPress(){
    if(!this.selectedControl){
      this.selectedControl = this.BTN_NEWGAME;
    }

    this.BTN_LOADGAME.onHoverOut();
    this.BTN_SAVEGAME.onHoverOut();
    this.BTN_FEEDBACK.onHoverOut();
    this.BTN_GRAPHICS.onHoverOut();
    this.BTN_GAMEPLAY.onHoverOut();
    this.BTN_SOUND.onHoverOut();
    this.BTN_AUTOPAUSE.onHoverOut();

    if(this.selectedControl == this.BTN_SOUND){
      this.selectedControl = this.BTN_GRAPHICS;
    }else if(this.selectedControl == this.BTN_GRAPHICS){
      this.selectedControl = this.BTN_AUTOPAUSE;
    }else if(this.selectedControl == this.BTN_AUTOPAUSE){
      this.selectedControl = this.BTN_FEEDBACK;
    }else if(this.selectedControl == this.BTN_FEEDBACK){
      this.selectedControl = this.BTN_GAMEPLAY;
    }else if(this.selectedControl == this.BTN_GAMEPLAY){
      this.selectedControl = this.BTN_SAVEGAME;
    }else if(this.selectedControl == this.BTN_SAVEGAME){
      this.selectedControl = this.BTN_LOADGAME;
    }else if(this.selectedControl == this.BTN_LOADGAME){
      this.selectedControl = this.BTN_SOUND;
    }

    this.selectedControl.onHoverIn();
  }

  triggerControllerDDownPress(){
    if(!this.selectedControl){
      this.selectedControl = this.BTN_NEWGAME;
    }

    this.BTN_LOADGAME.onHoverOut();
    this.BTN_SAVEGAME.onHoverOut();
    this.BTN_FEEDBACK.onHoverOut();
    this.BTN_GRAPHICS.onHoverOut();
    this.BTN_GAMEPLAY.onHoverOut();
    this.BTN_SOUND.onHoverOut();
    this.BTN_AUTOPAUSE.onHoverOut();

    if(this.selectedControl == this.BTN_LOADGAME){
      this.selectedControl = this.BTN_SAVEGAME;
    }else if(this.selectedControl == this.BTN_SAVEGAME){
      this.selectedControl = this.BTN_GAMEPLAY;
    }else if(this.selectedControl == this.BTN_GAMEPLAY){
      this.selectedControl = this.BTN_FEEDBACK;
    }else if(this.selectedControl == this.BTN_FEEDBACK){
      this.selectedControl = this.BTN_AUTOPAUSE;
    }else if(this.selectedControl == this.BTN_AUTOPAUSE){
      this.selectedControl = this.BTN_GRAPHICS;
    }else if(this.selectedControl == this.BTN_GRAPHICS){
      this.selectedControl = this.BTN_SOUND;
    }else if(this.selectedControl == this.BTN_SOUND){
      this.selectedControl = this.BTN_LOADGAME;
    }

    this.selectedControl.onHoverIn();
  }

  triggerControllerAPress(){
    if(this.selectedControl instanceof GUIControl){
      this.selectedControl.click();
    }
  }

  triggerControllerRStickYPress( positive = false ){
    if(positive){
      this.LB_DESC.scrollUp();
    }else{
      this.LB_DESC.scrollDown();
    }
  }

  triggerControllerBumperLPress(){
    Game.MenuTop.BTN_MAP.click();
  }

  triggerControllerBumperRPress(){
    Game.MenuTop.BTN_EQU.click();
  }

}

module.exports = MenuOptions;