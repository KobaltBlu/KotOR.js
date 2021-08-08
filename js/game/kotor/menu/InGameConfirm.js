/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The InGameConfirm menu class.
 */

class InGameConfirm extends GameMenu {
  
  constructor( args = {} ){
    super(args);

    this.isOverlayGUI = true;
    this.isModal = true;

    this.LoadMenu({
      name: 'confirm',
      onLoad: () => {

        this.LB_MESSAGE = this.getControlByName('LB_MESSAGE');
        this.BTN_CANCEL = this.getControlByName('BTN_CANCEL');
        this.BTN_OK = this.getControlByName('BTN_OK');

        this.BTN_OK.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });
        this._button_a = this.BTN_OK;

        this.BTN_CANCEL.addEventListener('click', (e) => {
          e.stopPropagation();
          this.Close();
        });
        this._button_b = this.BTN_CANCEL;

        this.tGuiPanel.widget.position.z = 10;

        if(typeof this.onLoad === 'function')
          this.onLoad();

      }
    })

  }

  Show(){
    super.Show();
    this.RecalculatePosition();
  }

  Update(delta){
    super.Update(delta);

    if(!this.bVisible)
      return;

    this.tGuiPanel.widget.position.x = 0;
    this.tGuiPanel.widget.position.y = 0;

    this.LB_MESSAGE.updateBounds();
    this.BTN_CANCEL.updateBounds();
    this.BTN_OK.updateBounds();

  }

  ShowTutorialMessage(id = 39, nth = 0){

    if(!Game.TutorialWindowTracker[id]){

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

      this.Open();

      Game.TutorialWindowTracker[id] = 0;

    }

  }

}

module.exports = InGameConfirm;