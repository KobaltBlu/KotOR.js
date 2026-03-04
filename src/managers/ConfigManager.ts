import * as fs from 'fs';

import { DeepObject } from "@/utility/DeepObject";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Config);

/**
 * ConfigManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ConfigManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export interface ConfigObject {
  [key: string]: ConfigValue;
}
export type ConfigValue = string | number | boolean | null | ConfigValue[] | ConfigObject;

/** Parse JSON string to config shape; used to satisfy no-unsafe-assignment from JSON.parse. */
function parseConfigRecord(s: string): Record<string, ConfigValue> {
  return JSON.parse(s) as Record<string, ConfigValue>;
}
/** Parse JSON string to a single ConfigValue (for clone). */
function parseConfigValue(s: string): ConfigValue {
  return JSON.parse(s) as ConfigValue;
}

export class ConfigManager {
  listeners: Record<string, ((path: string, value: ConfigValue, old: ConfigValue) => void)[]> = {};
  options: Record<string, ConfigValue>;

  constructor(json_path: string) {
    log.trace('ConfigManager constructor entry', json_path);
    let _settings: Record<string, ConfigValue> = {};
    this.listeners = {};

    try{
      log.trace('ConfigManager constructor json_path=%s', json_path);
      try {
        const raw = fs.readFileSync(json_path, 'utf-8');
        log.trace('ConfigManager readFile length', raw?.length ?? 0);
        _settings = JSON.parse(raw) as Record<string, ConfigValue>;
        log.trace('ConfigManager parsed keys', Object.keys(_settings).length);
      } catch (e) { log.error('ConfigManager parse/read failed', e as Error); }
      log.trace('ConfigManager loaded settings');
    }catch(e){ log.error('ConfigManager init failed', e as Error); }

    log.trace('ConfigManager Merge defaults with _settings');
    this.options = DeepObject.Merge<Record<string, ConfigValue>>(defaults, _settings);
    log.trace('ConfigManager cache()');
    this.cache();

    if (typeof _settings === 'object') {
      // this.Save(null, true);
    }

    // if(typeof ipcRenderer != 'undefined'){
    //   ipcRenderer.on('config-changed', (event, data) => {
    //     this.options = data;
    //     let diffs = this.diff(this.options, this._cache);
    //     for(let i = 0, len = diffs.length; i < len; i++){
    //       this.triggerEvent(diffs[i].key, diffs[i].value, diffs[i].old);
    //     }
    //   });
    // }else if(typeof ipcMain != 'undefined'){
    //   ipcMain.on('config-changed', (event, data) => {
    //     this.options = data;
    //     let diffs = this.diff(this.options, this._cache);
    //     for(let i = 0, len = diffs.length; i < len; i++){
    //       this.triggerEvent(diffs[i].key, diffs[i].value, diffs[i].old);
    //     }
    //   });
    // }

    log.trace('ConfigManager constructor Projects_Directory check');
    const projectsDir: ConfigValue | undefined = this.get('Projects_Directory');
    const dirPath: string = typeof projectsDir === 'string' ? projectsDir : String(projectsDir ?? '');
    log.trace('ConfigManager constructor dirPath', dirPath || '(empty)');
    if (dirPath && !fs.existsSync(dirPath)) {
      log.trace('ConfigManager constructor mkdir', dirPath);
      try {
        fs.mkdirSync(dirPath);
        log.debug('ConfigManager constructor created Projects_Directory');
      } catch (e) {
        log.warn('Failed to create the projects directory: "%s"', dirPath, e);
      }
    }

    log.info('ConfigManager constructor complete');
  }

  _cache: Record<string, ConfigValue> = {};

  // https://gomakethings.com/getting-the-differences-between-two-objects-with-vanilla-js/
  diff(obj1: Record<string, ConfigValue>, obj2: Record<string, ConfigValue>, key = '', diffs: { key: string; value: ConfigValue; old: ConfigValue }[] = []): { key: string; value: ConfigValue; old: ConfigValue }[] {
    log.trace('ConfigManager.diff() key=%s', key);
    if (!obj2 || Object.prototype.toString.call(obj2) !== '[object Object]') {
      log.trace('ConfigManager.diff() no obj2 or not object, return');
      return diffs;
    }

    const keys = Object.keys(obj1);
    log.trace('ConfigManager.diff() keys count', keys.length);
    for (const _key of keys) {
      if (Object.hasOwn(obj1, _key)) {
        log.trace('ConfigManager.diff() _compare', _key);
        this._compare(obj1[_key], obj2[_key], key ? key + '.' + _key : _key, diffs);
      }
    }

    log.trace('ConfigManager.diff() diffs length', diffs.length);
    return diffs;
  }

  cache(): void {
    log.trace('ConfigManager.cache()');
    const parsed = parseConfigRecord(JSON.stringify(this.options));
    this._cache = parsed;
    log.debug('ConfigManager.cache() updated');
  }

