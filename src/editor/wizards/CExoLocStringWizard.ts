import { TLKManager } from "../../managers/TLKManager";
import { CExoLocSubString } from "../../resource/CExoLocSubString";
import { CExoLocSubStringWizard, Wizard } from "./";
import template from "../templates/modal-cexolocstring.html";

export class CExoLocStringWizard extends Wizard {
  $resref: JQuery<HTMLElement>;
  $string: JQuery<HTMLElement>;
  $btnAddString: JQuery<HTMLElement>;
  $listStrings: JQuery<HTMLElement>;
  $btnSave: JQuery<HTMLElement>;

  constructor(args = {}){

    super();

    this.args = Object.assign({
      'CExoLocString': null,
      'onSave': null
    }, args);
    console.log('CExoLocStringWizard', this);

    //Load the HTML from the template file
    this.$wizard = $(template);

    //KotOR Elements
    this.$resref = $('#modal-cexolocstring-resref', this.$wizard);
    this.$string = $('#modal-cexolocstring-string', this.$wizard);
    this.$btnAddString = $('#modal-cexolocstring-btn-add-string', this.$wizard);
    this.$listStrings = $('#modal-cexolocstring-substrings', this.$wizard);
    this.$btnSave = $('#modal-cexolocstring-save', this.$wizard);

    this.$resref.val(this.args['CExoLocString'].RESREF);

    this.$resref.on('input', (e: any) => {
      let val = parseInt(this.$resref.val() as string);
      if(val > -1){
        this.$string.val( TLKManager.TLKStrings[ val ].Value );
      }else{
        this.$string.val('')
      }
      
    }).on('keyup', (e: any) => {
      if(this.$resref.val() == '-'){
        this.$resref.val(-1);
      }

      this.$resref.val(this.$resref.val().toString().replace(/^-?[0-9]\d*(\.\d+)?$/,''));
    });

    let val = parseInt(this.$resref.val().toString());
    if(val > -1){
      this.$string.val( TLKManager.TLKStrings[ val ].Value );
    }else{
      this.$string.val('')
    }

    this.$btnAddString.on('click', (e: any) => {
      e.preventDefault();

      let wiz = new CExoLocSubStringWizard({
        onSave: (subString: CExoLocSubString) => {
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
      let $subString = this.BuildSubStringElement( { subString: substring } );
      this.$listStrings.append( $subString );
    });

    this.$btnSave.on('click', (e: any) => {
      e.preventDefault();

      this.args['CExoLocString'].RESREF = this.$resref.val();

      if(this.args.onSave != null)
        this.args.onSave();

      this.Close();

    });


    $('body').append(this.$wizard);
    this.$wizard.modal({
      backdrop: 'static',
      keyboard: false
    });
    this.$wizard.modal('show');

    this.$wizard.on('hidden.bs.modal', () => {
      this.$wizard.data('bs.modal', null);
      this.$wizard.remove();
    });

  }

  BuildSubStringElement( _args = {} ) {

    let args = Object.assign({
      subString: null,
      onEdit: null,
      onRemove: null
    }, _args);

    let $subString: JQuery<HTMLElement> = null;
    console.log(args.subString)
    if( args.subString instanceof CExoLocSubString ){

      $subString = $('<li />');
      let $text = $('<b class="col-xs-10" />');
      let $btnEdit = $('<a href="#" class="btn-edit col-xs-1 glyphicon glyphicon-edit" title="Edit SubString" />');
      let $btnRemove = $('<a href="#" class="btn-remove col-xs-1 glyphicon glyphicon-remove" title="Remove SubString" />');

      $subString.append($text).append($btnEdit).append($btnRemove);

      $text.text( args.subString.getString() );

      $btnEdit.on('click', (e: any) => {
        e.preventDefault();

        if( args.onEdit != null )
          args.onEdit();

          let wiz = new CExoLocSubStringWizard({
            'CExoLocSubString': args.subString,
            onSave: (subString: CExoLocSubString) => {
              $text.text( subString.getString() );
            }
          });

      });

      $btnRemove.on('click', (e: any) => {
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
