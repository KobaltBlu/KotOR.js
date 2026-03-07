/** Minimal loop handle to avoid circular import with AsyncLoop. */
export interface IAsyncLoopHandle<T = object> {
  index: number;
  array: T[];
}

/**
 * IAsyncLoopOptions interface.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file IAsyncLoopOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IAsyncLoopOptions<T = object> {
  array?: T[];
  onLoop?: (element: T, loop: IAsyncLoopHandle<T>, index: number, count: number) => void;
  onComplete?: () => void;
}