  _compare(item1: ConfigValue, item2: ConfigValue, key: string, diffs: { key: string; value: ConfigValue; old: ConfigValue }[]): void {
    log.trace('ConfigManager._compare() key=%s', key);
    const type1: string = Object.prototype.toString.call(item1) as string;
    const type2: string = Object.prototype.toString.call(item2) as string;
    log.trace('ConfigManager._compare() type1=%s type2=%s', type1, type2);

    if (type2 === '[object Undefined]') {
      log.trace('ConfigManager._compare() type2 undefined, return');
      return;
    }

    if (type1 === '[object Object]') {
      log.trace('ConfigManager._compare() object branch, diff');
      this.diff(item1 as Record<string, ConfigValue>, (item2 ?? {}) as Record<string, ConfigValue>, key, diffs);
      return;
    }

    if (type1 === '[object Array]') {
      log.trace('ConfigManager._compare() array branch');
      if (!this._arraysMatch(item1 as ConfigValue[], (item2 ?? []) as ConfigValue[])) {
        const entry: { key: string; value: ConfigValue; old: ConfigValue } = { key, value: item1, old: item2 };
        diffs.push(entry);
        log.trace('ConfigManager._compare() array diff pushed');
      }
      return;
    }

    if (item1 !== item2) {
      log.trace('ConfigManager._compare() value diff');
      const entry: { key: string; value: ConfigValue; old: ConfigValue } = { key, value: item1, old: item2 };
      diffs.push(entry);
      return;
    }

    log.trace('ConfigManager._compare() equal');
  }

  //https://gomakethings.com/getting-the-differences-between-two-objects-with-vanilla-js/
  _arraysMatch(arr1: ConfigValue[], arr2: ConfigValue[]): boolean {
    log.trace('ConfigManager._arraysMatch()', arr1.length, arr2.length);
    if (arr1.length !== arr2.length) {
      log.trace('ConfigManager._arraysMatch() length mismatch');
      return false;
    }
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) {
        log.trace('ConfigManager._arraysMatch() mismatch at', i);
        return false;
      }
    }
    log.trace('ConfigManager._arraysMatch() true');
    return true;
  }

  get(path: string | string[] = '', defaultValue?: ConfigValue): ConfigValue | undefined {
    const pathStr = Array.isArray(path) ? path.join('.') : path;
    log.trace('ConfigManager.get() path=%s', pathStr);

    const parts = pathStr.split('.');
    log.trace('ConfigManager.get() parts', parts.length);
    let property: Record<string, ConfigValue> | ConfigValue | undefined = this.options;
    for (let i = 0, len = parts.length; i < len; i++) {
      const next: ConfigValue | undefined = (property as Record<string, ConfigValue>)[parts[i]];
      log.trace('ConfigManager.get() part', i, parts[i], typeof next);
      if (typeof next !== 'undefined') {
        property = next as Record<string, ConfigValue> | ConfigValue;
      } else {
        property = undefined;
        break;
      }
    }

    if (property !== this.options) {
      if (property == null || property === 'null') {
        log.debug('ConfigManager.get() path=%s returning default', pathStr);
        return defaultValue;
      }
      log.trace('ConfigManager.get() returning property');
      return property;
    }

    log.debug('ConfigManager.get() path=%s not found', pathStr);
    return undefined;
  }

  set(path: string | string[] = '', value: ConfigValue = ''): ConfigValue | undefined {
    const pathStr = Array.isArray(path) ? path.join('.') : path;
    log.trace('ConfigManager.set() path=%s', pathStr);

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'object' || Array.isArray(value)) {
      log.trace('ConfigManager.set() value type ok');
      const parts = pathStr.split('.');
      let scope: Record<string, ConfigValue> | ConfigValue = this.options;
      const len = Math.max(parts.length - 1, 0);
      let i = 0;
      for (i = 0; i < len; i++) {
        const s: Record<string, ConfigValue> = scope as Record<string, ConfigValue>;
        const partVal: ConfigValue | undefined = s[parts[i]];
        log.trace('ConfigManager.set() scope part', i, parts[i]);
        if (partVal) {
          scope = partVal;
        }
        if (typeof scope === 'undefined') {
          log.warn('ConfigManager.set Invalid property path=%s', pathStr);
          return undefined;
        }
      }

      const s: Record<string, ConfigValue> = scope as Record<string, ConfigValue>;
      if (s[parts[i]] === this.options) {
        return undefined;
      }
      if (typeof s[parts[len]] === 'undefined') {
        s[parts[len]] = {};
      }
      if (typeof s[parts[len]] !== 'undefined') {
        const prevVal = s[parts[len]];
        const _old = parseConfigValue(JSON.stringify(prevVal));
        s[parts[len]] = value;
        if (_old !== value) {
          log.debug('ConfigManager.set() path=%s changed, triggering event', pathStr);
          this.triggerEvent(pathStr, value, _old);
          this.save(undefined, true);
        }
      }
      log.trace('ConfigManager.set() done');
    } else {
      log.warn('ConfigManager.set Invalid value type type=%s', typeof value, value);
    }
  }

  triggerEvent(path: string, value: ConfigValue, old: ConfigValue): void {
    log.trace('ConfigManager.triggerEvent() path=%s', path);
    const listener = this.listeners[path];
    if (Array.isArray(listener)) {
      log.debug('ConfigManager.triggerEvent() path=%s listenerCount=%s', path, String(listener.length));
      for (let i = 0, len = listener.length; i < len; i++) {
        const callback = listener[i];
        if (typeof callback === 'function') {
          log.trace('ConfigManager.triggerEvent() invoke', i);
          callback(path, value, old);
        }
      }
    } else {
      log.trace('ConfigManager.triggerEvent() no listeners');
    }
    this.cache();
    log.trace('ConfigManager.triggerEvent() done');
  }

  //Add an EventListener for a property path
  //EventListeners can have multiple callbacks per property
  on(path: string = '', callback?: (path: string, value: ConfigValue, old: ConfigValue) => void): void {
    log.trace('ConfigManager.on() entry path=%s', path);
    if (path && callback) {
      let listenerObject = this.listeners[path];
      if (typeof listenerObject === 'object' && Array.isArray(listenerObject)) {
        const index = listenerObject.indexOf(callback);
        if (index === -1) {
          listenerObject.push(callback);
          log.debug('ConfigManager.on() added listener for path=%s', path);
        }
      } else {
        listenerObject = [];
        listenerObject.push(callback);
        this.listeners[path] = listenerObject;
        log.debug('ConfigManager.on() registered path=%s', path);
      }
    } else {
      log.trace('ConfigManager.on() skip (no path or callback)');
    }
    log.trace('ConfigManager.on() exit');
  }

  //Remove an EventListener for a property path
  //EventListeners can have multiple callbacks per property
  off(path = '', callback?: (path: string, value: ConfigValue, old: ConfigValue) => void): void {
    log.trace('ConfigManager.off() entry path=%s', path);
    if (path) {
      const listenerObject = this.listeners[path];
      if (typeof listenerObject === 'object' && Array.isArray(listenerObject) && callback) {
        const index = listenerObject.indexOf(callback);
        log.trace('ConfigManager.off() index', index);
        if (index >= 0) {
          listenerObject.splice(index, 1);
          log.debug('ConfigManager.off() removed listener for path=%s', path);
        }
      }
    }
    log.trace('ConfigManager.off() exit');
  }

  getRecentFiles(): string[] {
    log.trace('ConfigManager.getRecentFiles()');
    return [];
  }

  getRecentProjects(): string[] {
    log.trace('ConfigManager.getRecentProjects()');
    return [];
  }

  save(onSave?: (err?: NodeJS.ErrnoException | null) => void, _silent?: boolean){
    log.trace('ConfigManager.save() entry');
    try{
      const str = JSON.stringify(this.options, null, "\t");
      log.trace('ConfigManager.save() stringify length', str?.length ?? 0);
      fs.writeFile('settings.json',
        str,
        (err) => {
          if(err){
            log.error('ConfigManager.Save failed', err);
            return;
          }
          log.trace('ConfigManager.save() writeFile done');
          if(typeof onSave === 'function'){
            onSave();
          }
        }
      );
    }catch(e){
      log.error('ConfigManager.save failed', e as Error);
    }
    log.trace('ConfigManager.save() exit');
  }

}

