/**
 * React hook for instant-apply Forge settings bags.
 *
 * @file useForgeSettings.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { useState } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import type { ForgeSettingsBag } from "@/apps/forge/settings/forgeSettingsStore";

export function useForgeSettings<T>(bag: ForgeSettingsBag<T>): [T, (patch: Partial<T>) => T] {
  const [, setRevision] = useState(0);

  useEffectOnce(() => {
    const bump = () => setRevision((value) => value + 1);
    bag.addListener(bump);
    return () => bag.removeListener(bump);
  });

  return [bag.get(), (patch) => bag.set(patch)];
}
