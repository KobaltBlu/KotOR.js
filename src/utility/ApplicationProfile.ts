import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { ApplicationMode } from "../enums/ApplicationMode";

export class ApplicationProfile {

  static MODE: ApplicationMode;
  static ENV: ApplicationEnvironment;
  static directory: string;
  static key: string;
  static launch: any;

}