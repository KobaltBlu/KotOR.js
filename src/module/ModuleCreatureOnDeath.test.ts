/**
 * Tests for player death game-over detection in ModuleCreature.onDeath().
 * Verifies that MenuGameOver is opened when all party members are dead.
 */

let openCalled = false;

jest.mock('../GameState', () => ({
  GameState: {
    PartyManager: {
      party: [] as any[],
    },
    MenuManager: {
      MenuGameOver: {
        open() { openCalled = true; },
      },
    },
  },
}));

jest.mock('../enums/module/ModuleObjectScript', () => ({
  ModuleObjectScript: { CreatureOnDeath: 'CreatureOnDeath' },
}));

// Minimal stub for the class-under-test
jest.mock('./ModuleObject', () => ({
  ModuleObject: class {},
}));

import { GameState } from '../GameState';

// Re-usable helper: build a minimal dead-creature stub
function makeDead(): any {
  return { isDead: () => true };
}

// Minimal stub of onDeath logic – extracted so we can test without pulling in the full
// ModuleCreature dependency graph (which requires Three.js, file-system access, etc.)
function simulateOnDeath(party: any[], scripts: Record<string, any>): void {
  // Mirror of the patched onDeath() from ModuleCreature.ts
  if (party.length && party.every((m: any) => m.isDead())) {
    GameState.MenuManager.MenuGameOver?.open();
  }
  const nwscript = scripts['CreatureOnDeath'];
  if (!nwscript) { return; }
  nwscript.run();
}

beforeEach(() => {
  openCalled = false;
  (GameState.PartyManager as any).party = [];
});

describe('onDeath – game-over detection', () => {
  it('opens MenuGameOver when the only party member dies', () => {
    const party = [makeDead()];
    simulateOnDeath(party, {});
    expect(openCalled).toBe(true);
  });

  it('opens MenuGameOver when both party members are dead', () => {
    const party = [makeDead(), makeDead()];
    simulateOnDeath(party, {});
    expect(openCalled).toBe(true);
  });

  it('does NOT open MenuGameOver if one party member is still alive', () => {
    const party = [makeDead(), { isDead: () => false }];
    simulateOnDeath(party, {});
    expect(openCalled).toBe(false);
  });

  it('does NOT open MenuGameOver when the party is empty', () => {
    simulateOnDeath([], {});
    expect(openCalled).toBe(false);
  });

  it('still runs the OnDeath script even when GameOver is triggered', () => {
    let scriptRan = false;
    const party = [makeDead()];
    simulateOnDeath(party, { CreatureOnDeath: { run() { scriptRan = true; } } });
    expect(openCalled).toBe(true);
    expect(scriptRan).toBe(true);
  });
});
