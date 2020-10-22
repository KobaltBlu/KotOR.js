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

    let index = 0;
    for(let key in this.twoDAObject.rows){
      let row = this.twoDAObject.rows[key];

      bodyStr += '<tr tabindex="'+(index++)+'">';

      for(let propKey in row){
        if(this.twoDAObject.columns.indexOf(propKey) >= 0){
          bodyStr += '<td contenteditable="true" data-value="'+row[propKey]+'">'+row[propKey]+'</td>';
        }
      }
      bodyStr += '</tr>';
    }

    this.$tableBody.append(bodyStr);

    this.$tableHeader.append(this.$tableHeaderRow);
    this.$table.append(this.$tableHeader).append(this.$tableBody);
    this.$tabContent.append(this.$table);

    this.$tabContent.perfectScrollbar();

    $('tr', this.$tableBody).off('click').on('click', (e) => {
      $('tr', this.$tableBody).removeClass('focus').removeClass('focus-before').removeClass('focus-after');
      $(e.currentTarget).prev().addClass('focus-before');
      $(e.currentTarget).next().addClass('focus-after');
      $(e.currentTarget).addClass('focus');
    });

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
      $td.off('input').on('input', function(e){
        let $ele = $(this);
        $ele.data('value', $ele.text());
        $ele.attr('data-value', $ele.text());
      });

      $td.off('blur').on('blur', function(e){
        let $ele = $(this);
        $ele.text($ele.text().trim());

        if($ele.text() == ''){
          $ele.text('****');
        }

        $ele.data('value', $ele.text());
        $ele.attr('data-value', $ele.text());
      });
    });
    console.log('SmartifyCells: Finished');
  }

}

module.exports = TwoDAEditorTab;
