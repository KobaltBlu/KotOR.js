import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { ApplicationMode } from "../enums/ApplicationMode";

export class ApplicationProfile {

  static MODE: ApplicationMode;
  static ENV: ApplicationEnvironment = ApplicationEnvironment.ELECTRON;
  static directory: string;
  static key: string;
  static launch: any;

}