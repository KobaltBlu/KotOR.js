/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuGraphics menu class.
 */

class MenuGraphics extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = '1600x1200back';
    this.voidFill = true;

    this.LoadMenu({
      name: 'optgraphics',
      onLoad: () => {

        this.LBL_TITLE = this.getControlByName('LBL_TITLE');
        this.SLI_GAMMA = this.getControlByName('SLI_GAMMA');
        this.LBL_GAMMA = this.getControlByName('LBL_GAMMA');
        this.LB_DESC = this.getControlByName('LB_DESC');
        this.BTN_RESOLUTION = this.getControlByName('BTN_RESOLUTION');

        this.CB_SHADOWS = this.getControlByName('CB_SHADOWS');
        this.CB_GRASS = this.getControlByName('CB_GRASS');


        this.BTN_DEFAULT = this.getControlByName('BTN_DEFAULT');
        this.BTN_ADVANCED = this.getControlByName('BTN_ADVANCED');
        this.BTN_BACK = this.getControlByName('BTN_BACK');

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          /*this.Hide();
          if(Game.Mode == Game.MODES.INGAME){
            Game.MenuOptions.Show();
          }else{
            Game.MainOptions.Show();
          }*/
          this.Close();
        });
        this._button_b = this.BTN_BACK;

        this.SLI_GAMMA.onValueChanged = (value) => {
          //let gamma = (1.5 * value) + .25;
          let contrast = (50 * ((value*2) - 1) )*-1;

          Game.canvas.style.filter = 'contrast('+(100 + contrast)+'%)';
        };

        this.BTN_RESOLUTION.addEventListener('click', (e) => {
          Game.MenuResolutions.Open();
        });

        this.BTN_RESOLUTION.hide();

        this.CB_GRASS.onValueChanged = (value) => {
          //Toggle Grass
          if(Game.module){
            Game.module.grassMaterial.visible = value;
          }
        };
        this.CB_GRASS.attachINIProperty('Graphics Options.Grass');

        this.CB_SHADOWS.onValueChanged = () => {
          //Toggle Shadows
        };
        this.CB_SHADOWS.attachINIProperty('Graphics Options.Shadows');

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

}

module.exports = MenuGraphics;