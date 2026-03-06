jest.mock('../GameState', () => ({
  GameState: {
    module: undefined,
  },
}));

import EngineLocation from './EngineLocation';

describe('EngineLocation', () => {
  it('setFacing stores the provided facing value', () => {
    const location = new EngineLocation(0, 0, 0, 0, 0, 0, undefined as any);

    location.setFacing(Math.PI / 2);

    expect(location.getFacing()).toBe(Math.PI / 2);
  });
});
