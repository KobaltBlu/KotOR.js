import { describe, expect, test } from "@jest/globals";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import {
  buildRuntimeAction,
  buildRuntimeActionMap,
  defineAction,
  defineVariantAction,
  floatParam,
  intParam,
  objectParam,
  stringParam,
} from "@/nwscript/builtins/actionBuilder";

const context = { name: "test_script" } as NWScriptInstance;

function simple(id: number, name = `Action${id}`) {
  return defineAction({
    id, name, comment: "test routine", returnType: NWScriptDataType.INTEGER,
    params: [] as const,
    kotor() { return id; },
  });
}

describe("ported NWScript action builder", () => {
  test("preserves public metadata, call order and the script this binding", () => {
    const definition = defineAction({
      id: 100, name: "Binding", comment: "Explicit parameters",
      returnType: NWScriptDataType.STRING,
      params: [intParam("number"), stringParam("text")] as const,
      kotor(this: NWScriptInstance, number, text) {
        return `${this.name}:${number}:${text}`;
      },
    });
    const action = buildRuntimeAction(definition, "kotor")!;
    expect(action.name).toBe("Binding");
    expect(action.comment).toBe("Explicit parameters");
    expect(action.type).toBe(NWScriptDataType.STRING);
    expect(action.args).toEqual([NWScriptDataType.INTEGER, NWScriptDataType.STRING]);
    expect(action.action!.call(context, [7, "last"])).toBe("test_script:7:last");
  });

  test("inflates a hidden middle TSL parameter without consuming the next K1 argument", () => {
    const definition = defineAction({
      id: 101, name: "MiddleParameter", comment: "", returnType: NWScriptDataType.VOID,
      params: [
        intParam("first"),
        floatParam("tslMiddle", { availability: "tsl", default: 2.5 }),
        stringParam("last"),
      ] as const,
      kotor(first, middle, last) { return [first, middle, last]; },
    });
    const k1 = buildRuntimeAction(definition, "kotor")!;
    const tsl = buildRuntimeAction(definition, "tsl")!;
    expect(k1.args).toEqual([NWScriptDataType.INTEGER, NWScriptDataType.STRING]);
    expect(tsl.args).toEqual([NWScriptDataType.INTEGER, NWScriptDataType.FLOAT, NWScriptDataType.STRING]);
    expect(k1.action!.call(context, [3, "end"])).toEqual([3, 2.5, "end"]);
    expect(tsl.action!.call(context, [3, 9.5, "end"])).toEqual([3, 9.5, "end"]);
  });

  test("applies defaults only to omitted or undefined values, not falsy values", () => {
    const definition = defineAction({
      id: 102, name: "Defaults", comment: "", returnType: NWScriptDataType.VOID,
      params: [
        intParam("zero", { default: 42 }),
        stringParam("empty", { default: "default" }),
        objectParam<boolean | null>("false", { default: true }),
      ] as const,
      kotor(zero, empty, flag) { return [zero, empty, flag]; },
    });
    const action = buildRuntimeAction(definition, "kotor")!;
    expect(action.action!.call(context, [0, "", false])).toEqual([0, "", false]);
    expect(action.action!.call(context, [])).toEqual([42, "default", true]);
    expect(action.action!.call(context, [undefined, undefined, null])).toEqual([42, "default", null]);
  });

  test("selects a shared TSL override and otherwise inherits K1 implementation", () => {
    const shared = simple(103);
    expect(buildRuntimeAction(shared, "tsl")!.action!.call(context, [])).toBe(103);
    const overridden = { ...shared, tsl() { return 99; } };
    expect(buildRuntimeAction(overridden, "kotor")!.action!.call(context, [])).toBe(103);
    expect(buildRuntimeAction(overridden, "tsl")!.action!.call(context, [])).toBe(99);
  });

  test("explicit variants keep independent signatures and use K1 only when the TSL variant is absent", () => {
    const kotor = {
      name: "K1Routine", comment: "K1", returnType: NWScriptDataType.INTEGER,
      params: [intParam("value")],
      implementation(this: NWScriptInstance, value: number) { return `${this.name}:${value}`; },
    };
    const tsl = {
      name: "TSLRoutine", comment: "TSL", returnType: NWScriptDataType.STRING,
      params: [stringParam("text")],
      implementation(this: NWScriptInstance, text: string) { return `${this.name}:${text}`; },
    };
    const both = defineVariantAction({ kind: "variant", id: 104, kotor, tsl });
    expect(buildRuntimeAction(both, "kotor")!.args).toEqual([NWScriptDataType.INTEGER]);
    expect(buildRuntimeAction(both, "tsl")!.args).toEqual([NWScriptDataType.STRING]);
    expect(buildRuntimeAction(both, "tsl")!.action!.call(context, ["tsl"])).toBe("test_script:tsl");
    const inherited = defineVariantAction({ kind: "variant", id: 104, kotor });
    expect(buildRuntimeAction(inherited, "tsl")!.name).toBe("K1Routine");
    expect(buildRuntimeAction(inherited, "tsl")!.action!.call(context, [4])).toBe("test_script:4");
    const explicitStub = defineVariantAction({ kind: "variant", id: 104, kotor, tsl: { ...tsl, implementation: undefined } });
    expect(buildRuntimeAction(explicitStub, "tsl")!.action).toBeUndefined();
  });

  test("omits unavailable definitions but preserves explicit unimplemented entries", () => {
    const onlyTSL = { ...simple(105), availability: "tsl" as const };
    expect(buildRuntimeAction(onlyTSL, "kotor")).toBeUndefined();
    expect(buildRuntimeActionMap([onlyTSL], "kotor")).toEqual({});
    expect(buildRuntimeActionMap([onlyTSL], "tsl")[105].name).toBe("Action105");
    const variant = defineVariantAction({ kind: "variant", id: 106, tsl: {
      name: "TSLOnly", comment: "", returnType: NWScriptDataType.VOID, params: [],
    } });
    expect(buildRuntimeAction(variant, "kotor")).toBeUndefined();
    expect(buildRuntimeAction(variant, "tsl")!.action).toBeUndefined();
  });

  test("rejects duplicate active IDs, including repeated references, rather than silently overwriting", () => {
    expect(() => buildRuntimeActionMap([simple(107, "First"), simple(107, "Second")], "kotor"))
      .toThrow("Duplicate NWScript action ID 107 for kotor: First and Second");
    const repeated = simple(108);
    expect(() => buildRuntimeActionMap([repeated, repeated], "tsl"))
      .toThrow("Duplicate NWScript action ID 108 for tsl");
  });

  test("allows a shared ID across mutually exclusive engine definitions", () => {
    const onlyK1 = { ...simple(109, "OnlyK1"), availability: "kotor" as const };
    const onlyTSL = { ...simple(109, "OnlyTSL"), availability: "tsl" as const };
    expect(buildRuntimeActionMap([onlyK1, onlyTSL], "kotor")[109].name).toBe("OnlyK1");
    expect(buildRuntimeActionMap([onlyK1, onlyTSL], "tsl")[109].name).toBe("OnlyTSL");
  });
});
