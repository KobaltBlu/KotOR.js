/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ConfigManager class.
 */

class ConfigManager{

  constructor(json_path){

    let _settings = {};
    try{
      //_settings = require(path.join(path.dirname(process.execPath), json_path));
      console.log('ConfigManager', json_path);
      try{
        _settings = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), json_path)));
        //_settings = require(path.join(app.getAppPath(), json_path));
      }catch(e){ console.error('ConfigManager', e); }
      console.log('ConfigManager', json_path, _settings);
    }catch(e){ console.error('ConfigManager', e); }


    this.options = $.extend({
      first_run: true,
      Games: {
        KOTOR: {
          Location: null
        },
        TSL: {
          Location: null
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
        left: {open: false},
        right: {open: true},
        top: {open: false},
        bottom: {open: false}
      },
      Projects_Directory: path.join(path.resolve(__dirname), 'projects'),
      recent_projects: [],
      recent_files: []
    }, _settings);

    if(_settings == {}){
      this.Save(null, true);
    }

  }

  Save(onSave = null, silent = false){
    //NotificationManager.Notify(NotificationManager.Types.INFO, 'Saving Configuration');
    //Write out the settings to the settings.json file in the home directory

    try{

      fs.writeFile(
        'settings.json',
        JSON.stringify(this.options, null, "\t"),
        (err) => {
          if(err){
            console.error('ConfigManager.Save', e);
            return;
          }

          if(typeof onSave === 'function'){
            onSave();
          }
      });

    }catch(e){ console.error('ConfigManager.Save', e); }

  }

}

module.exports = ConfigManager;
