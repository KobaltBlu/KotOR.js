import { GameEngineType } from "@/enums/engine/GameEngineType";

/**
 * Detect TSL using the webpack-external KotOR singleton when present.
 *
 * @file dlgGame.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

type ForgeKotORRuntime = {
  ApplicationProfile?: { GameKey?: unknown };
  GameEngineType?: typeof GameEngineType;
};

function forgeKotORRuntime(): ForgeKotORRuntime | undefined {
  if (typeof globalThis === "undefined") {
    return undefined;
  }
  return (globalThis as { KotOR?: ForgeKotORRuntime }).KotOR;
}

export function isTslForgeGame(): boolean {
  const runtime = forgeKotORRuntime();
  const key = runtime?.ApplicationProfile?.GameKey;
  if (key === GameEngineType.TSL || key === "TSL" || key === "tsl") {
    return true;
  }
  const ctor = runtime?.GameEngineType;
  if (ctor && key === ctor.TSL) {
    return true;
  }
  return false;
}
