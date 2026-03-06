import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { TwoDAObject } from "../../../resource/TwoDAObject";

interface MovieItem {
  name: string;
  strrefname: number;
  strefdesc: number;
  /**
   * Whether the movie should be shown even if it has not been played
   */
  alwaysshow: boolean;
  /**
   * Whether the movie has been played in game before. This value is found in the swkotor.ini file [Movies Shown] section.
   */
  played: boolean;
  /**
   * The order of the movie in the list
   */
  order: number;
}

class GUIMovieItem implements MovieItem {

  name: string;
  strrefname: number;
  strefdesc: number;
  alwaysshow: boolean;
  played: boolean;
  order: number;

  constructor(movie: MovieItem){
    this.name = movie.name;
    this.strrefname = movie.strrefname;
    this.strefdesc = movie.strefdesc;
    this.alwaysshow = movie.alwaysshow;
    this.played = movie.played;
    this.order = movie.order;
  }

  getName(): string {
    return GameState.TLKManager.GetStringById(this.strrefname).Value || this.name;
  }
}

/**
 * MainMovies class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MainMovies.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MainMovies extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_MOVIES: GUIListBox;
  BTN_BACK: GUIButton;

  movieList: MovieItem[] = [];

  constructor(){
    super();
    this.gui_resref = 'titlemovie';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;
      this.LB_MOVIES.setTextColor(this.LB_MOVIES.defaultColor.r, this.LB_MOVIES.defaultColor.g, this.LB_MOVIES.defaultColor.b);
      this.LB_MOVIES.onClicked = (movie: GUIMovieItem, control: any, index: number) => {
        console.log(movie);
        GameState.VideoManager.playMovie(movie.name, true);
      };
      const moviesTable = GameState.TwoDAManager.datatables.get('movies');
      for(let i = 0; i < moviesTable.RowCount; i++){
        const row = moviesTable.getRowByIndex(i);
        const movieItem: MovieItem = {
          name: TwoDAObject.normalizeValue(row.__rowlabel, 'string', ''),
          strrefname: TwoDAObject.normalizeValue(row.strrefname, 'number', -1),
          strefdesc: TwoDAObject.normalizeValue(row.strefdesc, 'number', -1),
          alwaysshow: TwoDAObject.normalizeValue(row.alwaysshow, 'boolean', false),
          played: false,
          order: TwoDAObject.normalizeValue(row.order, 'number', 999999),
        };
        this.movieList.push(movieItem);
      }

      this.movieList.sort((a, b) => a.order - b.order);
      for(const movie of this.movieList){
        this.LB_MOVIES.addItem(new GUIMovieItem(movie));
      }
      this.LB_MOVIES.updateList();
      resolve();
    });
  }

  show(){
    super.show();
    this.LB_MOVIES.clearItems();
    for(const movie of this.movieList){
      this.LB_MOVIES.addItem(new GUIMovieItem(movie));
    }
    this.LB_MOVIES.updateList();
    this.LB_MOVIES.show();
  }
  
}
