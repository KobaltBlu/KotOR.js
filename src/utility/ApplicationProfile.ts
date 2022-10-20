import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { ApplicationMode } from "../enums/ApplicationMode";

export class ApplicationProfile {

  static MODE: ApplicationMode = ApplicationMode.GAME;
  static ENV: ApplicationEnvironment = ApplicationEnvironment.BROWSER;
  static directory: string;
  static key: string;
  static launch: any;

}