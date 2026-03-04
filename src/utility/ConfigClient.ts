import { get, set } from 'idb-keyval';

import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Default);

/** Nested config value: primitives, arrays, or nested objects. */
export type ConfigValue =
  | string
  | number
  | boolean
  | null
  | ConfigValue[]
  | { [key: string]: ConfigValue };

/**
 * ConfigClient class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ConfigClient.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
/** Static config namespace; no instance state. */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- intentional static API
export class ConfigClient {
  static options: Record<string, ConfigValue> = {};
  static UUID: string = ConfigClient.uuidv4();

  private constructor() {}

  static async Init() {
    ConfigClient.options = Object.assign(
      defaults,
      (await get('app_settings')) as Record<string, ConfigValue> | undefined
    ) as Record<string, ConfigValue>;
  }

  static get(path: string | string[] = '', defaultValue?: ConfigValue): ConfigValue | undefined {
    const pathStr = Array.isArray(path) ? path.join('.') : path;
    const parts = pathStr.split('.');
    let property: ConfigValue = ConfigClient.options;
    for (let i = 0, len = parts.length; i < len; i++) {
      const obj: ConfigValue = property;
      const rec: Record<string, ConfigValue> | null =
        typeof obj === 'object' && obj !== null && !Array.isArray(obj) ? (obj as Record<string, ConfigValue>) : null;
      if (rec !== null && parts[i] in rec) {
        property = rec[parts[i]];
      } else {
        return undefined;
      }
    }

    if (property !== ConfigClient.options) {
      if (property == null || property === 'null')
        return defaultValue;
      return property;
    }

    return undefined;
  }

  static set(path: string | string[] = '', value: ConfigValue = ''): ConfigValue | undefined {
    if (Array.isArray(path))
      path = path.join('.');

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'object') {
      const pathStr = path;
      const parts = pathStr.split('.');
      let scope: ConfigValue = ConfigClient.options;
      const len = Math.max(parts.length - 1, 0);
      let i = 0;
      for (i = 0; i < len; i++) {
        const part = parts[i];
        const scopeRec: Record<string, ConfigValue> | null =
          typeof scope === 'object' && scope !== null && !Array.isArray(scope) ? (scope as Record<string, ConfigValue>) : null;
        const next: ConfigValue | undefined = scopeRec !== null ? scopeRec[part] : undefined;
        if (next !== undefined) {
          scope = next;
        } else {
          log.warn('ConfigManager.set', 'Invalid property', pathStr);
          return undefined;
        }
      }

      const lastPart = parts[len];
      const scopeObj = typeof scope === 'object' && scope !== null && !Array.isArray(scope) ? scope as Record<string, ConfigValue> : undefined;
      if (!scopeObj || scopeObj[lastPart] === ConfigClient.options) {
        return undefined;
      }

      if (scopeObj[lastPart] === undefined) {
        scopeObj[lastPart] = {};
      }

      if (scopeObj[lastPart] !== undefined) {
        const _old = JSON.parse(JSON.stringify(scopeObj[lastPart])) as ConfigValue;
        scopeObj[lastPart] = value;
        if(_old != value){
          // ConfigClient.triggerEvent(path, value, _old);
          ConfigClient.save(null, true);
        }
      }
    } else {
      log.warn('ConfigManager.set', 'Invalid value type', typeof value, value);
    }
  }

  static save(_onSave?: () => void, _silent?: boolean): void {
    set('app_settings', ConfigClient.options);
    localStorage.setItem('client-config-updated', JSON.stringify({
      time: Date.now(),
      id: ConfigClient.UUID
    }));
  }

  static uuidv4(): string {
    const template = `${[1e7]}${-1e3}${-4e3}${-8e3}${-1e11}`;
    return template.replace(/[018]/g, (c: string) =>
      (parseInt(c, 10) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (parseInt(c, 10) / 4)))).toString(16)
    );
  }
}

window.addEventListener('storage', (_event: StorageEvent) => {
  log.debug('storage', _event);
  ConfigClient.Init();
});

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
  Profiles: { },
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
  Projects_Directory: null,
  recent_projects: [],
  recent_files: []
};
