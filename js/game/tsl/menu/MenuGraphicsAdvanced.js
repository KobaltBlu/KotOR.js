/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The MenuGraphics menu class.
 */

class MenuGraphicsAdvanced extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.background = 'blackfill';
    this.voidFill = true;

    this.LoadMenu({
      name: 'optgraphicadv_p',
      onLoad: () => {

        this.LBL_TITLE = this.getControlByName('LBL_TITLE');
        this.LB_DESC = this.getControlByName('LB_DESC');

        this.BTN_ANTIALIAS = this.getControlByName('BTN_ANTIALIAS');
        this.BTN_ANTIALIASLEFT = this.getControlByName('BTN_ANTIALIASLEFT');
        this.BTN_ANTIALIASRIGHT = this.getControlByName('BTN_ANTIALIASRIGHT');

        this.BTN_ANISOTROPY = this.getControlByName('BTN_ANISOTROPY');
        this.BTN_ANISOTROPYLEFT = this.getControlByName('BTN_ANISOTROPYLEFT');
        this.BTN_ANISOTROPYRIGHT = this.getControlByName('BTN_ANISOTROPYRIGHT');

        this.BTN_TEXQUAL = this.getControlByName('BTN_TEXQUAL');
        this.BTN_TEXQUALLEFT = this.getControlByName('BTN_TEXQUALLEFT');
        this.BTN_TEXQUALRIGHT = this.getControlByName('BTN_TEXQUALRIGHT');

        this.CB_FRAMEBUFF = this.getControlByName('CB_FRAMEBUFF');
        this.CB_VSYNC = this.getControlByName('CB_VSYNC');
        this.CB_SOFTSHADOWS = this.getControlByName('CB_SOFTSHADOWS');

        this.BTN_DEFAULT = this.getControlByName('BTN_DEFAULT');
        this.BTN_CANCEL = this.getControlByName('BTN_CANCEL');
        this.BTN_BACK = this.getControlByName('BTN_BACK');

        this.BTN_ANTIALIASLEFT.border.dimension = 0;
        this.BTN_ANISOTROPYLEFT.border.dimension = 0;
        this.BTN_TEXQUALLEFT.border.dimension = 0;

        this.tGuiPanel.widget.add(this.BTN_TEXQUALLEFT.createControl());
        this.tGuiPanel.widget.add(this.BTN_ANISOTROPYLEFT.createControl());
        this.tGuiPanel.widget.add(this.BTN_ANTIALIASLEFT.createControl());

        this.BTN_BACK.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });
        this._button_b = this.BTN_BACK;

        this.BTN_TEXQUALRIGHT.addEventListener('click', (e) => {
          let quality = iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
          quality++;
          if(quality >= Global.kotor2DA.texpacks.RowCount) quality = Global.kotor2DA.texpacks.RowCount-1;
          iniConfig.setProperty('Graphics Options.Texture Quality', quality);
          this.updateTextureQualityLabel();
        });

        this.BTN_TEXQUALLEFT.addEventListener('click', (e) => {
          let quality = iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
          quality--;
          if(quality < 0) quality = 0;
          iniConfig.setProperty('Graphics Options.Texture Quality', quality);
          this.updateTextureQualityLabel();
        });

        // this.CB_FRAMEBUFF.onValueChanged = (value) => {
        // 
        // };
        // this.CB_FRAMEBUFF.attachINIProperty('Graphics Options.Grass');

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();

    this.updateTextureQualityLabel();

    this.BTN_ANTIALIAS.hide();
    this.BTN_ANTIALIASLEFT.hide();
    this.BTN_ANTIALIASRIGHT.hide();

    this.BTN_ANISOTROPY.hide();
    this.BTN_ANISOTROPYLEFT.hide();
    this.BTN_ANISOTROPYRIGHT.hide();

    this.CB_FRAMEBUFF.hide();
    this.CB_VSYNC.hide();
    this.CB_SOFTSHADOWS.hide();

  }

  Close(){
    super.Close();
    const quality = iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
    if(quality != TextureLoader.TextureQuality){
      TextureLoader.TextureQuality = quality;
      Game.ReloadTextureCache();
      iniConfig.save();
    }
  }

  updateTextureQualityLabel(){
    const quality = iniConfig.getProperty('Graphics Options.Texture Quality') || 0;
    const _2darow = Global.kotor2DA.texpacks.rows[quality];
    if(_2darow){
      this.BTN_TEXQUAL.setText(Global.kotorTLK.GetStringById(_2darow.strrefname));
    }

    if(quality <= 0){
      this.BTN_TEXQUALLEFT.hide();
    }else{
      this.BTN_TEXQUALLEFT.show();
    }

    if(quality >= Global.kotor2DA.texpacks.RowCount-1){
      this.BTN_TEXQUALRIGHT.hide();
    }else{
      this.BTN_TEXQUALRIGHT.show();
    }

  }

}

module.exports = MenuGraphicsAdvanced;