/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The InGameConfirm menu class.
 */

class InGameConfirm extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.LoadMenu({
      name: 'confirm',
      onLoad: () => {

        this.LB_MESSAGE = this.getControlByName('LB_MESSAGE');
        this.BTN_CANCEL = this.getControlByName('BTN_CANCEL');
        this.BTN_OK = this.getControlByName('BTN_OK');

        this.BTN_OK.onClick = (e) => {
          e.stopPropagation();
          this.Hide()
        }

        this.BTN_CANCEL.onClick = (e) => {
          e.stopPropagation();
          this.Hide()
        }

        this.tGuiPanel.widget.position.z = 10;

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();
  }

  Update(delta){

    this.tGuiPanel.widget.position.x = 0;//(window.innerWidth/2) - (Game.InGamePause.width/2) - 20;
    this.tGuiPanel.widget.position.y = 0;//(window.innerHeight/2) - (Game.InGamePause.height/2) - 55;

    //this.tGuiPanel.update(delta);
    //this.LBL_PAUSEREASON.update(delta);
    //this.LBL_PRESS.update(delta);

  }

  ShowTutorialMessage(id = 39, nth = 0){

    this.LB_MESSAGE.extent.top = 0;
    let tlkId = parseInt(Global.kotor2DA.tutorial.rows[id]['message'+nth]);
    this.LB_MESSAGE.clearItems();
    this.LB_MESSAGE.addItem(Global.kotorTLK.GetStringById(tlkId))

    let messageHeight = this.LB_MESSAGE.getNodeHeight(this.LB_MESSAGE.children[0]);

    this.LB_MESSAGE.extent.height = messageHeight;
    this.tGuiPanel.extent.height = 87 + messageHeight;

    this.BTN_CANCEL.hide();
    this.BTN_OK.extent.top = this.tGuiPanel.extent.height/2 + this.BTN_OK.extent.height/2;

    this.tGuiPanel.resizeControl();
    this.LB_MESSAGE.resizeControl();

    this.tGuiPanel.recalculate();

    this.Show();

  }

}

module.exports = InGameConfirm;