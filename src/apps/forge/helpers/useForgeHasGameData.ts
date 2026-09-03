/**
 * Subscribe to ForgeState.hasGameData for editor UI fallbacks.
 *
 * @file useForgeHasGameData.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { useEffect, useState } from "react";
import { ForgeState } from "@/apps/forge/states/ForgeState";

export function useForgeHasGameData(): boolean {
  const [hasGameData, setHasGameData] = useState(ForgeState.hasGameData);

  useEffect(() => {
    const onChange = () => setHasGameData(ForgeState.hasGameData);
    onChange();
    ForgeState.addEventListener("onGameDataChanged", onChange);
    return () => ForgeState.removeEventListener("onGameDataChanged", onChange);
  }, []);

  return hasGameData;
}
