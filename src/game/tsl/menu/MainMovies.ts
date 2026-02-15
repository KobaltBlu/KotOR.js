import { GameState } from "../../../GameState";
import type { GUILabel, GUIButton, GUIListBox } from "../../../gui";
import { TwoDAObject } from "../../../resource/TwoDAObject";
import { MainMovies as K1_MainMovies } from "../../kotor/KOTOR";
import { GUIMovieItem } from "../gui/GUIMovieItem";

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

class GUIMovieItemTsl implements MovieItem {

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
export class MainMovies extends K1_MainMovies {

  declare LBL_TITLE: GUILabel;
  declare LBL_UNLOCKED: GUILabel;
  declare LBL_UNLOCKED_VALUE: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare LB_MOVIES: GUIListBox;

  selected: MovieItem;
  selectedIndex: number = 0;
  movieList: MovieItem[] = [];

  constructor(){
    super();
    this.gui_resref = 'titlemovie_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      // this.LB_MOVIES.GUIProtoItemClass = GUIMovieItem;
      this.LB_MOVIES.setTextColor(this.LB_MOVIES.defaultColor.r, this.LB_MOVIES.defaultColor.g, this.LB_MOVIES.defaultColor.b);
      this.LB_MOVIES.onSelected = (movie: GUIMovieItemTsl, control: any, index: number) => {
        console.log(movie);
        this.selected = movie;
        this.selectedIndex = this.movieList.indexOf(movie);
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
        this.LB_MOVIES.addItem(new GUIMovieItemTsl(movie));
      }
      this.LB_MOVIES.updateList();

      this.LBL_UNLOCKED_VALUE.setText(`${this.movieList.length} / ${this.movieList.length}`);

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      resolve();
    });
  }
  
}
