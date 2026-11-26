/**
 * Conversations bound at object load are parsed on first read, from the bytes
 * captured at load time (the module resource scope may be gone by then).
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameObjectManager: { RemoveObject: jest.fn() },
    module: undefined as any,
  },
}));
jest.mock('@engine/nwscript/NWScript', () => ({ NWScript: {} }));
import { GameObject } from '@engine/module/GameObject';
import { DLGObject } from '@engine/dialog/DLGObject';

function bare(): GameObject {
  return Object.create(GameObject.prototype) as GameObject;
}

describe('GameObject deferred conversation', () => {
  afterEach(() => jest.restoreAllMocks());

  test('captures bytes at bind time and parses once on first read', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const getBuf = jest.spyOn(DLGObject, 'GetCachedBuffer').mockReturnValue(bytes);
    const dlg = new DLGObject();
    const parse = jest.spyOn(DLGObject, 'FromBuffer').mockReturnValue(dlg);

    const obj = bare();
    obj.deferConversation('k_hen_bastila');
    expect(getBuf).toHaveBeenCalledWith('k_hen_bastila');
    expect(parse).not.toHaveBeenCalled();

    getBuf.mockReturnValue(undefined); // scope changed after bind
    expect(obj.conversation).toBe(dlg);
    expect(obj.conversation).toBe(dlg);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledWith(bytes, 'k_hen_bastila');
  });

  test('a missing resref yields no conversation; assignment overrides a pending bind', () => {
    jest.spyOn(DLGObject, 'GetCachedBuffer').mockReturnValue(undefined);
    const obj = bare();
    obj.deferConversation('nope');
    expect(obj.conversation).toBeUndefined();

    jest.spyOn(DLGObject, 'GetCachedBuffer').mockReturnValue(new Uint8Array(1));
    const parse = jest.spyOn(DLGObject, 'FromBuffer');
    obj.deferConversation('other');
    const mine = new DLGObject();
    obj.conversation = mine;
    expect(obj.conversation).toBe(mine);
    expect(parse).not.toHaveBeenCalled();
  });
});
