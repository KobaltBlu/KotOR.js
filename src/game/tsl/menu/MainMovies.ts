import { MainMovies as K1_MainMovies } from "@/game/kotor/KOTOR";
import { GUIMovieItem } from "@/game/tsl/gui/GUIMovieItem";
import { GameState } from "@/GameState";
import type { GUILabel, GUIButton, GUIListBox } from "@/gui";
import type { ITwoDARowData } from "@/resource/TwoDAObject";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.Game);

/**
 * MainMovies class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MainMovies.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MainMovies extends K1_MainMovies {

  declare LBL_TITLE: GUILabel;
  declare LBL_UNLOCKED: GUILabel;
  declare LBL_UNLOCKED_VALUE: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare LB_MOVIES: GUIListBox;

  selected: ITwoDARowData | undefined;
  selectedIndex: number = 0;
  movieList: ITwoDARowData[] = [];

  constructor(){
    super();
    this.gui_resref = 'titlemovie_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    log.trace('menuControlInitializer entered', { skipInit });
    await super.menuControlInitializer(true);
    if(skipInit) { log.trace('menuControlInitializer skipInit, returning'); return; }
    return new Promise<void>((resolve, _reject) => {
      log.debug('MainMovies initializing LB_MOVIES');
      this.LB_MOVIES.GUIProtoItemClass = GUIMovieItem;
      
      const table = GameState.TwoDAManager.datatables.get('movies');
      for(let i = 0; i < table.RowCount; i++){
        const row = table.getRowByIndex(i);
        this.LB_MOVIES.addItem(row);
        this.movieList.push(row);
      }

      this.LBL_UNLOCKED_VALUE.setText(`${table.RowCount} / ${table.RowCount}`);

      this.LB_MOVIES.onSelected = (node: ITwoDARowData) => {
        log.info('Movie selected', node.__rowlabel ?? node.__index);
        this.selected = node;
        this.selectedIndex = this.movieList.indexOf(node);
      }

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        log.debug('MainMovies BTN_BACK clicked');
        this.close();
      });
      this._button_b = this.BTN_BACK;

      log.trace('MainMovies menuControlInitializer completed');
      resolve();
    });
  }
  
}

