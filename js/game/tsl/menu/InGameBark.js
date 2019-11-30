/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The InGameBark menu class.
 */

class InGameBark extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.args = $.extend({
      loadscreen: '',
    }, this.args);

    this.LoadMenu({
      name: 'barkbubble_p',
      scale: false,
      onLoad: () => {

        this.LBL_BARKTEXT = this.getControlByName('LBL_BARKTEXT');

        this.LBL_BARKTEXT.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    });
  }

  bark(entry = null){
    if(entry != null){
      this.Show();

      this.LBL_BARKTEXT.setText(entry.text);

      let size = new THREE.Vector3();
      this.LBL_BARKTEXT.textGeometry.boundingBox.getSize(size);
      
      //this.tGuiPanel.extent.width = Math.ceil(size.x) + 14;
      this.tGuiPanel.extent.height = Math.ceil(size.y) + 14;
      this.tGuiPanel.resizeControl();

      this.tGuiPanel.widget.position.x = -window.innerWidth/2 + this.tGuiPanel.extent.width/2 + 10;
      this.tGuiPanel.widget.position.y = window.innerHeight/2 - this.tGuiPanel.extent.height/2 - 134

      this.LBL_BARKTEXT.setText(entry.text);
      if(entry.sound != ''){
        console.log('lip', entry.sound);
        ResourceLoader.loadResource(ResourceTypes['lip'], entry.sound, (buffer) => {
          if(entry.speaker instanceof ModuleCreature){
            entry.speaker.setLIP(new LIPObject(buffer));
          }
        });
        Game.InGameDialog.audioEmitter.PlayStreamWave(entry.sound, null, (error = false) => {
          if(!error){
            this.Close();
          }else{
            setTimeout( () => {
              this.Close();
            }, 3000);
          }
        });
      }else if(entry.vo_resref != ''){
        console.log('lip', entry.vo_resref);
        ResourceLoader.loadResource(ResourceTypes['lip'], entry.vo_resref, (buffer) => {
          if(entry.speaker instanceof ModuleCreature){
            entry.speaker.setLIP(new LIPObject(buffer));
          }
        });
        Game.InGameDialog.audioEmitter.PlayStreamWave(entry.vo_resref, null, (error = false) => {
          if(!error){
            this.Close();
          }else{
            setTimeout( () => {
              this.Close();
            }, 3000);
          }
        });
      }else{
        console.error('VO ERROR', entry);
        setTimeout( () => {
          this.Close();
        }, 3000);
      }

    }
  }

}

module.exports = InGameBark;