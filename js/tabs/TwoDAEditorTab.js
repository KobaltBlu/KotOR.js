class TwoDAEditorTab extends EditorTab {
  constructor(file){
    super();
    this.$tabName.text("2DA Editor");

    this.twoDAObject = null;

    this.OpenFile(file);


  }

  init(){

    console.log(this.twoDAObject);

    this.$tabContent.html('');

    this.$table = $('<table class="twoda" />');
    this.$tableFixed = $('<table class="twoda fixed"><thead></thead></table>');
    this.$tableHeader = $('<thead />');
    this.$tableHeaderRow = $('<tr />');
    this.$tableBody = $('<tbody />');

    for(let i = 0; i != this.twoDAObject.columns.length; i++){
      let col = this.twoDAObject.columns[i];
      if(col != '' && col != null){
        this.$tableHeaderRow.append('<th>'+col+'</th>');
      }
    }

    let bodyStr = '';

    for(let key in this.twoDAObject.rows){
      let row = this.twoDAObject.rows[key];

      bodyStr += '<tr>';

      for(let propKey in row){
        bodyStr += '<td>'+row[propKey]+'</td>';
      }
      bodyStr += '</tr>';
    }

    this.$tableBody.append(bodyStr);

    this.$tableHeader.append(this.$tableHeaderRow);
    this.$table.append(this.$tableHeader).append(this.$tableBody);
    this.$tabContent.append(this.$table);

    this.$tabContent.perfectScrollbar();

    /*setTimeout( () => {
      let $target = this.$tableHeaderRow;
      let $target_children = $target.children();

      let $clone = $target.clone();

      $clone.children().width( function(i,val) {
          return $target_children.eq(i).outerWidth(true);
      });

      $('thead', this.$tableFixed).append($clone);

      this.$tabContent.append(this.$tableFixed);
    }, 1000);*/


    this.SmartifyCells();
  }

  OpenFile(file){

    if(file instanceof EditorFile){
      file.readFile( (buffer) => {
        try{

          switch(file.reskey){
            case ResourceTypes['2da']:
              this.twoDAObject = new TwoDAObject(buffer);
              this.init();
            break;
            default:
              this.tabLoader.Dismiss();
            break;
          }
        }
        catch (e) {
          console.log(e);
          this.Remove();
        }
      });
    }
    
  }

  SmartifyCells(){
    console.log('SmartifyCells: Started');
    $('td', this.$tableBody).each( (i, td) => {
      let $td = $(td);

      $td.data('value', $td.text());

      $td.enableEditMode = () => {

        console.log($('tr td.editing', this.$tableBody));

        $('tr td.editing', this.$tableBody).each( function() {
          $(this).disableEditMode();
        });

        if(!$td.hasClass('editing')){

          $td.addClass('editing');

          let $input = $('<input style="width: 100%;" />');
          $input.val(this.GetEditableValue($td.data('value')));
          $td.html('').append($input);

          $input.on('input', () => {
            $td.data('value', $input.val());
          });

          $input.on('blur', () => {
            $td.disableEditMode();
          });

          $input.on('click', (e) => {
            e.stopPropagation();
          });

          $input.focus();

        }
      };

      $td.disableEditMode = () => {
        if($td.hasClass('editing')){
          $td.removeClass('editing');

          $td.data( 'value', this.GetDisplayValue( $td.data('value') ) );

          $td.html($td.data('value'));
        }
      };

      $td.on('dblclick', (e) => {
        e.preventDefault();
        $td.enableEditMode();
      });

    });
    console.log('SmartifyCells: Finished');
  }

  GetEditableValue(value){
    if(value == '****')
      return '';
  }

  GetDisplayValue(value){
    if(value == '')
      return '***';
  }


}

module.exports = TwoDAEditorTab;
