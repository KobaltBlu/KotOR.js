import { BIFManager } from "../managers/BIFManager";
import { KEYManager } from "../managers/KEYManager";
import { ResourceTypes } from "../resource/ResourceTypes";
import { Forge } from "./Forge";
import { TemplateEngine } from "./TemplateEngine";
import { Wizard } from "./Wizard";
import "jquery-ui";

export class TemplateResRefPickerWizard extends Wizard {
  props: { autoShow: boolean; selected: string; restype: number; onChoose: any; };
  selected: any;
  $gameList: JQuery<HTMLElement>;
  $projectList: JQuery<HTMLElement>;
  $choose: JQuery<HTMLElement>;

  constructor(props = {}){
    super();

    this.props = Object.assign({
      autoShow: true,
      selected: '',
      restype: 0,
      onChoose: null
    }, props);


    //Variables
    this.selected = this.props.selected;

    //Load the HTML from the template file
    TemplateEngine.GetTemplateAsync('templates/modal-templateresref.html', null, (tpl: string) => {
      this.$wizard = $(tpl);

      //DOM Elements
      this.$gameList = $('#modal-templateresref-game-list', this.$wizard);
      this.$projectList = $('#modal-templateresref-project-list', this.$wizard);
      this.$choose = $('#modal-templateresref-choose', this.$wizard);

      let templates = BIFManager.GetBIFByName('templates').GetResourcesByType(this.props.restype);

      for(let i = 0; i < templates.length; i++){
        let name = KEYManager.Key.GetFileLabel(templates[i].ID);
        let $item = $('<li class="list-group-item" data-name="'+name+'">'+name+'</li>');
        this.$gameList.append($item);

        if(name == this.selected)
          $item.addClass('selected');

        $item.click( (e: any) => {
          e.preventDefault();

          $('li.selected', this.$gameList).removeClass('selected');
          $item.addClass('selected');
          this.selected = $item.attr('data-name');

        });

      }

      let templatesProj = Forge.Project.GetTemplatesByType(ResourceTypes.getKeyByValue(this.props.restype));

      for(let i = 0; i < templatesProj.length; i++){
        let template = templatesProj[i];
        let $item = $('<li class="list-group-item" data-name="'+template.name+'">'+template.name+'</li>');
        this.$projectList.append($item);

        if(name == this.selected)
          $item.addClass('selected');

        $item.click( (e: any) => {
          e.preventDefault();

          $('li.selected', this.$projectList).removeClass('selected');
          $item.addClass('selected');
          this.selected = $item.attr('data-name');

        });

      }

      this.$choose.on('click', (e: any) => {
        this.Hide();

        if(this.props.onChoose != null)
          this.props.onChoose(this.selected);

      });

      $('body').append(this.$wizard);
      let $modal = this.$wizard.filter('.modal').modal({
        keyboard: false,
        backdrop: false,
        // show: this.props.autoShow ? true : false
      });

      this.$wizard.draggable({
          handle: ".modal-header"
      });

      if(this.props.autoShow)
        this.Show();

    });

  }

}
