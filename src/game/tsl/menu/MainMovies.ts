import type { GUILabel, GUIButton, GUIListBox } from "@/gui";
import { MainMovies as K1_MainMovies, GUIMovieItem } from "@/game/kotor/menu/MainMovies";

/**
 * MainMovies class (TSL).
 *
 * Retail CSWGuiTitleMovies (titlemovie_p) — no hardcoded credits row;
 * LBL_UNLOCKED_VALUE = unlocked / movies.2da RowCount.
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

  constructor(){
    super();
    this.gui_resref = 'titlemovie_p';
    this.background = '';
    this.voidFill = true;
  }

  /** TSL PopulateMovies does not prepend the K1 credits button. */
  protected includeHardcodedCredits(): boolean {
    return false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LB_MOVIES.protoItem.extent.height = 64;
      this.LB_MOVIES.setTextColor(this.LB_MOVIES.defaultColor.r, this.LB_MOVIES.defaultColor.g, this.LB_MOVIES.defaultColor.b);
      this.LB_MOVIES.protoItem.setTextColor(this.LB_MOVIES.defaultColor.r, this.LB_MOVIES.defaultColor.g, this.LB_MOVIES.defaultColor.b);
      this.LB_MOVIES.onClicked = (movie: GUIMovieItem) => {
        this.onMoviePicked(movie);
      };

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;

      this.populateMovies().then(() => resolve()).catch(reject);
    });
  }

  protected onMovieListUpdated(): void {
    // Retail Format("%d / %d", unlockedCount, movies.2da.RowCount)
    const unlocked = this.movieList.length;
    const total = this.moviesTableRowCount;
    this.LBL_UNLOCKED_VALUE?.setText(`${unlocked} / ${total}`);
  }

  show(){
    super.show();
  }

}
