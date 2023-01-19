export const LauncherConfig: any = {
  "name": "KotOR Forge",
  "full_name": "KotOR Forge",
  "icon": "./images/icon_forge.png",
  "logo": "./images/logo_forge.png",
  "background": "./images/kotor_forge.jpg",
  "category": "tools",
  "directory": null,
  "locate_required": false,
  "width": 1200,
  "height": 600,
  "launch": {
    "type": "electron",
    "path": "forge/index.html", 
    "backgroundColor": "#212121",
    "frameless": true,
    "fullscreen": false
  },
  "elements": [
    {
      "type": "gallery",
      "images": [
        {"path_full": "./images/forge_screen_01.jpg", "path_thumbnail": "./images/forge_screen_01.jpg"},
        {"path_full": "./images/forge_screen_02.jpg", "path_thumbnail": "./images/forge_screen_02.jpg"},
        {"path_full": "./images/forge_screen_03.jpg", "path_thumbnail": "./images/forge_screen_03.jpg"}
      ]
    }
  ],
  "settings" : {
    "fullscreen": {
      "name": "Fullscreen at launch?",
      "type": "boolean",
      "defaultValue": false
    },
    "devtools": {
      "name": "Open Devtools at launch?",
      "type": "boolean",
      "defaultValue": false
    }
  }
}