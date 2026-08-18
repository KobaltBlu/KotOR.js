/**
 * Application session preferences for Forge.
 *
 * @file forgeSessionSettings.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import {
  asSettingsRecord,
  createForgeSettingsBag,
  sanitizeBoolean,
} from "@/apps/forge/settings/forgeSettingsStore";

export const FORGE_SESSION_SETTINGS_KEY = "Forge.session";

export interface ForgeSessionSettings {
  restoreOpenTabs: boolean;
  confirmCloseUnsaved: boolean;
  explorerOpenOnLaunch: boolean;
  showFloatingMiniPlayer: boolean;
}

export const DEFAULT_FORGE_SESSION_SETTINGS: ForgeSessionSettings = {
  restoreOpenTabs: true,
  confirmCloseUnsaved: true,
  explorerOpenOnLaunch: true,
  showFloatingMiniPlayer: false,
};

export function sanitizeSessionSettings(value: unknown): ForgeSessionSettings {
  const raw = asSettingsRecord(value);
  return {
    restoreOpenTabs: sanitizeBoolean(raw.restoreOpenTabs, DEFAULT_FORGE_SESSION_SETTINGS.restoreOpenTabs),
    confirmCloseUnsaved: sanitizeBoolean(
      raw.confirmCloseUnsaved,
      DEFAULT_FORGE_SESSION_SETTINGS.confirmCloseUnsaved,
    ),
    explorerOpenOnLaunch: sanitizeBoolean(
      raw.explorerOpenOnLaunch,
      DEFAULT_FORGE_SESSION_SETTINGS.explorerOpenOnLaunch,
    ),
    showFloatingMiniPlayer: sanitizeBoolean(
      raw.showFloatingMiniPlayer,
      DEFAULT_FORGE_SESSION_SETTINGS.showFloatingMiniPlayer,
    ),
  };
}

export const forgeSessionSettings = createForgeSettingsBag({
  key: FORGE_SESSION_SETTINGS_KEY,
  eventName: "forge-session-settings-change",
  defaults: DEFAULT_FORGE_SESSION_SETTINGS,
  sanitize: sanitizeSessionSettings,
});

export function getSessionSettings(): ForgeSessionSettings {
  return forgeSessionSettings.get();
}

export function setSessionSettings(patch: Partial<ForgeSessionSettings>): ForgeSessionSettings {
  return forgeSessionSettings.set(patch);
}

export function shouldRestoreOpenTabs(restoreFlag: boolean, tabStates: unknown): boolean {
  return restoreFlag && Array.isArray(tabStates) && tabStates.length > 0;
}
