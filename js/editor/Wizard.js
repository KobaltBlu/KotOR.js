class Wizard {

  constructor() {
    console.log('Wizard');
    this._destroyed = false;

    //this.$wizard.pre
  }

  //Show the Wizard
  Show(){
    this.$wizard.filter('.modal').modal('show');

    if(typeof this.$menuAccent == 'undefined'){
      this.$menuAccent = $('<div class="menu-accent"><span class="inner"></span></div>');
      $('.modal-content', this.$wizard).prepend(this.$menuAccent);
    }
    console.log('show', typeof this.$menuAccent);

  }

  //Hide the Wizard
  Hide(){
    this.$wizard.filter('.modal').modal('hide');
  }

  Dismiss(){
    this.Hide();
  }

  Close(){
    this.$wizard.on('hidden.bs.modal', () => {
      this.$wizard.data('bs.modal', null);
    }).filter('.modal').modal('hide');
    this._destroyed = true;
  }


}
module.exports = Wizard;
