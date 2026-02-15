import { BIKObject } from "../resource/BIKObject";
import { GameState } from "../GameState";
import { EngineMode } from "../enums/engine/EngineMode";

/**
 * VideoManager class.
 *
 * Manages BIK video playback in the game engine.
 * Video planes are added to scene_movie so they are rendered by the
 * GUI render pass with the orthographic camera (same approach as
 * FadeOverlayManager).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file VideoManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class VideoManager {

  static bikObject: BIKObject | null = null;

  static movieQueue: { name: string; skippable: boolean }[] = [];
  static currentMovie: { name: string; skippable: boolean } | null = null;
  static isPlaying: boolean = false;
  static lastEngineMode: EngineMode = EngineMode.GUI;

  /**
   * Play a BIK video
   * @param movieName - The name of the BIK file to play (without extension)
   * @param onComplete - Optional callback when video completes
   * @returns Promise that resolves when video starts playing
   */
  static async playMovie(movieName: string, skipable: boolean = false, onComplete?: Function): Promise<void> {
    if (this.isPlaying) {
      console.warn('VideoManager.playMovie: A video is already playing');
      return;
    }

    try {
      // Create BIK object
      this.bikObject = new BIKObject();

      // Set engine mode to movie mode
      if(GameState.Mode != EngineMode.MOVIE){
        this.lastEngineMode = GameState.Mode;
        GameState.SetEngineMode(EngineMode.MOVIE);
      }

      // Add video planes to scene_movie so they are rendered by the
      // GUI render pass with the orthographic camera
      GameState.scene_movie.add(this.bikObject.backPlane);
      GameState.scene_movie.add(this.bikObject.videoPlane);

      // Play the video
      await this.bikObject.play(movieName, () => {
        this.onMovieComplete();
        if(typeof onComplete === 'function') {
          onComplete();
        }
      });

      this.currentMovie = { name: movieName, skippable: skipable };
      this.isPlaying = true;

    } catch (error) {
      console.error('VideoManager.playMovie: Failed to play movie:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop the currently playing video
   */
  static stopMovie(): void {
    if (this.bikObject) {
      this.bikObject.stop();
    }
    this.cleanup();
  }

  /**
   * Skip the currently playing video (if skippable)
   */
  static skipMovie(): void {
    if (this.currentMovie?.skippable) {
      this.stopMovie();
    }
  }

  /**
   * Queue a movie to be played
   * @param movieName - The name of the BIK file to queue
   * @param skippable - Whether the movie can be skipped by the player
   */
  static queueMovie(movieName: string, skippable: boolean = false): void {
    if(!movieName){
      return;
    }
    this.movieQueue.push({ name: movieName, skippable });
  }

  /**
   * Play the queued movies
   * @param allowSeparateSkips - Whether each movie can be skipped individually
   */
  static async playMovieQueue(allowSeparateSkips: boolean = true): Promise<void> {
    if (this.movieQueue.length === 0) {
      return;
    }

    const playNextMovie = async () => {
      if (this.movieQueue.length === 0) {
        return;
      }

      const movie = this.movieQueue.shift()!;
      try {
        await this.playMovie(movie.name, movie.skippable, playNextMovie);
      } catch (error) {
        console.error('VideoManager.playMovieQueue: Failed to play queued movie:', error);
        // Continue with next movie even if one fails
        playNextMovie();
      }
    };

    await playNextMovie();
  }

  /**
   * Check if a movie is currently playing
   * @returns true if a movie is playing
   */
  static isMoviePlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Update the video manager (called from game loop)
   * @param delta - Time delta in milliseconds
   */
  static update(delta: number): void {
    if (this.bikObject && this.isPlaying) {
      this.bikObject.update(delta);
    }
  }

  /**
   * Handle movie completion
   */
  private static onMovieComplete(): void {
    this.cleanup();

    // Check if there are more movies in the queue
    if (this.movieQueue.length > 0) {
      const nextMovie = this.movieQueue.shift()!;
      this.playMovie(nextMovie.name, nextMovie.skippable, () => this.onMovieComplete());
    }
  }

  /**
   * Clean up after video playback
   */
  private static cleanup(): void {
    if (this.bikObject) {
      this.bikObject.dispose();
      this.bikObject = null;
    }

    this.currentMovie = null;
    this.isPlaying = false;

    // Restore previous engine mode
    if (GameState.Mode === EngineMode.MOVIE) {
      GameState.RestoreEnginePlayMode();
      // GameState.SetEngineMode(this.lastEngineMode);
    }
  }

}