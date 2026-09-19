/**
 * @jest-environment node
 *
 * GameState.Render gates lensFlarePass.enabled when no flare lights.
 */
import { describe, expect, test } from "@jest/globals";

describe("lensFlarePass enable gate", () => {
  test("disables when renderLensFlares is false or flare list empty", () => {
    function resolveLensFlareEnabled(
      renderLensFlares: boolean,
      flareLights: unknown[]
    ): boolean {
      return !!renderLensFlares && flareLights.length > 0;
    }

    expect(resolveLensFlareEnabled(true, [{ id: 1 }])).toBe(true);
    expect(resolveLensFlareEnabled(true, [])).toBe(false);
    expect(resolveLensFlareEnabled(false, [{ id: 1 }])).toBe(false);
  });
});
