/**
 * Register Monaco language extras for Forge NWScript editing.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nssLanguageFeatures.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { registerNssEditorExtras } from "./nssEditorExtras";
import { registerNssIntelliSense } from "./nssIntelliSense";
import type { NssLanguageHost } from "./nssLanguageHost";
import { registerNssNavigation } from "./nssNavigation";

export function registerNssLanguageFeatures(host: NssLanguageHost): void {
  registerNssIntelliSense(host);
  registerNssNavigation(host);
  registerNssEditorExtras(host);
}
