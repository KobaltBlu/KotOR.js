import { Forge } from "../Forge";
import { Wizard } from "./";
import { Ractive } from "ractive";

export class LevelSelectWizard extends Wizard {
  data: any;
  ractive: any;

  constructor(selected = -1, private onSelect?: Function){
    super({
      title: 'Level Select',
      buttons: [
        {
          name: 'Choose Level',
          onClick: () => {
            //e.preventDefault();
    
            if(typeof this.onSelect == 'function')
              this.onSelect(this.data.selected, this.data.levels[this.data.selected]);
    
            this.Hide();
          }
        }
      ]
    });

    //Variables
    this.data = {
      levels: Forge.GameMaps,
      selected: selected
    };
    
    this.onSelect = onSelect;

    this.ractive = new Ractive({
      target: this.$body[0],
      template: `
<ul id="modal-level-list" class="list-group my-list-group" style="max-height: calc(100vh - 280px); overflow-y: scroll;">
  <li class="list-group-item {{#if selected == -1}}selected{{/if}}" data-index="-1" on-click="levelSelect">None - None</li>
  {{#each levels: i}}
    <li class="list-group-item {{#if selected == i}}selected{{/if}}" data-index="{{i}}" on-click="levelSelect">{{module}} - {{name}}</li>
  {{/each}}
</ul>
      `,
      data: this.data,
      on: {
        levelSelect(ctx: any){
          this.set('selected', ctx.node.dataset.index);
        }
      }
    });

    this.Show();

  }

}
