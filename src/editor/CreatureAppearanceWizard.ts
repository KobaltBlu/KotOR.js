import { TwoDAManager } from "../managers/TwoDAManager";
import { OdysseyModel3D } from "../three/odyssey";
import { AppearanceLoader } from "./AppearanceLoader";
import { TemplateEngine } from "./TemplateEngine";
import { UI3DRenderer } from "./UI3DRenderer";
import { Wizard } from "./Wizard";
import * as THREE from "three";

export class CreatureAppearanceWizard extends Wizard {
  appearance_id: number;
  $list: JQuery<HTMLElement>;
  $btnChoose: JQuery<HTMLElement>;
  ui3DRenderer: any;
  appearanceCount: any;
  queue: any[];

  constructor( onSelect?: Function, onClose?: Function ){
    super();

    //Variables
    this.appearance_id = -1;

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-creature-appearance.html', null, (tpl: string) => {
      this.$wizard = $(tpl);

      //DOM Elements
      this.$list = $('#modal-creature-appearance-list', this.$wizard);
      this.$btnChoose = $('#modal-creature-appearance-choose', this.$wizard);

      this.$btnChoose.on('click', (e: any) => {

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
      
      this.appearanceCount = TwoDAManager.datatables.get('appearance')?.RowCount;

      this.queue = [];

      for(let i = 0; i < this.appearanceCount; i++){
        let $appearanceBlock = $('<div class="col-xs-3 appearance-block" />');

        let appearanceData = TwoDAManager.datatables.get('appearance')?.rows[i];

        $appearanceBlock.addClass('noselect').addClass('model-thumbnail').attr('tabindex', 1);
        ($appearanceBlock as any).appId = appearanceData['(Row Label)'];
        ($appearanceBlock as any).isRendered = false;

        let $image = $('<img style="visibility: hidden;"/>');
        $image.width(dims.width).height(dims.height);

        $appearanceBlock.append($image).append('<b>'+appearanceData['label']+'</b>');

        this.$list.append($appearanceBlock);

        this.queue[appearanceData['(Row Label)']] = $appearanceBlock;

        $appearanceBlock.click( (e: any) => {
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
    let maxWidth = (this.$list.width() as number / 4);
    return {width: maxWidth, height: maxWidth * 2};
  }

  IsOnscreen(el: any){
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

  RenderView($element: JQuery<HTMLElement>){
    return new Promise<void>( (resolve, reject ) => {

      let appearanceLoader = new AppearanceLoader({
        id: ($element as any).appId,
        context: this.ui3DRenderer
      });

      appearanceLoader.GetModel( (model: OdysseyModel3D) => {
        let scene = this.ui3DRenderer.ResetScene();
        scene.add(model);

        let center = new THREE.Vector3()
        model.box.getCenter(center);
        if(!isNaN(center.length())){
          model.position.set(-center.x, -center.y, -center.z);
        }else{
          model.position.set(0, 0, 0);
        }

        this.ui3DRenderer.Render();
        $('img', $element).attr('src', this.ui3DRenderer.GetRenderedImage()).css('visibility', 'visible');
        resolve();
      }, (e: any) => {
        resolve();
      });

    });
  }


}
