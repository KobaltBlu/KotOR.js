class CreatureAppearanceWizard extends Wizard {

  constructor( onSelect = null, onClose = null ){
    super();

    //Variables
    this.appearance_id = -1;

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-creature-appearance.html', null, (tpl) => {
      this.$wizard = $(tpl);

      //DOM Elements
      this.$list = $('#modal-creature-appearance-list', this.$wizard);
      this.$btnChoose = $('#modal-creature-appearance-choose', this.$wizard);

      this.$btnChoose.on('click', (e) => {

        if(onSelect != null && typeof onSelect === 'function')
          onSelect(this.appearance_id);

        this.ui3DRenderer.Destroy();
        this.ui3DRenderer = null;

        this.Close();

      });

      //Add the new wizard to the DOM
      $('body').append(this.$wizard);
      this.$wizard.filter('.modal').modal({
          backdrop: 'static',
          keyboard: false
      });

      let dims = this.GetCellDimensions();

      this.ui3DRenderer = new UI3DRenderer({
        width: dims.width,
        height: dims.height
      });

      this.appearanceCount = Global.kotor2DA['appearance'].RowCount;

      this.queue = [];

      for(let i = 0; i < this.appearanceCount; i++){
        let $appearanceBlock = $('<div class="col-xs-3 appearance-block" />');

        let appearanceData = Global.kotor2DA['appearance'].rows[i];

        $appearanceBlock.addClass('noselect').addClass('model-thumbnail').attr('tabindex', 1);

        $appearanceBlock.appId = appearanceData['(Row Label)'];
        $appearanceBlock.isRendered = false;

        let $image = $('<img style="visibility: hidden;"/>');
        $image.width(dims.width).height(dims.height);

        $appearanceBlock.append($image).append('<b>'+appearanceData['label']+'</b>');

        this.$list.append($appearanceBlock);

        this.queue[appearanceData['(Row Label)']] = $appearanceBlock;

        $appearanceBlock.click( (e) => {
          e.preventDefault();
          $('.appearance-block', this.$list).removeClass('selected');
          $appearanceBlock.addClass('selected');
        });





      }

      this.Update();


    });

  }

  Update(){
    if(!this._destroyed){
      this.RenderVisibleQueue();

      requestAnimationFrame( () => {
        this.Update();
      });
    }
  }

  GetCellDimensions(){

    let maxWidth = (this.$list.width() / 4);

    return {width: maxWidth, height: maxWidth * 2};

  }

  IsOnscreen(el){
    let rect = el.getBoundingClientRect();
    return (
           (rect.x + rect.width) < 0
             || (rect.y + rect.height) < 0
             || (rect.x > window.innerWidth || rect.y > window.innerHeight)
         );
  }

  RenderVisibleQueue(index = 0){

    let $item = this.queue[index];

    if(index >= this.appearanceCount)
      return

    if(typeof $item != 'undefined'){
      if($item.isVisible() && !$item.isRendered){
        $item.isRendered = true;
        this.RenderView($item, () => {
          this.queue[index] = undefined;
          this.RenderVisibleQueue(index+=1);
        });
      }else{
        this.RenderVisibleQueue(index+=1);
      }

    }else{
      this.RenderVisibleQueue(index+=1);
    }

  }

  RenderView($element, onRender = null){

    let appearanceLoader = new AppearanceLoader({
      id: $element.appId
    });

    appearanceLoader.GetModel( (model) => {
      //let dims = this.GetCellDimensions();
      //this.ui3DRenderer.SetSize(dims.width, dims.height);

      let scene = this.ui3DRenderer.ResetScene();
      scene.add(model);

      this.ui3DRenderer.Render();
      $('img', $element).attr('src', this.ui3DRenderer.GetRenderedImage()).css('visibility', 'visible');

      if(onRender != null && typeof onRender === 'function')
        onRender();

    }, (e) => {
      console.error(e);
      if(onRender != null && typeof onRender === 'function')
        onRender();
    });

  }


}


module.exports = CreatureAppearanceWizard;
