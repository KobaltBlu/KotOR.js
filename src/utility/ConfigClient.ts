import { get, set } from 'idb-keyval';
import { isPlainObject, mergeConfigDefaults } from '@/utility/mergeConfigDefaults';

/**
 * ConfigClient class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ConfigClient.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ConfigClient {
  static options: any = {};
  static UUID: string = ConfigClient.uuidv4();

  static async Init() {
    ConfigClient.options = mergeConfigDefaults(
      defaults,
      await get('app_settings')
    );
  }

  static get(path: string|any[] = '', defaultValue?:any){
    if(Array.isArray(path))
      path = path.join('.');

    let parts = path.split('.');
    let property = ConfigClient.options;
    for(let i = 0, len = parts.length; i < len; i++){
      if(typeof property[parts[i]] != 'undefined'){
        property = property[parts[i]];
      }else{
        property = undefined;
        break;
      }
    }

    if(property != ConfigClient.options){
      if(property == null || property == 'null')
        return defaultValue;

      return property;
    }

    return undefined;
  }

  static set(path: string|any[] = '', value: any = ''): any {
    if(Array.isArray(path))
      path = path.join('.');

    if(typeof value == 'string' || typeof value == 'number' || typeof value == 'boolean' || typeof value == 'object' || Array.isArray(value)){
      let parts = path.split('.').filter((part) => part.length > 0);
      if(!parts.length){
        console.warn('ConfigManager.set', 'Invalid property', path);
        return undefined;
      }

      let scope = ConfigClient.options;
      const last = parts.length - 1;
      for(let i = 0; i < last; i++){
        const part = parts[i];
        const next = scope[part];
        if(!isPlainObject(next)){
          scope[part] = {};
        }
        scope = scope[part];
      }

      const leaf = parts[last];
      if(leaf == '' || typeof scope == 'undefined'){
        console.warn('ConfigManager.set', 'Invalid property', path);
        return undefined;
      }

      let _old: any = undefined;
      try {
        _old = JSON.parse(JSON.stringify(scope[leaf]));
      }catch(e){
        _old = undefined;
      }
      scope[leaf] = value;
      if(_old != value){
        ConfigClient.save(null, true);
      }
    }else{
      console.warn('ConfigManager.set', 'Invalid value type', typeof value, value);
    }
  }

  static save(onSave?: Function, silent?: boolean){
    set('app_settings', ConfigClient.options);
    localStorage.setItem('client-config-updated', JSON.stringify({
      time: Date.now(),
      id: ConfigClient.UUID
    }));
  }

  static uuidv4() {
    return (([1e7] as any)+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, (c:any) =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event: StorageEvent) => {
    console.log('storage', event);
    ConfigClient.Init();
  });
}

const defaults: any = {
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
    },
    NcsInspector: {
      layoutMode: 'assembly',
      showFunctions: false,
      showDetails: false,
      drawerOpen: false,
      drawerWidth: 440,
      experienceVersion: 2,
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
  recent_files: [],
  Forge: {
    themeByGame: {
      KOTOR: 'kotor-dark',
      TSL: 'tsl-dark',
    },
    userThemes: [],
    themeCustomizations: {},
    defaultEditors: {},
    editor: {
      fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
      fontSize: 14,
      fontLigatures: false,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'off',
      minimap: true,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      scrollBeyondLastLine: true,
      mouseWheelZoom: false,
    },
    session: {
      restoreOpenTabs: true,
      confirmCloseUnsaved: true,
      explorerOpenOnLaunch: true,
      showFloatingMiniPlayer: false,
      traskTourCompleted: false,
    },
    localization: {
      language: 0,
      gender: 0,
      previewStrRefFromTlk: true,
    },
    editors: {
      hex: {
        offsetDisplay: 'hex',
        bytesPerRow: 16,
        showAscii: true,
        uppercase: true,
      },
      gff: {
        showType: true,
        showPreview: true,
        previewMaxLength: 48,
      },
      twoda: {
        wrapCells: false,
        showRowLabel: true,
      },
      tlk: {
        searchResultCap: 500,
        autoplayVo: false,
      },
      ssf: {
        autoplayOnSelect: false,
      },
      viewport: {
        layers: {
          lights: true,
          emitters: true,
          walkmeshes: false,
          trimesh: true,
          skin: true,
          dangly: true,
          saber: true,
          childModels: true,
          layout: true,
          ground: true,
        },
        windPower: 1,
        wokWireframe: true,
        wokGrid: true,
      },
      module: {
        helpers: {
          creature: true,
          door: true,
          encounter: true,
          placeable: true,
          merchant: true,
          sound: true,
          trigger: true,
          waypoint: true,
        },
      },
      blueprints: {
        show3DPreview: true,
        autoExpandLocString: false,
      },
      dlg: {
        graphLayout: 'vertical',
      },
      lip: {
        head: 'p_bastilah',
      },
      image: {
        filter: 'nearest',
        checkerboard: true,
        defaultZoom: '100',
      },
      audio: {
        volume: 0.25,
        loop: false,
        visualization: 'spectrum',
      },
      gui: {
        zoomStep: 0.25,
        zoomMin: 0.1,
        zoomMax: 5,
      },
      archives: {
        confirmExtractOverwrite: true,
      },
    },
  },
};

export { mergeConfigDefaults };
