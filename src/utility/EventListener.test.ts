import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { EventListener } from '@/utility/EventListener';

// ---------------------------------------------------------------------------
// EventListener tests
// ---------------------------------------------------------------------------

describe('EventListener', () => {
  let el: EventListener;
  let warnSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    el = new EventListener();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // addEventListener / processEventListener
  // -------------------------------------------------------------------------
  describe('addEventListener', () => {
    it('registers a callback that is called by processEventListener', () => {
      const cb = jest.fn();
      el.addEventListener('load', cb);
      el.processEventListener('load', []);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('passes arguments to the callback', () => {
      const cb = jest.fn();
      el.addEventListener('data', cb);
      el.processEventListener('data', [42, 'hello']);
      expect(cb).toHaveBeenCalledWith(42, 'hello');
    });

    it('different event types are isolated', () => {
      const cbA = jest.fn();
      const cbB = jest.fn();
      el.addEventListener('typeA', cbA);
      el.addEventListener('typeB', cbB);
      el.processEventListener('typeA', [1]);
      expect(cbA).toHaveBeenCalledTimes(1);
      expect(cbB).not.toHaveBeenCalled();
    });

    it('multiple listeners on the same event type are all called', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      el.addEventListener('click', cb1);
      el.addEventListener('click', cb2);
      el.processEventListener('click', []);
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('duplicate callback registration emits a console.warn and skips', () => {
      const cb = jest.fn();
      el.addEventListener('load', cb);
      el.addEventListener('load', cb); // duplicate
      expect(warnSpy).toHaveBeenCalled();
      // Should still only call once
      el.processEventListener('load', []);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // removeEventListener
  // -------------------------------------------------------------------------
  describe('removeEventListener', () => {
    it('removes a registered callback', () => {
      const cb = jest.fn();
      el.addEventListener('load', cb);
      el.removeEventListener('load', cb);
      el.processEventListener('load', []);
      expect(cb).not.toHaveBeenCalled();
    });

    it('removing one callback does not affect others on the same event', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      el.addEventListener('load', cb1);
      el.addEventListener('load', cb2);
      el.removeEventListener('load', cb1);
      el.processEventListener('load', []);
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('removing a listener for an event on a different type does nothing', () => {
      const cb = jest.fn();
      el.addEventListener('click', cb);
      el.removeEventListener('hover', cb); // different event type
      el.processEventListener('click', []);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('duplicate removeEventListener emits a console.warn', () => {
      const cb = jest.fn();
      el.addEventListener('load', cb);
      el.removeEventListener('load', cb);
      el.removeEventListener('load', cb); // duplicate remove
      expect(warnSpy).toHaveBeenCalled();
    });

    it('removing a listener that was never registered emits a console.warn', () => {
      const cb = jest.fn();
      el.removeEventListener('nonexistent', cb);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // processEventListener
  // -------------------------------------------------------------------------
  describe('processEventListener', () => {
    it('does nothing for an event type with no listeners', () => {
      // Should not throw
      expect(() => el.processEventListener('unknown', [])).not.toThrow();
    });

    it('calls the callback each time processEventListener is invoked', () => {
      const cb = jest.fn();
      el.addEventListener('tick', cb);
      el.processEventListener('tick', [1]);
      el.processEventListener('tick', [2]);
      expect(cb).toHaveBeenCalledTimes(2);
      expect(cb).toHaveBeenNthCalledWith(1, 1);
      expect(cb).toHaveBeenNthCalledWith(2, 2);
    });

    it('passes multiple arguments correctly', () => {
      const cb = jest.fn();
      el.addEventListener('event', cb);
      el.processEventListener('event', ['a', 'b', 'c']);
      expect(cb).toHaveBeenCalledWith('a', 'b', 'c');
    });

    it('passes zero arguments when args array is empty', () => {
      const cb = jest.fn();
      el.addEventListener('event', cb);
      el.processEventListener('event', []);
      expect(cb).toHaveBeenCalledWith();
    });
  });

  // -------------------------------------------------------------------------
  // Multiple instances are independent
  // -------------------------------------------------------------------------
  describe('instance isolation', () => {
    it('two EventListener instances do not share listeners', () => {
      const el2 = new EventListener();
      const cb = jest.fn();
      el.addEventListener('thing', cb);
      el2.processEventListener('thing', []);
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
