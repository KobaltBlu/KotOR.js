class CExoLocSubStringWizard extends Wizard {

  constructor(args = {}){

    super();

    this.args = $.extend({
      'CExoLocSubString': new CExoLocSubString(0, ''),
      'onSave': null,
      'onClose': null,
    }, args);
    console.log('CExoLocSubStringWizard', this);

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-substring.html', null, (tpl) => {
      this.$wizard = $(tpl);

      //KotOR Elements
      this.$string = $('#modal-cexolocsubstring-substring', this.$wizard);
      this.$gender = $('#modal-cexolocsubstring-substring-gender', this.$wizard);
      this.$language = $('#modal-cexolocsubstring-substring-language', this.$wizard);
      this.$btnSave = $('#modal-cexolocsubstring-save', this.$wizard);
      this.$btnClose = $('#modal-cexolocsubstring-close', this.$wizard);

      $.each(CExoLocString.LANGUAGEID, (key, val) => {
        this.$language.append('<option value="'+val+'">'+key+'</option>');
      });

      this.$string.val(this.args['CExoLocSubString'].getString());
      this.$language.val(this.args['CExoLocSubString'].getLanguage())
      this.$gender.val(this.args['CExoLocSubString'].getGender())

      this.$string.on('input', (e) => {
        this.args['CExoLocSubString'].setString( this.$string.val() );
      }).on('keyup', (e) => {  });

      this.$language.change( () => {
        this.args['CExoLocSubString'].setLanguage( this.$language.val() );
      });

      this.$gender.change( () => {
        this.args['CExoLocSubString'].setGender( this.$gender.val() );
      });

      this.$btnSave.on('click', (e) => {
        e.preventDefault();

        if(this.args.onSave != null)
          this.args.onSave(this.args['CExoLocSubString']);

        this.Close();

      });

      this.$btnClose.on('click', (e) => {
        e.preventDefault();

        if(this.args.onClose != null)
          this.args.onClose();

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


module.exports = CExoLocSubStringWizard;
