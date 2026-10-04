/**
 * @jest-environment node
 *
 * Golden NCS diff: KotOR.js vs nwnnsscomp.exe (-c -g 1).
 * Run: npx jest --config jest.compiler.config.js --coverage=false
 *
 * Mismatch classes (see plan):
 * A — align KotOR.js to CScriptCompiler / CNsc semantics
 * B — smell-test: keep KotOR.js (oracle/ wrong or intentional)
 * C — undecided / needs more investigation
 *
 * mapping (NWN EE CScriptCompiler, not legacy CNsc* names):
 * InitializeFinalCode → "NCS V1.0", size cursor 0x0d
 * PreVisitGenerateCode node 0x29 → STORE_STATE 0x2C type 0x10 + JMP
 * PreVisitGenerateCode node 0x49 → #globals label
 * GenerateCodeForSwitchLabels → JMP 0x1d + case label symbols
 */
import { describe, expect, test } from '@jest/globals';
import {
  compareFixture,
  compileKotOR,
  hexDump,
} from '../../compileOracleHarness';

function expectMatch(name: string, source: string) {
  const r = compareFixture(name, source);
  if (!r.equal) {
    throw new Error(
      `${name} NCS mismatch\nKotOR:  ${hexDump(r.kotor)}\nOracle: ${hexDump(r.oracle)}`,
    );
  }
  expect(r.equal).toBe(true);
}

describe('NWScriptCompiler vs nwnnsscomp (K1)', () => {
  test('empty main', () => {
    expectMatch('empty_main', 'void main() {\n}\n');
  });

  test('StartingConditional returns 1', () => {
    expectMatch(
      'starting_conditional',
      'int StartingConditional() {\n  return 1;\n}\n',
    );
  });

  test('global int + main read', () => {
    expectMatch(
      'global_int',
      'int g_n = 7;\nvoid main() {\n  g_n = g_n + 1;\n}\n',
    );
  });

  test('local assign and return via StartingConditional', () => {
    expectMatch(
      'local_assign',
      'int StartingConditional() {\n  int n = 3;\n  n = n + 2;\n  return n;\n}\n',
    );
  });

  test('if / else', () => {
    expectMatch(
      'if_else',
      'void main() {\n  int n = 1;\n  if (n) {\n    n = 2;\n  } else {\n    n = 3;\n  }\n}\n',
    );
  });

  test('while loop', () => {
    expectMatch(
      'while_loop',
      'void main() {\n  int n = 0;\n  while (n < 3) {\n    n = n + 1;\n  }\n}\n',
    );
  });

  test('for loop', () => {
    expectMatch(
      'for_loop',
      'void main() {\n  int i;\n  for (i = 0; i < 3; i++) {\n  }\n}\n',
    );
  });

  test('do while', () => {
    expectMatch(
      'do_while',
      'void main() {\n  int n = 0;\n  do {\n    n = n + 1;\n  } while (n < 2);\n}\n',
    );
  });

  test('switch with default', () => {
    expectMatch(
      'switch_default',
      'void main() {\n  int n = 1;\n  switch (n) {\n    case 0: n = 10; break;\n    case 1: n = 20; break;\n    default: n = 30; break;\n  }\n}\n',
    );
  });

  test('subroutine call order', () => {
    expectMatch(
      'sub_call',
      'void helper() {\n}\nvoid main() {\n  helper();\n}\n',
    );
  });

  /**
   * Class B — nwnnsscomp -g 1 rejects `const` ("Syntax error at const").
   * KotOR.js folds const scalars (no runtime slot), matching BioWare/NWN toolchain
   * comments in NWScriptCompiler. K1 game scripts do not use `const` in nwscript.nss.
   * Smell-test: do not cripple KotOR to match this nwnnsscomp gap.
   */
  test('const int folded at use (KotOR-only; nwnnsscomp K1 lacks const)', () => {
    const source = 'const int C = 5;\nvoid main() {\n  int n = C;\n}\n';
    const { ncs, errors } = compileKotOR(source);
    expect(errors.length).toBe(0);
    expect(ncs.length).toBeGreaterThan(13);
    // No global #globals SAVEBP pattern expected for const-only script (no runtime globals).
    // Empty-main-sized or slightly larger (CONSTI + store local) without SAVEBP (0x2A).
    const hasSaveBp = [...ncs].includes(0x2a);
    expect(hasSaveBp).toBe(false);
  });

  test('vector local assign', () => {
    expectMatch(
      'vector_assign',
      'void main() {\n  vector v = Vector(1.0, 2.0, 3.0);\n  v = Vector(4.0, 5.0, 6.0);\n}\n',
    );
  });

  test('struct field assign (single slot)', () => {
    expectMatch(
      'struct_field',
      'struct S { int a; };\nvoid main() {\n  struct S s;\n  s.a = 9;\n}\n',
    );
  });

  /** Class A target: multi-slot struct field store (vector = 12 bytes). */
  test('struct vector field assign', () => {
    expectMatch(
      'struct_vector_field',
      'struct S { vector v; };\nvoid main() {\n  struct S s;\n  s.v = Vector(1.0, 2.0, 3.0);\n}\n',
    );
  });

  test('engine action PrintString', () => {
    expectMatch(
      'action_print',
      'void main() {\n  PrintString("hi");\n}\n',
    );
  });

  /** Exercises STORE_STATE (0x2C/0x10) + JMP + action thunk — PreVisitGenerateCode node 0x29. */
  test('DelayCommand action callback (STORE_STATE)', () => {
    expectMatch(
      'store_state_delay',
      'void main() {\n  DelayCommand(1.0, PrintString("x"));\n}\n',
    );
  });
});

/**
 * smell-test notes (living list — prefer annotations over separate md):
 *
 * B1 — NWN EE uses CScriptCompiler, not CNscCodeGenerator symbols. Same NCS
 * conventions; EE may fix legacy BioWare bugs — do not blindly match EE when
 * KotOR shipped NCS / Torlack nwnnsscomp disagree and EE looks like a fix.
 *
 * B2 — nwnnsscomp.exe in exports/ is a community toolchain, not proprietary.
 * Prefer CScriptCompiler semantics when nwnnsscomp and KotOR.js disagree.
 *
 * B3 — PreVisitGenerateCode labels globals via a "#globals" string; some toolchains
 * mis-report that write. Smell-test: ignore the quirk; label name remains "#globals".
 *
 * B4 — nwnnsscomp -g 1 rejects `const` keyword; KotOR.js supports const scalar folding.
 * K1 nwscript.nss never uses `const`. Keep KotOR const support.
 *
 * A1 — Lexer must not case-fold identifiers into keywords (Vector ≠ vector). Exact
 * KEYWORDS match; INT/OBJECT_ID accepted as types via case-insensitive tryParseDataType
 * (K1 nwscript.nss uses those spellings; nwnnsscomp accepts INT).
 *
 * A2 — Struct locals with vector fields must RSADD three floats (12 bytes), not one.
 */
describe('engine smell-test annotations', () => {
  test('documents EE CScriptCompiler vs CNsc naming', () => {
    expect(true).toBe(true);
  });
});
