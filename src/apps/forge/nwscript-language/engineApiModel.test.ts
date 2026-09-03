import { describe, expect, test } from "@jest/globals";
import {
  parseEngineApi,
  parseScriptSymbols,
  renderSymbolDocumentation,
} from "./engineApiModel";

const ENGINE = `
/* Delay a command.
 * @param fSeconds wait time
 * @param aAction the action
 * @returns void
 */
void DelayCommand(float fSeconds, action aAction);

const int TRUE = 1;
object OBJECT_SELF;
effect EffectVisualEffect(int nVFX);
`;

describe("parseEngineApi", () => {
  test("assigns ACTION ids in declaration order and captures defaults", () => {
    const model = parseEngineApi({
      label: "nwscript.nss",
      availability: "test",
      resref: "nwscript",
      text: [
        "void ActionWait(float fSeconds);",
        "int GetObjectByTag(string sTag, int nNth = 0);",
      ].join("\n"),
    });

    expect(model.functions.map((fn) => [fn.name, fn.actionId])).toEqual([
      ["ActionWait", 0],
      ["GetObjectByTag", 1],
    ]);
    expect(model.functions[1].parameters[1].defaultValue).toBe("0");
  });

  test("parses @param/@returns and curated notes", () => {
    const model = parseEngineApi({
      label: "nwscript.nss",
      availability: "test",
      resref: "nwscript",
      text: ENGINE,
    });

    const delay = model.functionsByName.get("DelayCommand")?.[0];
    expect(delay?.documentation).toContain("Delay a command");
    expect(delay?.returnDocumentation).toBe("void");
    expect(delay?.parameters[0].documentation).toBe("wait time");
    expect(delay?.curatedNotes.length).toBeGreaterThan(0);

    const self = model.symbolsByName.get("OBJECT_SELF")?.[0];
    expect(self?.kind).toBe("symbol");
    expect(self?.curatedNotes.length).toBeGreaterThan(0);

    const markdown = renderSymbolDocumentation(delay!, model.source);
    expect(markdown).toContain("ACTION **#0**");
    expect(markdown).toContain("Delay a command");
    expect(markdown).toContain("fSeconds");
  });
});

describe("parseScriptSymbols", () => {
  test("includes function definitions from script sources", () => {
    const parsed = parseScriptSymbols(
      "int Helper(object oTarget) { return TRUE; }\nconst int LOCAL_FLAG = 2;",
      "document",
      "test.nss",
      "Declared in the current script",
      "test",
    );
    expect(parsed.functions.map((fn) => fn.name)).toEqual(["Helper"]);
    expect(parsed.functions[0].actionId).toBeUndefined();
    expect(parsed.constants[0].name).toBe("LOCAL_FLAG");
    expect(parsed.constants[0].value).toBe("2");
  });
});
