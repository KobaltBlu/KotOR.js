/**
 * Recursive merge of stored app settings onto defaults.
 *
 * Plain objects are merged key-by-key. Arrays and scalars from storage win.
 * Keys that exist only in defaults are filled in so new nested settings appear
 * for existing users.
 *
 * @file mergeConfigDefaults.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export function isPlainObject(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  // FileSystemDirectoryHandle, Date, Map, etc. must not be walked as config objects.
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function clonePlain<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => clonePlain(item)) as T;
  }
  if (isPlainObject(value)) {
    const source = value as Record<string, any>;
    const out: Record<string, any> = {};
    const keys = Object.keys(source);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      out[key] = clonePlain(source[key]);
    }
    return out as T;
  }
  return value;
}

export function mergeConfigDefaults<T extends Record<string, any>>(defaults: T, stored: unknown): T {
  if (!isPlainObject(stored)) {
    return clonePlain(defaults);
  }

  const out: Record<string, any> = {};
  const keys = Object.keys(defaults);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const defaultValue = defaults[key];
    const storedValue = stored[key];
    if (isPlainObject(defaultValue) && isPlainObject(storedValue)) {
      out[key] = mergeConfigDefaults(defaultValue, storedValue);
    } else if (typeof storedValue !== "undefined") {
      out[key] = storedValue;
    } else {
      out[key] = clonePlain(defaultValue);
    }
  }

  const storedKeys = Object.keys(stored);
  for (let i = 0; i < storedKeys.length; i++) {
    const key = storedKeys[i];
    if (typeof out[key] === "undefined") {
      out[key] = stored[key];
    }
  }

  return out as T;
}
