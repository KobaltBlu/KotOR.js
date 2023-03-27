import { app, BrowserWindow } from 'electron';
import Main from "./Main";

console.log('args', process.argv, __dirname, app.getAppPath());

Main.setApplicationPath(app.getAppPath());
Main.main(app);

export default Main;