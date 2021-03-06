# KotOR.js

**A remake of the Odyssey Game Engine that powered KotOR I &amp; II written in JavaScript**

This project is still in it's early stages. Things like displaying Ingame Menus, Models, Sound, Particle Effects, and Scripting are all in various stages of working. While some parts of the game are playable to some extent, there is still a long ways to go before it can play either game from beginning to end. My hope is that this project will eventually be able to play KotOR and TSL in full.

There is also very early attempt at a Modding Suite called KotOR Forge packaged inside.

The code is written in Javascript. It uses THREE.js for the rendering engine, and Electron to package and run the code as an app.

If you plan on trying to run either game you will have to already have them, or purchase them from an official retailer like GoG or Steam. Once you attempt to launch either game from the KotOR.js launcher for the first time you will be asked to locate the install directory of said game.

[Discussion Thread](https://deadlystream.com/topic/6608-wip-kotor-js-a-game-engine-for-k1-k2-written-in-javascript/)  
[KotOR.js Youtube Channel](https://www.youtube.com/channel/UC7b4RL2mj0WJ7fEvbJePDbA)

## Supported Games

- [x] [Star Wars: Knights of the Old Republic (PC)](https://en.wikipedia.org/wiki/Star_Wars:_Knights_of_the_Old_Republic)
- [x] [Star Wars: Knights of the Old Republic II The Sith Lords (PC)](https://en.wikipedia.org/wiki/Star_Wars_Knights_of_the_Old_Republic_II:_The_Sith_Lords)

## Getting Started

You will need to have installed [npm (Node Package Manager)](https://www.npmjs.com/get-npm), then download the KotOR.js repository. 
You can then follow the steps below to run the project.

**Console/Shell**
```bash
# Install dependencies
npm install
# Rebuild compiled dependencies
npm run rebuild
# Run the app
npm start
```

**Windows**

- Navigate to the KotOR.js root directory
- Run install.bat (You only need to do this before the first run)
- Run start.bat to launch the program

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
