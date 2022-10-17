import { Wizard } from "./Wizard";

export class LevelSelectWizard extends Wizard {

  constructor(selected = -1, onSelect?: Function){
    super({
      title: 'Level Select',
      buttons: [
        {
          name: 'Choose Level',
          onClick: () => {
            //e.preventDefault();

            console.log(typeof this.onSelect, typeof this.onSelect == 'function');
    
            if(typeof this.onSelect == 'function')
              this.onSelect(this.data.selected, this.data.levels[this.data.selected]);
    
            this.Hide();
          }
        }
      ]
    });

    //Variables
    this.data = {
      levels: GameMaps,
      selected: selected
    };
    
    this.onSelect = onSelect;

    this.ractive = Ractive({
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
        levelSelect(ctx){
          this.set('selected', ctx.node.dataset.index);
        }
      }
    });

    this.Show();

  }

}