const defaults: Record<string, ConfigValue> = {
  first_run: true,
  Games: {
    KOTOR: {
      Location: null,
      recent_files: [],
      recent_projects: []
    },
    TSL: {
      Location: null,
      recent_files: [],
      recent_projects: []
    }
  },
  Launcher: {
    selected_profile: null,
    width: 1200,
    height: 600
  },
  Profiles: {

  },
  Game: {
    show_application_menu: false,
    debug: {
      show_fps: false,
      light_helpers: false,
      show_collision_meshes: false,
      creature_collision: true,
      door_collision: true,
      placeable_collision: true,
      world_collision: true,
      camera_collision: true,
      encounter_geometry_show: false,
      trigger_geometry_show: false,
      waypoint_geometry_show: false,
      is_shipping_build: true,
      disable_intro_movies: false,
    }
  },
  Theme: {
    NSS: {
      keywords: {
        color: "#ffb800",
        fontSize: "inherit"
      },
      methods: {
        color: "#1d7fd9",
        fontSize: "inherit"
      },
      constants: {
        color: "#9648ba",
        fontSize: "inherit"
      }
    },
    GFF: {
      struct: {
        label: {
          color: "#FFF",
          fontSize: "inherit"
        },
        "color": "#8476a2"
      },
      field: {
        label: {
          color: "#FFF",
          fontSize: "inherit"
        },
        "color": "#337a9c"
      }
    }
  },
  look_in_override: false,
  Editor: {
    profile: null,
    Module: {
      Helpers: {
        creature: {
          visible: false
        },
        door: {
          visible: false
        },
        encounter: {
          visible: false
        },
        placeable: {
          visible: false
        },
        merchant: {
          visible: false
        },
        sound: {
          visible: false
        },
        trigger: {
          visible: false
        },
        waypoint: {
          visible: false
        },
      }
    }
  },
  Panes: {
    left: {open: true},
    right: {open: true},
    top: {open: false},
    bottom: {open: false}
  },
  Projects_Directory: null,//path.join(app.getAppPath(), 'projects'),
  recent_projects: [],
  recent_files: []
};
