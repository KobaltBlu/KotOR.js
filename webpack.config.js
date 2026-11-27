const { isProd } = require('./webpack/common');

console.log('NODE_ENV', process.env.NODE_ENV);
console.log('isProd', isProd ? 'true' : 'false');

const libraryConfig  = require('./webpack/KotOR');
const launcherConfig = require('./webpack/Launcher');
const gameConfig     = require('./webpack/Game');
const forgeConfig    = require('./webpack/Forge');
const debuggerConfig = require('./webpack/Debugger');

const configs = [
  libraryConfig('KotOR.js', 'green'),
  launcherConfig('Launcher', 'orange'),
  gameConfig('Game Client', 'blue'),
  forgeConfig('Forge Client', 'yellow'),
  debuggerConfig('Debugger', 'purple'),
];

/** Comma-separated filter: kotor,launcher,game,forge,debugger */
const targetEnv = process.env.WEBPACK_TARGET?.trim();
if (targetEnv) {
  const wanted = new Set(
    targetEnv.split(',').map((s) => s.trim()).filter(Boolean)
  );
  const filtered = configs.filter((c) => wanted.has(c.name));
  if (!filtered.length) {
    console.error(
      `WEBPACK_TARGET="${targetEnv}" matched no configs. Valid: ${configs.map((c) => c.name).join(', ')}`
    );
    process.exit(1);
  }
  console.log('WEBPACK_TARGET', [...wanted].join(', '));
  module.exports = filtered;
} else {
  module.exports = configs;
}
