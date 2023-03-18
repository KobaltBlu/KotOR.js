# KotOR.js
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![THREE JS](https://img.shields.io/badge/ThreeJs-black?style=for-the-badge&logo=three.js&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)
![Node JS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=for-the-badge&logo=Webpack&logoColor=white)

![KotOR.js](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/src/assets/icons/icon.png)

**A remake of the Odyssey Game Engine that powered KotOR I &amp; II written in JS (TypeScript)**

KotOR.js is a TypeScript-based remake of the Odyssey Game Engine that powered the original Star Wars: Knights of the Old Republic (KotOR) and its sequel, KotOR II: The Sith Lords. While still in the early stages of development, the project aims to make the games fully playable.

In addition to the game engine, the project includes an early attempt at a modding suite called KotOR Forge. 

## Technologies
- The code has been re-written in TypeScript and compiles down into JavaScript. 
- THREE.js is used for the base of the rendering engine. 
- Electron is used to package and publish a desktop application. 

[Discussion Thread](https://deadlystream.com/topic/6608-wip-kotor-js-a-game-engine-for-k1-k2-written-in-javascript/)  
[KotOR.js Youtube Channel](https://www.youtube.com/channel/UC7b4RL2mj0WJ7fEvbJePDbA)

## Supported Games
The following games are currently supported:
- [x] [Star Wars: Knights of the Old Republic (PC)](https://en.wikipedia.org/wiki/Star_Wars:_Knights_of_the_Old_Republic)
- [x] [Star Wars: Knights of the Old Republic II The Sith Lords (PC)](https://en.wikipedia.org/wiki/Star_Wars_Knights_of_the_Old_Republic_II:_The_Sith_Lords)

## Web Compatibility (NEW)

The recent transition to TypeScript has brought many improvements to the codebase, including Chrome support. When the project is compiled, the contents of the `dist` folder can be uploaded to a web server. The only requirement is that the site must be accessed from behind a valid SSL certificate. Using the latest version of Chrome is recommended.

[Online Demo](https://dm0wgsf1bpbo9.cloudfront.net/launcher/)

## Getting Started (Developer)
To get started as a developer, follow these steps:

1. Download and install [npm (Node Package Manager)](https://www.npmjs.com/get-npm).
2. Clone the KotOR.js repository.
3. Install the npm dependencies.

```bash
npm install
```
4. Run the build command

```bash
npm run webpack:dev-watch
```
5. Run the build command in a separate console/shell window

```bash
npm run start
```

6. Enjoy

## Screenshots

<div align="center">

| **KotOR.js Launcher** | **KotOR - Taris: Undercity** | **KotOR - Dantooine** |
|:-------------------------:|:-------------------------:|:-------------------------:|
| ![KotOR.js Launcher](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/KotOR-js-Launcher-001.jpg) | ![KotOR - Taris: Undercity](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K1-Screen-001.jpg) | ![KotOR - Dantooine](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K1-Screen-003.jpg) |
| **KotOR II - TSL: Awaken Scene** | **KotOR II - TSL: Awaken Scene 2** |  |
| ![KotOR II - TSL: Awaken Scene](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K2-Screen-001.jpg) | ![KotOR II - TSL: Awaken Scene 2](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K2-Screen-002.jpg) |

</div>

## Videos

<div align="center">

| **KotOR JS - Combat Animations Progress Jan 2021** | KotOR Forge - WIP: Lip Sync Editor Jan 2019 | **KotOR JS - Lighting & Lipsync Progress Nov 2018** |
|:---:|:---:|:---:|
| [![KotOR JS - Combat Animations Progress Jan 2021](https://img.youtube.com/vi/4oQ8nj_zO-w/0.jpg)](https://www.youtube.com/watch?v=4oQ8nj_zO-w) | [![KotOR Forge - WIP: Lip Sync Editor Jan 2019](https://img.youtube.com/vi/4s4uTyP5yqA/0.jpg)](https://www.youtube.com/watch?v=4s4uTyP5yqA) | [![KotOR JS - Lighting & Lipsync Progress Nov 2018](https://img.youtube.com/vi/2SATn5W2sb4/0.jpg)](https://www.youtube.com/watch?v=2SATn5W2sb4) | [![KotOR JS - Lighting & Lipsync Progress Nov 2018](https://img.youtube.com/vi/2SATn5W2sb4/0.jpg)](https://www.youtube.com/watch?v=2SATn5W2sb4)
| KotOR JS : TSL - Gameplay Compilation Sep 2018 | KotOR JS: The Endar Spire Sep 2018 |
| [![KotOR JS : TSL - Gameplay Compilation Sep 2018](https://img.youtube.com/vi/IpP6BQJ5ZBQ/0.jpg)](https://www.youtube.com/watch?v=IpP6BQJ5ZBQ) | [![KotOR JS: The Endar Spire](https://img.youtube.com/vi/y2UzOH5bcAQ/0.jpg)](https://www.youtube.com/watch?v=y2UzOH5bcAQ)

</div>

## Influences & Credits

Without these people below I couldn't have gotten this far.  
[xoreos](https://xoreos.org/)  
[The KotOR Modding Community](https://deadlystream.com/)   
  
And many many more!

## License

[GPL 3.0 (GNU General Public License)](LICENSE.md)
