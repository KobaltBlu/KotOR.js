import { describe, expect, test } from "@jest/globals";
import { findCallContext, scanCallSites, skipTrivia } from "./callSites";

describe("findCallContext", () => {
  test("finds argument index inside nested calls", () => {
    const text = "AssignCommand(oNPC, ActionSpeakString(\"hi\", TALKVOLUME_TALK));";
    const secondArg = text.indexOf("ActionSpeakString");
    const outer = findCallContext(text, secondArg);
    expect(outer?.functionName).toBe("AssignCommand");
    expect(outer?.argumentIndex).toBe(1);

    const talk = text.indexOf("TALKVOLUME_TALK");
    const inner = findCallContext(text, talk);
    expect(inner?.functionName).toBe("ActionSpeakString");
    expect(inner?.argumentIndex).toBe(1);
  });

  test("ignores function declarations", () => {
    const text = "void main() { DelayCommand(0.5, ActionWait(1.0)); }";
    const inside = text.indexOf("0.5");
    const call = findCallContext(text, inside);
    expect(call?.functionName).toBe("DelayCommand");
    expect(call?.argumentIndex).toBe(0);
  });

  test("skips comments and strings", () => {
    const text = 'Foo(1, /* bar(2, 3) */ "a,b", 4);';
    const four = text.indexOf("4");
    const call = findCallContext(text, four);
    expect(call?.functionName).toBe("Foo");
    expect(call?.argumentIndex).toBe(2);
  });
});

describe("scanCallSites", () => {
  test("records argument starts for completed calls", () => {
    const text = "DelayCommand(0.5, ActionWait(1.0));";
    const calls = scanCallSites(text);
    expect(calls.map((c) => c.functionName)).toEqual(["ActionWait", "DelayCommand"]);
    const delay = calls.find((c) => c.functionName === "DelayCommand");
    expect(delay?.argumentStarts).toHaveLength(2);
    expect(text.slice(skipTrivia(text, delay!.argumentStarts[0]), delay!.argumentStarts[0] + 3)).toBe("0.5");
  });
});
