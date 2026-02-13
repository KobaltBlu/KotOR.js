import { app } from 'electron';

import { createScopedLogger, LogScope } from "../utility/Logger";

const log = createScopedLogger(LogScope.Extension);
import Main from "./Main";

log.info('args', process.argv, __dirname, app.getAppPath());

Main.setApplicationPath(app.getAppPath());
Main.main(app);

export default Main;