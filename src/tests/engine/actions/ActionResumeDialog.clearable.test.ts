/**
 * Conversation Pause/Resume must survive ClearAllActions(1) / SetState.
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as fs from "fs";
import { srcPath } from "@/tests/helpers/paths";

describe("dialog control action clearability", () => {
  it("marks Pause/Resume unclearable and ClearAllActions keeps Wait/Resume types", () => {
    // tar_m08aa k_ptar_calofade: Pause → Wait → Resume, then EffectHorrified
    // ClearAllActions(1) must not drop Resume or the dialog hangs paused.
    const resumeSrc = fs.readFileSync(
      srcPath("engine", "actions", "ActionResumeDialog.ts"),
      "utf8"
    );
    const pauseSrc = fs.readFileSync(
      srcPath("engine", "actions", "ActionPauseDialog.ts"),
      "utf8"
    );
    const objectSrc = fs.readFileSync(
      srcPath("engine", "module", "GameObject.ts"),
      "utf8"
    );

    expect(resumeSrc).toMatch(/this\.clearable\s*=\s*false/);
    expect(pauseSrc).toMatch(/this\.clearable\s*=\s*false/);
    expect(objectSrc).toMatch(/ActionType\.ActionResumeDialog/);
    expect(objectSrc).toMatch(/ActionType\.ActionPauseDialog/);
    expect(objectSrc).toMatch(/ActionType\.ActionWait/);
  });
});
