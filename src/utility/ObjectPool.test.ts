/**
 * ObjectPool.test.ts
 *
 * Unit tests for the ObjectPool utility class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ObjectPool.test.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
import { ObjectPool } from './ObjectPool';

describe('ObjectPool', () => {
  it('creates a new object when the pool is empty', () => {
    let createCount = 0;
    const pool = new ObjectPool<{ value: number }>(() => {
      createCount++;
      return { value: 0 };
    });

    const obj = pool.acquire();
    expect(obj).toBeDefined();
    expect(createCount).toBe(1);
    expect(pool.totalCreated).toBe(1);
  });

  it('reuses a released object instead of creating a new one', () => {
    let createCount = 0;
    const pool = new ObjectPool<{ value: number }>(() => {
      createCount++;
      return { value: 0 };
    });

    const obj = pool.acquire();
    pool.release(obj);

    const obj2 = pool.acquire();
    expect(obj2).toBe(obj);
    expect(createCount).toBe(1);
    expect(pool.totalCreated).toBe(1);
  });

  it('applies the reset function before returning a pooled object', () => {
    const pool = new ObjectPool<{ value: number }>(
      () => ({ value: 0 }),
      (o) => { o.value = 0; },
    );

    const obj = pool.acquire();
    obj.value = 42;
    pool.release(obj);

    const obj2 = pool.acquire();
    expect(obj2.value).toBe(0);
  });

  it('tracks pool size correctly', () => {
    const pool = new ObjectPool<object>(() => ({}));

    expect(pool.size).toBe(0);

    const a = pool.acquire();
    const b = pool.acquire();
    expect(pool.size).toBe(0);

    pool.release(a);
    expect(pool.size).toBe(1);

    pool.release(b);
    expect(pool.size).toBe(2);

    pool.acquire();
    expect(pool.size).toBe(1);
  });

  it('clear() discards all pooled objects and resets totalCreated', () => {
    const pool = new ObjectPool<object>(() => ({}));

    pool.acquire(); // creates 1
    const b = pool.acquire(); // creates 2
    pool.release(b);

    expect(pool.size).toBe(1);
    expect(pool.totalCreated).toBe(2);

    pool.clear();
    expect(pool.size).toBe(0);
    expect(pool.totalCreated).toBe(0);
  });

  it('does not apply reset when no reset function is provided', () => {
    const pool = new ObjectPool<{ value: number }>(() => ({ value: 0 }));

    const obj = pool.acquire();
    obj.value = 99;
    pool.release(obj);

    const obj2 = pool.acquire();
    expect(obj2.value).toBe(99); // untouched because no reset fn
  });

  it('totalCreated increments only for factory-created objects', () => {
    const pool = new ObjectPool<object>(() => ({}));

    const a = pool.acquire(); // totalCreated = 1
    const b = pool.acquire(); // totalCreated = 2
    pool.release(a);
    pool.release(b);

    pool.acquire(); // reuses, totalCreated stays 2
    pool.acquire(); // reuses, totalCreated stays 2
    pool.acquire(); // pool empty, totalCreated = 3

    expect(pool.totalCreated).toBe(3);
  });
});
