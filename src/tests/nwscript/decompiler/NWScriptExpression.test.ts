import { describe, expect, test } from "@jest/globals";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { NWScriptExpression } from "@/nwscript/decompiler/NWScriptExpression";

describe('NWScriptExpression NSS emission', () => {
  test('uses the VM object constant mapping', () => {
    expect(NWScriptExpression.constant(0, NWScriptDataType.OBJECT).toNSS()).toBe('OBJECT_SELF');
    expect(NWScriptExpression.constant(1, NWScriptDataType.OBJECT).toNSS()).toBe('OBJECT_INVALID');
  });

  test('escapes NSS string literals', () => {
    const expression = NWScriptExpression.constant(
      'quote: " slash: \\ newline:\n tab:\t',
      NWScriptDataType.STRING
    );
    expect(expression.toNSS()).toBe('"quote: \\" slash: \\\\ newline:\\n tab:\\t"');
  });

  test('emits vector constructors', () => {
    const vector = NWScriptExpression.vector([
      NWScriptExpression.constant(1, NWScriptDataType.FLOAT),
      NWScriptExpression.constant(2, NWScriptDataType.FLOAT),
      NWScriptExpression.constant(3, NWScriptDataType.FLOAT),
    ]);
    expect(vector.toNSS()).toBe('Vector(1.0f, 2.0f, 3.0f)');
  });

  test('unknown values remain visibly invalid instead of becoming a valid literal', () => {
    expect(NWScriptExpression.unknown('underflow').toNSS())
      .toBe('__NCS_DECOMPILER_UNKNOWN_VALUE__ /* underflow */');
    expect(NWScriptExpression.constant(Number.NaN, NWScriptDataType.FLOAT).toNSS())
      .toBe('__NCS_DECOMPILER_NONFINITE_FLOAT__');
  });
});
