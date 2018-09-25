class Modal extends Wizard {

  constructor(args = {}){

    super();

    this.args = $.extend({
      'title': '',
      'message': '',
      'onClose': null
    }, args);

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-info.html', null, (tpl) => {

      this.$wizard = $(tpl);

      this.$title = $('#modal-info-title', this.$wizard);
      this.$body = $('#modal-info-body', this.$wizard);
      this.$close = $('#modal-info-close', this.$wizard);

      this.$body.html(this.args.message);

      this.$close.on('click', (e) => {
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
module.exports = Modal;
