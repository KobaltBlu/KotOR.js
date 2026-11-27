/**
 * App-facing default settings for ConfigClient (Launcher / Forge / Game).
 * Kept out of @core so the library remains install-agnostic.
 */
export const configClientDefaults: Record<string, any> = {
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
