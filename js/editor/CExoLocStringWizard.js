class CExoLocStringWizard extends Wizard {

  constructor(args = {}){

    super();

    this.args = $.extend({
      'CExoLocString': null,
      'onSave': null
    }, args);
    console.log('CExoLocStringWizard', this);

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-cexolocstring.html', null, (tpl) => {
      this.$wizard = $(tpl);

      //KotOR Elements
      this.$resref = $('#modal-cexolocstring-resref', this.$wizard);
      this.$string = $('#modal-cexolocstring-string', this.$wizard);
      this.$btnAddString = $('#modal-cexolocstring-btn-add-string', this.$wizard);
      this.$listStrings = $('#modal-cexolocstring-substrings', this.$wizard);
      this.$btnSave = $('#modal-cexolocstring-save', this.$wizard);

      this.$resref.val(this.args['CExoLocString'].RESREF);

      this.$resref.on('input', (e) => {
        this.$string.val( ipcRenderer.sendSync( 'TLKGetStringById', parseInt( this.$resref.val() ) ).Value );
      }).on('keyup', (e) => {
        if(this.$resref.val() == '-'){
          this.$resref.val(-1);
        }

        this.$resref.val(this.$resref.val().replace(/^-?[0-9]\d*(\.\d+)?$/,''));
      });

      this.$string.val( ipcRenderer.sendSync( 'TLKGetStringById', parseInt( this.$resref.val() ) ).Value );

      this.$btnAddString.on('click', (e) => {
        e.preventDefault();

        let wiz = new CExoLocSubStringWizard({
          onSave: (subString) => {
            console.log(subString);
            this.args['CExoLocString'].AddSubString( subString );
            let $subString = this.BuildSubStringElement( { subString: subString } );
            if($subString != null){
              this.$listStrings.append($subString);
            }
          }
        });

      });

      $.each(this.args['CExoLocString'].GetStrings(), (i, substring) => {
        let $subString = this.BuildSubStringElement( { subString: subString } );
        this.$listStrings.append( $subString );
      });

      this.$btnSave.on('click', (e) => {
        e.preventDefault();

        this.args['CExoLocString'].RESREF = this.$resref.val();

        if(this.args.onSave != null)
          this.args.onSave();

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

  BuildSubStringElement( _args = {} ) {

    let args = $.extend({
      subString: null,
      onEdit: null,
      onRemove: null
    }, _args);

    let $subString = null;
    console.log(args.subString)
    if( args.subString instanceof CExoLocSubString ){

      $subString = $('<li />');
      let $text = $('<b class="col-xs-10" />');
      let $btnEdit = $('<a href="#" class="btn-edit col-xs-1 glyphicon glyphicon-edit" title="Edit SubString" />');
      let $btnRemove = $('<a href="#" class="btn-remove col-xs-1 glyphicon glyphicon-remove" title="Remove SubString" />');

      $subString.append($text).append($btnEdit).append($btnRemove);

      $text.text( args.subString.getString() );

      $btnEdit.on('click', (e) => {
        e.preventDefault();

        if( args.onEdit != null )
          args.onEdit();

          let wiz = new CExoLocSubStringWizard({
            'CExoLocSubString': args.subString,
            onSave: (subString) => {
              $text.text( subString.getString() );
            }
          });

      });

      $btnRemove.on('click', (e) => {
        e.preventDefault();

        if( args.onRemove != null )
          args.onRemove();

        let index = this.args['CExoLocString'].GetStrings().indexOf( args.subString );
        if(index > -1) {
          this.args['CExoLocString'].GetStrings().splice( index, 1 );
        }

        $subString.remove();

      });

      $subString.data( 'CExoLocSubString', args.subString );

    }

    return $subString;

  }

}


module.exports = CExoLocStringWizard;
