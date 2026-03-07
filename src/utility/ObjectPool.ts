/**
 * ObjectPool.ts
 *
 * A generic object pool that reduces per-frame garbage-collection pressure by
 * reusing allocated instances instead of discarding them.  Callers obtain an
 * instance with {@link ObjectPool.acquire} and return it with
 * {@link ObjectPool.release} once they are done.
 *
 * Usage example:
 * ```typescript
 * const pool = new ObjectPool<THREE.Vector3>(
 *   () => new THREE.Vector3(),          // factory
 *   (v) => v.set(0, 0, 0),              // optional reset
 * );
 *
 * const v = pool.acquire();
 * // ... use v ...
 * pool.release(v);
 * ```
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ObjectPool.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ObjectPool<T> {
  private _pool: T[] = [];
  private _factory: () => T;
  private _reset?: (obj: T) => void;

  /** Total number of objects ever created by this pool. */
  totalCreated = 0;

  /**
   * @param factory - Called to create a new object when the pool is empty.
   * @param reset   - Optional function called on an object before it is
   *                  returned by {@link acquire}, so callers always receive a
   *                  clean instance.
   */
  constructor(factory: () => T, reset?: (obj: T) => void) {
    this._factory = factory;
    this._reset = reset;
  }

  /**
   * Acquire an object from the pool.  If the pool is empty a new object is
   * created via the factory function.  The optional reset function is applied
   * before the object is returned.
   */
  acquire(): T {
    const obj = this._pool.length > 0 ? this._pool.pop()! : (this.totalCreated++, this._factory());
    if (this._reset) this._reset(obj);
    return obj;
  }

  /**
   * Return an object to the pool so it can be reused by a future
   * {@link acquire} call.  The caller must not use the object after releasing
   * it.
   */
  release(obj: T): void {
    this._pool.push(obj);
  }

  /** Number of objects currently sitting idle in the pool. */
  get size(): number {
    return this._pool.length;
  }

  /** Discard all pooled objects and reset the creation counter. */
  clear(): void {
    this._pool.length = 0;
    this.totalCreated = 0;
  }
}
