import { Modal } from "./";

export class ModalMessageBox extends Modal {
  $buttons: JQuery<HTMLElement>;

  constructor(opts: any = {}){
    opts = Object.assign({
      title: '',
      message: '',
      buttons: [],
      onChoose: null
    }, opts);
    super(opts);

    this.$buttons = $('<div class="modal-buttons-wrapper" />');
    if(Array.isArray(opts.buttons)){
      opts.buttons.forEach( (button: any, i: number) => {
        let $button = $(`<a href class="btn btn-default">${button}</a>`);
        this.$buttons.append($button);
        $button.on('click', (e) => {
          e.preventDefault();
          if(typeof opts.onChoose === 'function'){
            opts.onChoose(button);
          }
          this.Close();
        });
      });
    }
    this.$body.append(this.$buttons);

  }

}
