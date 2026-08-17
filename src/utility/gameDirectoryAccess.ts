/**
 * Persist KotOR / TSL install folders independently of the in-memory profile.
 *
 * Directory handles cannot always ride along on `Profiles.*` after a config
 * merge, so they are also stored under dedicated IndexedDB keys.
 *
 * @file gameDirectoryAccess.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { get, set, del } from "idb-keyval";
import { ConfigClient } from "@/utility/ConfigClient";

export function gameDirectoryHandleIdbKey(gameKey: string): string {
  return `game_directory_handle_${String(gameKey || "").toLowerCase()}`;
}

export async function persistGameDirectoryHandle(
  gameKey: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const key = String(gameKey || "").toLowerCase();
  ConfigClient.set(`Profiles.${key}.directory_handle`, handle);
  await set(gameDirectoryHandleIdbKey(key), handle);
}

export function persistGameDirectoryPath(gameKey: string, directory: string): void {
  const key = String(gameKey || "").toLowerCase();
  ConfigClient.set(`Profiles.${key}.directory`, directory);
}

export async function restoreGameDirectoryHandlesToProfiles(): Promise<void> {
  const profiles = ConfigClient.options?.Profiles;
  if (!profiles || typeof profiles !== "object") {
    return;
  }
  const keys = Object.keys(profiles);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const slot = profiles[key];
    if (!slot || typeof slot !== "object") {
      continue;
    }
    if (slot.directory_handle) {
      continue;
    }
    const stored = await get(gameDirectoryHandleIdbKey(key));
    if (stored) {
      slot.directory_handle = stored;
    }
  }
}

export async function clearGameDirectoryBinding(gameKey: string): Promise<void> {
  const key = String(gameKey || "").toLowerCase();
  const slot = ConfigClient.options?.Profiles?.[key];
  if (slot && typeof slot === "object") {
    delete slot.directory;
    delete slot.directory_handle;
  }
  ConfigClient.save();
  await del(gameDirectoryHandleIdbKey(key));
}

export function boundGameDirectoryLabel(profile: {
  directory?: string;
  directory_handle?: { name?: string };
} | null | undefined, env: "electron" | "browser"): string {
  if (!profile) {
    return "";
  }
  if (env === "electron") {
    return String(profile.directory || "");
  }
  return String(profile.directory_handle?.name || "");
}

export function hasBoundGameDirectory(profile: {
  directory?: string;
  directory_handle?: unknown;
} | null | undefined, env: "electron" | "browser"): boolean {
  if (env === "electron") {
    return !!profile?.directory;
  }
  return !!profile?.directory_handle;
}
