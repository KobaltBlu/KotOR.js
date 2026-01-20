

import * as swKotOR from "../profiles/kotor";
import * as swKotOR2 from "../profiles/tsl";
import * as swForge from "../profiles/forge";
import { ConfigClient } from "../../../utility/ConfigClient";

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

    Launcher.AppProfiles['kotor'] = swKotOR.LauncherConfig;
    Launcher.AppProfiles['kotor'].key = 'kotor';
  
    Launcher.AppProfiles['tsl'] = swKotOR2.LauncherConfig;
    Launcher.AppProfiles['tsl'].key = 'tsl';
  
    Launcher.AppProfiles['forge'] = swForge.LauncherConfig;
    Launcher.AppProfiles['forge'].key = 'forge';
  
    if(typeof ConfigClient.get(['Profiles']) === 'undefined'){
      ConfigClient.set('Profiles', {});
    }
  
    const _profiles = Object.keys(Launcher.AppProfiles);
    for(let i = 0; i < _profiles.length; i++){
      const profile_key = _profiles[i];
      let cached_profile = ConfigClient.get(['Profiles', profile_key]);
      if(typeof cached_profile == 'undefined'){
        cached_profile = Launcher.AppProfiles[profile_key];
        cached_profile.key = profile_key;
        cached_profile.sort = i;
        cached_profile.id = Launcher.GetProfileID();
      }else{
        cached_profile = Object.assign(Launcher.AppProfiles[profile_key], cached_profile);
        cached_profile.key = profile_key;
        cached_profile.sort = i;
        cached_profile.id = Launcher.GetProfileID();
      }
      ConfigClient.set(['Profiles', profile_key], cached_profile);
    }
    Launcher.AppProfiles = ConfigClient.get('Profiles');
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