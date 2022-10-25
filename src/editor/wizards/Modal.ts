import { TemplateEngine } from "../TemplateEngine";
import { Wizard } from "./";

export class Modal extends Wizard {
  $title: JQuery<HTMLElement>;
  $close: JQuery<HTMLElement>;

  constructor(args: any = {}){

    super();

    this.args = Object.assign({
      'title': '',
      'message': '',
      'onClose': null
    }, args);

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-info.html', null, (tpl: string) => {

      this.$wizard = $(tpl);

      this.$title = $('#modal-info-title', this.$wizard);
      this.$body = $('#modal-info-body', this.$wizard);
      this.$close = $('#modal-info-close', this.$wizard);

      this.$body.html(this.args.message);

      this.$close.on('click', (e: any) => {
        e.preventDefault();
        this.Close();
      });

      $('body').append(this.$wizard);
      this.$wizard.filter('.modal').modal({
          backdrop: 'static',
          keyboard: false
      });

      this.$wizard.on('hidden.bs.modal', () => {
        this.$wizard.data('bs.modal', null);
        this.$wizard.remove();
      });

    });

  }

}
