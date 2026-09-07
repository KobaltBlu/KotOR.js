/**
 * SoundMode enum.
 *
 * SetSoundMode modes.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file SoundMode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum SoundMode {
  /** Pop stack and re-apply previous mode. */
  POP = 0,
  /** MuteSound (500ms fade of dialog/sfx/music). */
  MUTE = 1,
  /** PauseAllSounds. */
  PAUSE = 2,
  /** PauseAllSounds (load / PlayMovie path). */
  PAUSE_LOAD = 3,
  /** PauseAllSounds (in-game GUI / load screen). */
  PAUSE_GUI = 4,
  /** Movie pause flag path (PauseAllSounds with movie flag). */
  MOVIE = 5,
  /** Resume movie pause and re-apply previous stack mode. */
  RESUME_MOVIE = 6,
}
