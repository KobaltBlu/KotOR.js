import * as swKotOR from "../game/kotor/swkotor-config";
import * as swKotOR2 from "../game/tsl/swkotor2-config";
import { DeepObject } from "../utility/DeepObject";
import { GameFileSystem } from "../utility/GameFileSystem";
import { createScopedLogger, LogScope } from "../utility/Logger";

const log = createScopedLogger(LogScope.Default);

/** INI value: primitive or nested section. */
export type IniValue = string | number | boolean | Record<string, string | number | boolean | Record<string, string | number | boolean>>;

/**
 * INIConfig class.
 * Loads/saves swKotor.ini (K1) or swKotor2.ini (K2). Section and key names match the
 * original game INI layout (Sound Options, Graphics Options, Game Options, Keymapping,
 * Autopause Options; K2: Display Options, config; both: Movies Shown).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file INIConfig.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class INIConfig {
  ini_path: string;
  defaults: Record<string, IniValue>;
  options: Record<string, IniValue> = {};
  current_section: string | null = null;

  static defaultConfigs: Record<string, Record<string, IniValue>> = {
    swKotOR: swKotOR.default,
    swKotOR2: swKotOR2.default
  };

  constructor(ini_path: string, defaults: Record<string, IniValue> = {}) {
    this.ini_path = ini_path;
    this.defaults = defaults;
    this.options = {};
  }

  async load(): Promise<void> {
    try {
      const buffer = await GameFileSystem.readFile(this.ini_path);
      const decoder = new TextDecoder('utf-8');
      const ini_text = decoder.decode(buffer);
      const lines = ini_text.split(/\r?\n/);

      this.current_section = null;

      for (let i = 0, len = lines.length; i < len; i++) {
        const line = lines[i].trim();
        if (!line.length) {
          continue;
        }

        const section = line.match(/^\[(.*)\]$/);
        const property = line.split('=');
        if (section != null && section.length) {
          this.current_section = section[1];
          this.options[section[1]] = {};
        } else if (property.length) {
          const name = property.shift();
          let value = property.join('=');

          try {
            value = JSON.parse(value.toString());
          } catch (e) {
            value = value.toString();
          }

          if (this.current_section) {
            const section = this.options[this.current_section];
            if (typeof section === 'object' && section !== null && !Array.isArray(section)) {
              (section as Record<string, IniValue>)[name] = value;
            }
          } else {
            this.options[name] = value;
          }
        }
      }
      this.options = DeepObject.Merge(this.defaults, this.options);
      return;
    } catch (e) {
      log.error('INIConfig.load', e as Error);
      this.options = DeepObject.Merge(this.defaults, this.options);
      return;
    }
  }

  // Code copied from linked Stack Overflow question
  // https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
  // Answer by Salakar:
  // https://stackoverflow.com/users/2938161/salakar
  getProperty(key: string): IniValue | undefined {
    //https://stackoverflow.com/a/20424385
    const parts = key.split('.');
    let o: Record<string, IniValue> = this.options;
    if (parts.length > 1) {
      for (let i = 0; i < parts.length - 1; i++) {
        if (!o[parts[i]])
          o[parts[i]] = {};
        o = o[parts[i]] as Record<string, IniValue>;
      }
    }

    return o[parts[parts.length - 1]];
  }

  setProperty(key: string, value: IniValue) {
    //https://stackoverflow.com/a/20424385
    const parts = key.split('.');
    let o: Record<string, IniValue> = this.options;
    if (parts.length > 1) {
      for (let i = 0; i < parts.length - 1; i++) {
        if (!o[parts[i]])
          o[parts[i]] = {};
        o = o[parts[i]] as Record<string, IniValue>;
      }
    }

    o[parts[parts.length - 1]] = value;
  }

  toString(): string {
    let string = '';
    const keys = Object.keys(this.options);
    for (let i = 0, len = keys.length; i < len; i++) {
      string += this.toStringNodeWalker(keys[i], this.options[keys[i]]);
    }
    return '\r\n' + string;
  }

  toStringNodeWalker(key: string, value: IniValue): string {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      let string = '[' + key + ']\r\n';
      const keys = Object.keys(value);
      for (let i = 0, len = keys.length; i < len; i++) {
        string += this.toStringNodeWalker(keys[i], value[keys[i]]);
      }
      return string + '\r\n';
    } else {
      return key + '=' + value + '\r\n';
    }
  }

  async save() {
    try {
      log.debug(`INIConfig saving: ${this.ini_path}`);
      const encoder = new TextEncoder();
      await GameFileSystem.writeFile(this.ini_path, encoder.encode(this.toString()));
      log.debug(`INIConfig saved: ${this.ini_path}`);
    } catch (e) {
      log.error('INIConfig.save', e as Error);
    }
  }

}
