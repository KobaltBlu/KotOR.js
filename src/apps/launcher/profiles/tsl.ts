export const LauncherConfig: any = {
  "name": "KotOR II",
  "full_name": "Star Wars Knights of the Old Republic II: The Sith Lords",
  "icon": "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/208580/c491c003d93f0947b8e514ff1933daa7c4d8c171.ico",
  "logo": "https://steamcdn-a.akamaihd.net/steam/apps/208580/logo.png",
  "background": "https://img.wallpapersafari.com/desktop/1920/1080/64/6/vqMNET.jpg",
  "background_fallback": "./images/vqMNET.jpg",
  "category": "game",
  "directory": null,
  "locate_required": true,
  "isForgeCompatible": true,
  "steam_id" : 208580,
  "width": 1200,
  "height": 600,
  "executable": {
    "win": "swkotor2.exe",
    "mac": "KOTORII.app"
  },
  "launch": {
    "type": "electron",
    "path": "game/index.html",
    "args": { "gameChoice": 2 },
    "backgroundColor": "#000000",
    "fullscreen": true
  },
  "verify_install_dir": true,
  "elements" : [
    {
      "type": "video",
      "url": "https://steamcdn-a.akamaihd.net/steam/apps/256681358/movie_max.webm"
    }
  ],
  "settings" : {
    "fullscreen": {
      "name": "Fullscreen at launch?",
      "type": "boolean",
      "defaultValue": true
    },
    "devtools": {
      "name": "Open Devtools at launch?",
      "type": "boolean",
      "defaultValue": false
    }
  }
}