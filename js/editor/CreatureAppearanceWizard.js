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

  async Update(){
    if(!this._destroyed){
      await this.RenderVisibleQueue();

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

  async RenderVisibleQueue(index = 0){

    let $item = this.queue[index];

    if(index >= this.appearanceCount)
      return

    if(typeof $item != 'undefined'){
      if($item.isVisible() && !$item.isRendered){
        $item.isRendered = true;
        await this.RenderView($item);
        this.queue[index] = undefined;
        this.RenderVisibleQueue(++index);
      }else{
        this.RenderVisibleQueue(++index);
      }
    }else{
      this.RenderVisibleQueue(++index);
    }

  }

  RenderView($element){
    return new Promise( (resolve, reject ) => {

      let appearanceLoader = new AppearanceLoader({
        id: $element.appId,
        context: this.ui3DRenderer
      });

      appearanceLoader.GetModel( (model) => {
        let scene = this.ui3DRenderer.ResetScene();
        scene.add(model);

        let center = model.box.getCenter();
        if(!isNaN(center.length())){
          model.position.set(-center.x, -center.y, -center.z);
        }else{
          model.position.set(0, 0, 0);
        }

        this.ui3DRenderer.Render();
        $('img', $element).attr('src', this.ui3DRenderer.GetRenderedImage()).css('visibility', 'visible');
        resolve();
      }, (e) => {
        resolve();
      });

    });
  }


}


module.exports = CreatureAppearanceWizard;
