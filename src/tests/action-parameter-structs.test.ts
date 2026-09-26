import { expect, test } from '@jest/globals';
import { actionParameterToStruct } from '@/actions/actionParameterStructs';
import { GFFStruct } from '@/resource/GFFStruct';

/**
 * Regression for a save/load asymmetry: `ActionParameter.FromStruct` returns
 * `undefined` by design for a parameter struct it cannot read, and
 * `Action.setParameters` writes that into `parameters` up to the stored
 * `NumParams`. The save path called `.toStruct()` on every index unguarded, so
 * a game could be saved once and never again once it had been loaded.
 *
 * Found by saving a checkpoint after resuming one: a 3C-FD
 * `ActionPlayAnimation` came back with NumParams 3 and all three entries
 * absent, and `Module.save` threw `Cannot read properties of undefined`.
 */
test('a real parameter serialises through its own toStruct', () => {
  const own = new GFFStruct(7);
  const parameter = { toStruct: () => own } as never;

  expect(actionParameterToStruct(parameter)).toBe(own);
});

test('a hole becomes an empty struct rather than throwing', () => {
  // The whole point: this is the state the load path deliberately produces.
  const holes: readonly (undefined | null)[] = [undefined, null];
  for (const hole of holes) {
    const struct = actionParameterToStruct(hole as never);
    expect(struct).toBeInstanceOf(GFFStruct);
  }
});

test('the placeholder carries no Type field, so it reloads as the same absent parameter', () => {
  // FromStruct keys off 'Type'; a placeholder that had one would come back as a
  // real parameter with invented contents.
  const struct = actionParameterToStruct(undefined as never);

  expect(struct.getFieldByLabel('Type')).toBeFalsy();
});

test('a malformed parameter without toStruct is treated as a hole, not a crash', () => {
  const struct = actionParameterToStruct({ type: 1, value: 5 } as never);

  expect(struct).toBeInstanceOf(GFFStruct);
  expect(struct.getFieldByLabel('Type')).toBeFalsy();
});

test('every index yields a struct, so positions and NumParams stay aligned', () => {
  // setParameters is positional. Skipping a hole would shift every later
  // parameter and silently change what the action means.
  const real = new GFFStruct(1);
  const parameters = [undefined, { toStruct: () => real }, undefined] as never[];

  const structs = parameters.map((parameter) => actionParameterToStruct(parameter));

  expect(structs).toHaveLength(3);
  expect(structs[1]).toBe(real);
  expect(structs[0]).toBeInstanceOf(GFFStruct);
  expect(structs[2]).toBeInstanceOf(GFFStruct);
});
