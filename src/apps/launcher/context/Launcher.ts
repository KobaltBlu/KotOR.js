
import * as swKotOR from "@/apps/launcher/profiles/kotor";
import * as swKotOR2 from "@/apps/launcher/profiles/tsl";
import * as swForge from "@/apps/launcher/profiles/forge";
import { ConfigClient } from "@/utility/ConfigClient";

export class Launcher {

  static PROFILE_ID: number = 0;
  static GetProfileID(){
    return Launcher.PROFILE_ID++;
  }

  static AppCategories: any = {
    game: { name: 'Games', profiles: [] },
    tools: { name: 'Modding Tools', profiles: [] }
  };
  static AppProfiles: any = {};

  static async InitProfiles(){
    await ConfigClient.Init();
    Launcher.PROFILE_ID = 0;

    Launcher.AppProfiles = {
      kotor: swKotOR.LauncherConfig,
      tsl: swKotOR2.LauncherConfig,
      forge: swForge.LauncherConfig,
    };
    Launcher.AppProfiles.kotor.key = 'kotor';
    Launcher.AppProfiles.tsl.key = 'tsl';
    Launcher.AppProfiles.forge.key = 'forge';

    Launcher.ensureGameProfileSlots();
    Launcher.populateAppCategories();
  }

  /**
   * Restore kotor/tsl/forge profile slots if a failed ConfigClient.set parked a
   * directory handle on Profiles.directory_handle and dropped the game keys.
   */
  static ensureGameProfileSlots(){
    if(!Launcher.AppProfiles.kotor){
      Launcher.AppProfiles.kotor = swKotOR.LauncherConfig;
      Launcher.AppProfiles.kotor.key = 'kotor';
    }
    if(!Launcher.AppProfiles.tsl){
      Launcher.AppProfiles.tsl = swKotOR2.LauncherConfig;
      Launcher.AppProfiles.tsl.key = 'tsl';
    }
    if(!Launcher.AppProfiles.forge){
      Launcher.AppProfiles.forge = swForge.LauncherConfig;
      Launcher.AppProfiles.forge.key = 'forge';
    }

    let profilesRoot = ConfigClient.get(['Profiles']);
    if(typeof profilesRoot !== 'object' || profilesRoot == null || Array.isArray(profilesRoot)){
      ConfigClient.set('Profiles', {});
      profilesRoot = {};
    }

    const strayHandle = profilesRoot.directory_handle;
    if(typeof profilesRoot.kotor === 'undefined' || typeof profilesRoot.tsl === 'undefined' || typeof profilesRoot.forge === 'undefined'){
      const repaired: any = {};
      if(profilesRoot.kotor) repaired.kotor = profilesRoot.kotor;
      if(profilesRoot.tsl) repaired.tsl = profilesRoot.tsl;
      if(profilesRoot.forge) repaired.forge = profilesRoot.forge;
      ConfigClient.set('Profiles', repaired);
    }

    const profileKeys = Object.keys(Launcher.AppProfiles);
    for(let i = 0; i < profileKeys.length; i++){
      const profile_key = profileKeys[i];
      const defaults = Launcher.AppProfiles[profile_key];
      const stored = ConfigClient.get(['Profiles', profile_key]);
      const cached_profile = Object.assign(
        {},
        defaults,
        stored && typeof stored === 'object' ? stored : {},
      );
      cached_profile.key = profile_key;
      cached_profile.sort = i;
      cached_profile.id = Launcher.GetProfileID();
      ConfigClient.set(['Profiles', profile_key], cached_profile);
    }

    if(strayHandle){
      const handleName = typeof strayHandle.name === 'string' ? strayHandle.name.toLowerCase() : '';
      const guess =
        handleName.indexOf('kotor2') >= 0 || handleName.indexOf('kotor 2') >= 0 || handleName.indexOf('tsl') >= 0
          ? 'tsl'
          : handleName.indexOf('kotor') >= 0
            ? 'kotor'
            : undefined;
      if(guess){
        const target = ConfigClient.get(['Profiles', guess]) || {};
        if(!target.directory_handle){
          ConfigClient.set(['Profiles', guess, 'directory_handle'], strayHandle);
        }
      }
      const root = ConfigClient.get(['Profiles']) || {};
      if(root.directory_handle){
        delete root.directory_handle;
        ConfigClient.set('Profiles', root);
      }
    }

    const storedProfiles = ConfigClient.get('Profiles') || {};
    for (const profile_key of Object.keys(Launcher.AppProfiles)) {
      if(storedProfiles[profile_key] && typeof storedProfiles[profile_key] === 'object' && storedProfiles[profile_key].name){
        Launcher.AppProfiles[profile_key] = storedProfiles[profile_key];
      }
    }
  }

  static populateAppCategories(){
    for (const [key, category] of Object.entries(Launcher.AppCategories) as any[]) {
      category.key = key;
      category.profiles = [];
    };

    for (const [key, profile] of Object.entries(Launcher.AppProfiles) as any[]) {
      if(typeof Launcher.AppCategories[profile.category] === 'object'){
        Launcher.AppCategories[profile.category].profiles.push(profile);
      }
    };
  }

  static GetProfileByKey (key: string = 'kotor') {
    const profile = Object.values(Launcher.AppProfiles).find( (p:any) => p.key == key);
    return profile ? profile : Launcher.AppCategories.game.profiles[0];
  }

}
