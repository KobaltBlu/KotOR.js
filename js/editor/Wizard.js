class Wizard {

  constructor(args = {}) {
    console.log('Wizard');
    this._destroyed = false;

    args = Object.assign({
      title: '',
      body: '',
      footer: '',
      buttons: [],
      onClose: null,
      show: false,
      destroyOnClose: false
    }, args);
    this.args = args;

    this.$wizard = $(`
      <!-- Info Modal -->
      <div class="modal" role="dialog">
        <div class="modal-dialog">
          <!-- Modal content-->
          <div class="modal-content">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal">&times;</button>
              <h4 id="modal-info-title" class="modal-title">${args.title}</h4>
            </div>
            <div class="modal-body">
              <p id="modal-info-body">${args.body}</p>
            </div>
            <div class="modal-footer">
              ${args.footer}
            </div>
          </div>
        </div>
      </div>
    `);

    this.$wizard.filter('.modal').modal({
      backdrop: 'static',
      keyboard: false,
      show: args.show
    });

    this.$header = $('.modal-header', this.$wizard);
    this.$body = $('.modal-body', this.$wizard);
    this.$footer = $('.modal-footer', this.$wizard);

    for(let i = 0; i < args.buttons.length; i++){

      let button = Object.assign({
        name: '',
        onClick: null
      }, args.buttons[i]);

      let $button = $('<button id="modal-info-close" type="button" class="btn btn-default">'+button.name+'</button>');
      $button.on('click', (e) => {
        if(typeof button.onClick === 'function')
          button.onClick();
      });
      this.$footer.append($button);

    }

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

    if(typeof this.args.onClose === 'function'){
      this.args.onClose();
    }

    this.$wizard.on('hidden.bs.modal', () => {
      this.$wizard.data('bs.modal', null);
    }).filter('.modal').modal('hide');
    this._destroyed = true;

    if(this.args.destroyOnClose){
      this.$wizard.remove();
    }

  }


}
module.exports = Wizard;
