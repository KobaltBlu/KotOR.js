import { UndoManager } from "@/apps/forge/managers/UndoManager";

describe("UndoManager", () => {
  it("executes, undoes, and redoes commands", () => {
    const manager = new UndoManager();
    const values: string[] = [];

    manager.execute({
      type: "append-a",
      description: "append a",
      redo: () => values.push("a"),
      undo: () => values.pop(),
    });
    manager.execute({
      type: "append-b",
      description: "append b",
      redo: () => values.push("b"),
      undo: () => values.pop(),
    });

    expect(values).toEqual(["a", "b"]);
    expect(manager.canUndo()).toBe(true);

    expect(manager.undo()).toBe(true);
    expect(values).toEqual(["a"]);
    expect(manager.canRedo()).toBe(true);

    expect(manager.redo()).toBe(true);
    expect(values).toEqual(["a", "b"]);
  });
});
