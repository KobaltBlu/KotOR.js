import { get, set } from 'idb-keyval';
import { isPlainObject, mergeConfigDefaults } from '@core/utility/mergeConfigDefaults';

/**
 * ConfigClient class.
 *
 * Thin IndexedDB-backed key/value settings store for browser apps.
 * App-specific default trees are supplied by callers (see apps/common/config).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ConfigClient.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ConfigClient {
  static options: any = {};
  static UUID: string = ConfigClient.uuidv4();
  /** Defaults merged on Init; set by apps before first Init. */
  static defaults: Record<string, any> = {};

  static async Init(defaults?: Record<string, any>) {
    if (defaults) {
      ConfigClient.defaults = defaults;
    }
    ConfigClient.options = mergeConfigDefaults(
      ConfigClient.defaults,
      await get('app_settings')
    );
  }

  static get(path: string|any[] = '', defaultValue?:any){
    if(Array.isArray(path))
      path = path.join('.');

    let parts = path.split('.');
    let property = ConfigClient.options;
    for(let i = 0, len = parts.length; i < len; i++){
      if(typeof property[parts[i]] != 'undefined'){
        property = property[parts[i]];
      }else{
        property = undefined;
        break;
      }
    }

    if(property != ConfigClient.options){
      if(property == null || property == 'null')
        return defaultValue;

      return property;
    }

    return undefined;
  }

  static set(path: string|any[] = '', value: any = ''): any {
    if(Array.isArray(path))
      path = path.join('.');

    if(typeof value == 'string' || typeof value == 'number' || typeof value == 'boolean' || typeof value == 'object' || Array.isArray(value)){
      let parts = path.split('.').filter((part) => part.length > 0);
      if(!parts.length){
        console.warn('ConfigClient.set', 'Invalid property', path);
        return undefined;
      }

      let scope = ConfigClient.options;
      const last = parts.length - 1;
      for(let i = 0; i < last; i++){
        const part = parts[i];
        const next = scope[part];
        if(!isPlainObject(next)){
          scope[part] = {};
        }
        scope = scope[part];
      }

      const leaf = parts[last];
      if(leaf == '' || typeof scope == 'undefined'){
        console.warn('ConfigClient.set', 'Invalid property', path);
        return undefined;
      }

      let _old: any = undefined;
      try {
        _old = JSON.parse(JSON.stringify(scope[leaf]));
      }catch(e){
        _old = undefined;
      }
      scope[leaf] = value;
      if(_old != value){
        ConfigClient.save(null, true);
      }
    }else{
      console.warn('ConfigClient.set', 'Invalid value type', typeof value, value);
    }
  }

  static save(onSave?: Function, silent?: boolean){
    set('app_settings', ConfigClient.options);
    localStorage.setItem('client-config-updated', JSON.stringify({
      time: Date.now(),
      id: ConfigClient.UUID
    }));
  }

  static uuidv4() {
    return (([1e7] as any)+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, (c:any) =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event: StorageEvent) => {
    console.log('storage', event);
    ConfigClient.Init();
  });
}

export { mergeConfigDefaults };
