import * as swForge from '@/apps/launcher/profiles/forge';
import * as swKotOR from '@/apps/launcher/profiles/kotor';
import * as swKotOR2 from '@/apps/launcher/profiles/tsl';
import type { AppCategoriesMap, LauncherProfile, ProfileCategory } from '@/apps/launcher/types';
import { ConfigClient } from '@/utility/ConfigClient';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Launcher);

export class Launcher {
  static PROFILE_ID: number = 0;
  static AppCategories: AppCategoriesMap = {
    game: { name: 'Games', profiles: [] },
    tools: { name: 'Modding Tools', profiles: [] },
  };
  static AppProfiles: Record<string, LauncherProfile> = {};

  static GetProfileID(): number {
    const id = Launcher.PROFILE_ID++;
    log.trace('GetProfileID() returned %s', String(id));
    return id;
  }

  static async InitProfiles(): Promise<void> {
    log.trace('InitProfiles() started');
    await ConfigClient.Init();
    Launcher.PROFILE_ID = 0;

    const kotorConfig = { ...swKotOR.LauncherConfig, key: 'kotor' };
    const tslConfig = { ...swKotOR2.LauncherConfig, key: 'tsl' };
    const forgeConfig = { ...swForge.LauncherConfig, key: 'forge' };

    Launcher.AppProfiles['kotor'] = kotorConfig;
    Launcher.AppProfiles['tsl'] = tslConfig;
    Launcher.AppProfiles['forge'] = forgeConfig;

    if (typeof ConfigClient.get(['Profiles']) === 'undefined') {
      log.debug('InitProfiles() initializing Profiles in config');
      ConfigClient.set('Profiles', {});
    }

    const profileKeys = Object.keys(Launcher.AppProfiles);
    for (let i = 0; i < profileKeys.length; i++) {
      const profile_key = profileKeys[i];
      let cached_profile = ConfigClient.get(['Profiles', profile_key]) as LauncherProfile | undefined;
      if (typeof cached_profile === 'undefined') {
        cached_profile = { ...Launcher.AppProfiles[profile_key], key: profile_key, sort: i, id: Launcher.GetProfileID() };
      } else {
        cached_profile = Object.assign({}, Launcher.AppProfiles[profile_key], cached_profile, {
          key: profile_key,
          sort: i,
          id: Launcher.GetProfileID(),
        });
      }
      ConfigClient.set(['Profiles', profile_key], cached_profile);
    }
    Launcher.AppProfiles = ConfigClient.get('Profiles') as Record<string, LauncherProfile>;

    for (const [key, category] of Object.entries(Launcher.AppCategories)) {
      (category as ProfileCategory).key = key;
      (category as ProfileCategory).profiles = [];
    }

    for (const [_key, profile] of Object.entries(Launcher.AppProfiles)) {
      const cat = Launcher.AppCategories[profile.category];
      if (typeof cat === 'object' && cat) {
        cat.profiles.push(profile);
      }
    }
    log.info('InitProfiles() completed profiles=%s categories=%s', String(Object.keys(Launcher.AppProfiles).length), String(Object.keys(Launcher.AppCategories).length));
  }

  static GetProfileByKey(key: string = 'kotor'): LauncherProfile | undefined {
    log.trace('GetProfileByKey() key=%s', key);
    const profile = Object.values(Launcher.AppProfiles).find((p: LauncherProfile) => p.key === key);
    if (profile) {
      return profile;
    }
    const fallback = Launcher.AppCategories.game?.profiles?.[0];
    log.debug('GetProfileByKey() no profile for key=%s, fallback=%s', key, fallback ? 'yes' : 'no');
    return fallback;
  }
}
