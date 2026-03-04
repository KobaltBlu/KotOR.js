import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import * as swKotOR from "@/game/kotor/swkotor-config";
import * as swKotOR2 from "@/game/tsl/swkotor2-config";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { DeepObject } from "@/utility/DeepObject";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { createScopedLogger, LogScope } from "@/utility/Logger";

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

  static defaultConfigs: Record<string, Record<string, IniValue>> = {
    swKotOR: swKotOR.default,
    swKotOR2: swKotOR2.default
  };

  private get storageKey(): string {
    return `kotor_ini_config_${this.ini_path.replace(/\./g, '_')}`;
  }

  constructor(ini_path: string, defaults: Record<string, IniValue> = {}) {
    this.ini_path = ini_path;
    this.defaults = defaults;
    this.options = {};
  }

  /** Merge defaults with current options into a new object (does not mutate defaults). */
  private applyDefaults(overrides: Record<string, IniValue>): void {
    this.options = DeepObject.Merge({}, this.defaults, overrides);
  }

  /** Parse INI text (same format as file / localStorage) into an object. */
  private parseIniText(raw: string): Record<string, IniValue> {
    const lines = raw.split(/\r?\n/);
    const parsed: Record<string, IniValue> = {};
    let currentSection: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.length) continue;
      if (line.startsWith(';') || line.startsWith('#')) continue;

      const section = line.match(/^\[(.*)\]$/);
      if (section) {
        currentSection = section[1].trim();
        parsed[currentSection] = parsed[currentSection] || {};
        continue;
      }

      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const name = line.slice(0, eq).trim();
      if (!name.length) continue;
      let value: IniValue = line.slice(eq + 1).trim();
      try {
        value = JSON.parse(value as string);
      } catch {
        // keep as string
      }

      if (currentSection) {
        (parsed[currentSection] as Record<string, IniValue>)[name] = value;
      } else {
        parsed[name] = value;
      }
    }
    return parsed;
  }

  async load(): Promise<void> {
    if (ApplicationProfile.ENV === ApplicationEnvironment.ELECTRON) {
      try {
        const buffer = await GameFileSystem.readFile(this.ini_path);
        const raw = new TextDecoder('utf-8').decode(buffer);
        this.applyDefaults(this.parseIniText(raw));
        return;
      } catch (e) {
        log.error('INIConfig.load', e as Error);
        this.applyDefaults({});
        return;
      }
    }

    // Browser: defaultConfigs on first run, then INI text from localStorage if available
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : null;
      this.applyDefaults(stored ? this.parseIniText(stored) : {});
    } catch (e) {
      log.error('INIConfig.load', e as Error);
      this.applyDefaults({});
    }
  }

  // Code copied from linked Stack Overflow question
  // https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
  // Answer by Salakar:
  // https://stackoverflow.com/users/2938161/salakar
  getProperty(key: string): IniValue | undefined {
    const parts = key.split('.');
    let o: Record<string, IniValue> = this.options;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!o[parts[i]]) o[parts[i]] = {};
      o = o[parts[i]] as Record<string, IniValue>;
    }
    return o[parts[parts.length - 1]];
  }

  setProperty(key: string, value: IniValue): void {
    const parts = key.split('.');
    let o: Record<string, IniValue> = this.options;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!o[parts[i]]) o[parts[i]] = {};
      o = o[parts[i]] as Record<string, IniValue>;
    }
    o[parts[parts.length - 1]] = value;
  }

  toString(): string {
    const parts: string[] = [];
    for (const key of Object.keys(this.options)) {
      parts.push(this.toStringNodeWalker(key, this.options[key]));
    }
    return '\r\n' + parts.join('');
  }

  private toStringNodeWalker(key: string, value: IniValue): string {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      let out = '[' + key + ']\r\n';
      for (const k of Object.keys(value)) {
        out += this.toStringNodeWalker(k, value[k]);
      }
      return out + '\r\n';
    }
    return key + '=' + value + '\r\n';
  }

  async save(): Promise<void> {
    if (ApplicationProfile.ENV === ApplicationEnvironment.ELECTRON) {
      try {
        log.debug(`INIConfig saving: ${this.ini_path}`);
        await GameFileSystem.writeFile(this.ini_path, new TextEncoder().encode(this.toString()));
        log.debug(`INIConfig saved: ${this.ini_path}`);
      } catch (e) {
        log.error('INIConfig.save', e as Error);
      }
      return;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, this.toString());
      }
    } catch (e) {
      log.error('INIConfig.save', e as Error);
    }
  }

}
