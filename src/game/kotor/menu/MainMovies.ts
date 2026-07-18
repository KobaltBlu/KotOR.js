import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { TwoDAObject } from "@/resource/TwoDAObject";
import { GameFileSystem } from "@/utility/GameFileSystem";

/** TLK 0xBB2E — retail hardcoded credits list entry label (K1 PopulateMovies). */
const TLK_CREDITS_ENTRY = 0xBB2E;

export interface MovieItem {
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
  /** Retail credits row: custom_value == 0 → StartCreditSequence. */
  isCredits?: boolean;
}

export class GUIMovieItem implements MovieItem {

  name: string;
  strrefname: number;
  strefdesc: number;
  alwaysshow: boolean;
  played: boolean;
  order: number;
  isCredits?: boolean;

  constructor(movie: MovieItem){
    this.name = movie.name;
    this.strrefname = movie.strrefname;
    this.strefdesc = movie.strefdesc;
    this.alwaysshow = movie.alwaysshow;
    this.played = movie.played;
    this.order = movie.order;
    this.isCredits = movie.isCredits;
  }

  getName(): string {
    return GameState.TLKManager.GetStringById(this.strrefname).Value || this.name;
  }
}

/**
 * MainMovies class.
 *
 * Retail CSWGuiTitleMovies — PopulateMovies / OnMoviePicked / CClientOptions::GetMovieShown.
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
  /** Total rows in movies.2da (denominator for TSL LBL_UNLOCKED_VALUE). */
  moviesTableRowCount: number = 0;

  constructor(){
    super();
    this.gui_resref = 'titlemovie';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  /**
   * Retail `Movie%2d` INI key under [Movies Shown] — space-padded width 2 (`Movie 0` … `Movie10`).
   */
  static movieShownIniKey(byteIndex: number): string {
    return `Movies Shown.Movie${String(byteIndex).padStart(2, ' ')}`;
  }

  /** Case-insensitive movies.2da row lookup by resref / __rowlabel. */
  static findMoviesRow(resRef: string): any | undefined {
    const table = GameState.TwoDAManager.datatables.get('movies');
    if(!table || !resRef) return undefined;
    const lower = resRef.toLowerCase();
    for(const key of Object.keys(table.rows)){
      const row = table.rows[key];
      if(String(row.__rowlabel).toLowerCase() === lower) return row;
    }
    return undefined;
  }

  /**
   * CClientOptions::GetMovieShown — bitfield from movies.2da row index.
   * Empty resref returns true (CompareNoCase empty → shown).
   */
  static getMovieShown(resRef: string): boolean {
    if(!resRef) return true;
    const row = MainMovies.findMoviesRow(resRef);
    if(!row) return false;
    const rowIndex = row.__index as number;
    const byteIndex = rowIndex >> 3;
    if(byteIndex >= 11) return false;
    const bit = rowIndex & 7;
    const raw = GameState.iniConfig.getProperty(MainMovies.movieShownIniKey(byteIndex));
    const byte = parseInt(String(raw ?? '0'), 10) || 0;
    return (byte & (1 << bit)) !== 0;
  }

  /**
   * CClientOptions::SetMovieShown — set bit and SaveOptions.
   */
  static setMovieShown(resRef: string, shown: boolean = true): void {
    if(!resRef) return;
    const row = MainMovies.findMoviesRow(resRef);
    if(!row) return;
    const rowIndex = row.__index as number;
    const byteIndex = rowIndex >> 3;
    if(byteIndex >= 11) return;
    const bit = rowIndex & 7;
    const key = MainMovies.movieShownIniKey(byteIndex);
    const raw = GameState.iniConfig.getProperty(key);
    let byte = parseInt(String(raw ?? '0'), 10) || 0;
    if(shown){
      byte |= (1 << bit);
    }else{
      byte &= ~(1 << bit);
    }
    GameState.iniConfig.setProperty(key, byte);
    GameState.iniConfig.save();
  }

  protected stripMovieExtension(filename: string): string {
    const base = filename.replace(/^.*[\\/]/, '');
    const dot = base.lastIndexOf('.');
    return (dot > 0 ? base.slice(0, dot) : base).toLowerCase();
  }

  /**
   * Retail GetDirectoryList on MOVIES: / alias movies folders (0x80F filter).
   */
  protected async listMovieResrefsFromDisk(): Promise<string[]> {
    try{
      const files = await GameFileSystem.readdir('movies', { list_dirs: false });
      const names = new Set<string>();
      for(const file of files){
        const name = this.stripMovieExtension(file);
        if(name) names.add(name);
      }
      return Array.from(names);
    }catch(e){
      console.warn('MainMovies: could not list movies directory', e);
      return [];
    }
  }

  /**
   * Whether this build prepends the retail hardcoded credits entry (K1 only).
   */
  protected includeHardcodedCredits(): boolean {
    return true;
  }

  /**
   * CSWGuiTitleMovies::PopulateMovies
   */
  async populateMovies(): Promise<void> {
    const moviesTable = GameState.TwoDAManager.datatables.get('movies');
    this.moviesTableRowCount = moviesTable?.RowCount ?? 0;
    this.movieList = [];

    if(this.includeHardcodedCredits()){
      this.movieList.push({
        name: 'credits',
        strrefname: TLK_CREDITS_ENTRY,
        strefdesc: -1,
        alwaysshow: true,
        played: true,
        order: -1,
        isCredits: true,
      });
    }

    let diskNames = await this.listMovieResrefsFromDisk();
    if(!diskNames.length && moviesTable){
      diskNames = [];
      for(let i = 0; i < moviesTable.RowCount; i++){
        const row = moviesTable.getRowByIndex(i);
        if(row?.__rowlabel) diskNames.push(String(row.__rowlabel).toLowerCase());
      }
    }

    for(const name of diskNames){
      if(name === 'credits') continue;
      const row = MainMovies.findMoviesRow(name);
      const alwaysshow = row
        ? TwoDAObject.normalizeValue(row.alwaysshow ?? row.AlwaysShow, 'number', 0) === 1
        : false;
      const played = MainMovies.getMovieShown(name);
      // AlwaysShow == 1 OR GetMovieShown
      if(!alwaysshow && !played) continue;

      this.movieList.push({
        name: row ? String(row.__rowlabel) : name,
        strrefname: row
          ? TwoDAObject.normalizeValue(row.strrefname ?? row.StrrefName, 'number', -1)
          : -1,
        strefdesc: row
          ? TwoDAObject.normalizeValue(row.strefdesc ?? row.StrrefDesc, 'number', -1)
          : -1,
        alwaysshow,
        played,
        order: row
          ? TwoDAObject.normalizeValue(row.order ?? row.Order, 'number', 999999)
          : 999999,
        isCredits: false,
      });
    }

    // Credits stays first; remaining entries sorted by Order (retail insert-by-order after credits).
    const credits = this.movieList.filter(m => m.isCredits);
    const rest = this.movieList.filter(m => !m.isCredits).sort((a, b) => a.order - b.order);
    this.movieList = [...credits, ...rest];
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
      this.LB_MOVIES.protoItem.extent.height = 64;
      this.LB_MOVIES.setTextColor(this.LB_MOVIES.defaultColor.r, this.LB_MOVIES.defaultColor.g, this.LB_MOVIES.defaultColor.b);
      this.LB_MOVIES.onClicked = (movie: GUIMovieItem, control: any, index: number) => {
        this.onMoviePicked(movie);
      };
      this.populateMovies().then(() => resolve()).catch(reject);
    });
  }

  /**
   * CSWGuiTitleMovies::OnMoviePicked — custom_value == 0 → credits; else PlayMovie.
   */
  onMoviePicked(movie: MovieItem): void {
    if(!movie) return;
    if(movie.isCredits || !movie.name){
      // CClientExoApp::StartCreditSequence("credits") → CSWGuiInGameCredits
      this.manager.MenuCredits.open();
      return;
    }
    MainMovies.setMovieShown(movie.name, true);
    GameState.VideoManager.playMovie(movie.name, true);
  }

  show(){
    super.show();
    this.populateMovies().then(() => {
      this.LB_MOVIES.setItems(this.movieList.map(m => new GUIMovieItem(m)));
      this.LB_MOVIES.show();
      this.onMovieListUpdated();
    });
  }

  /** Hook for TSL unlock label. */
  protected onMovieListUpdated(): void {}

}
