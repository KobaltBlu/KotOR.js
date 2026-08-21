/**
 * Typed ConfigClient bags for Forge settings pages.
 *
 * @file forgeSettingsStore.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ConfigClient } from "@/utility/ConfigClient";

export function asSettingsRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

export function sanitizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === "string" && allowed.indexOf(value as T) !== -1) {
    return value as T;
  }
  return fallback;
}

export function sanitizeNumber(value: unknown, fallback: number, min?: number, max?: number): number {
  const size = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(size)) {
    return fallback;
  }
  let next = size;
  if (typeof min === "number" && next < min) {
    next = min;
  }
  if (typeof max === "number" && next > max) {
    next = max;
  }
  return next;
}

export function sanitizeInteger(value: unknown, fallback: number, min?: number, max?: number): number {
  return Math.round(sanitizeNumber(value, fallback, min, max));
}

export type ForgeSettingsListener<T> = (settings: T) => void;

export interface ForgeSettingsBag<T> {
  key: string;
  defaults: T;
  get: () => T;
  set: (patch: Partial<T>) => T;
  sanitize: (value: unknown) => T;
  addListener: (listener: ForgeSettingsListener<T>) => void;
  removeListener: (listener: ForgeSettingsListener<T>) => void;
}

export function createForgeSettingsBag<T extends object>(options: {
  key: string;
  eventName?: string;
  defaults: T;
  sanitize: (value: unknown) => T;
}): ForgeSettingsBag<T> {
  const listeners: ForgeSettingsListener<T>[] = [];

  const notify = (settings: T) => {
    for (let i = 0; i < listeners.length; i++) {
      listeners[i](settings);
    }
    if (options.eventName && typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent(options.eventName, { detail: settings }));
    }
  };

  const get = (): T => options.sanitize(ConfigClient.get(options.key));

  return {
    key: options.key,
    defaults: options.defaults,
    sanitize: options.sanitize,
    get,
    set: (patch: Partial<T>): T => {
      const next = options.sanitize({
        ...get(),
        ...patch,
      });
      ConfigClient.set(options.key, next);
      notify(next);
      return next;
    },
    addListener: (listener: ForgeSettingsListener<T>) => {
      if (listeners.indexOf(listener) === -1) {
        listeners.push(listener);
      }
    },
    removeListener: (listener: ForgeSettingsListener<T>) => {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    },
  };
}
