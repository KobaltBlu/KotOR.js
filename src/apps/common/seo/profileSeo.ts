import { HOSTED_ORIGIN, SEO_DISCLAIMER, SEO_GAME_FILES_NOTICE } from '@/apps/common/seo/constants';
import { LauncherConfig as forgeConfig } from '@/apps/launcher/profiles/forge';

export type HostedAppPath = '/game/' | '/forge/';

export interface ProfileSeoOptions {
  appPath: HostedAppPath;
  profileKey: string;
}

export interface ProfileSeoPayload {
  title: string;
  description: string;
  canonical: string;
  image: string;
  jsonLd: Record<string, unknown>;
}

export function resolveHostedAssetUrl(relativeOrAbsolute: string, appPath: HostedAppPath): string {
  if (!relativeOrAbsolute) {
    return '';
  }
  if (relativeOrAbsolute.startsWith('http://') || relativeOrAbsolute.startsWith('https://')) {
    return relativeOrAbsolute;
  }
  const normalized = relativeOrAbsolute.replace(/^\.\//, '');
  return `${HOSTED_ORIGIN}${appPath}${normalized}`;
}

function buildGameDescription(fullName: string, profileSeo?: { description?: string }): string {
  if (profileSeo?.description) {
    return profileSeo.description;
  }
  return `Play ${fullName} in your browser with KotOR.js, an independent open-source Odyssey Engine reimplementation. ${SEO_GAME_FILES_NOTICE} ${SEO_DISCLAIMER}`;
}

function buildForgeDescription(profileSeo?: { description?: string }): string {
  if (profileSeo?.description) {
    return profileSeo.description;
  }
  return `KotOR Forge is the browser-based modding suite for the KotOR.js Odyssey Engine. Edit modules, scripts, textures, and more using your own legally obtained PC game files. ${SEO_GAME_FILES_NOTICE} ${SEO_DISCLAIMER}`;
}

export function buildProfileSeo(profile: any, options: ProfileSeoOptions): ProfileSeoPayload {
  const { appPath, profileKey } = options;
  const canonical = `${HOSTED_ORIGIN}${appPath}?key=${profileKey}`;
  const isForgeApp = appPath === '/forge/';

  const seoProfile = isForgeApp ? { ...forgeConfig, key: 'forge' } : profile;
  const profileSeo = seoProfile.seo as { title?: string; description?: string } | undefined;

  const title = profileSeo?.title ?? (
    isForgeApp
      ? 'KotOR Forge — KotOR.js Modding Suite'
      : `${seoProfile.full_name || seoProfile.name} — KotOR.js Browser`
  );

  const description = isForgeApp
    ? buildForgeDescription(profileSeo)
    : buildGameDescription(seoProfile.full_name || seoProfile.name, profileSeo);

  const image = resolveHostedAssetUrl(
    seoProfile.logo || seoProfile.background || '',
    isForgeApp ? '/forge/' : '/game/'
  );

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: isForgeApp ? 'KotOR Forge' : `${seoProfile.full_name || seoProfile.name} (KotOR.js)`,
    applicationCategory: isForgeApp ? 'DeveloperApplication' : 'GameApplication',
    operatingSystem: 'Web browser',
    url: canonical,
    description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    isAccessibleForFree: true,
    license: 'https://www.gnu.org/licenses/gpl-3.0.html',
  };

  if (image) {
    jsonLd.image = image;
  }

  return {
    title,
    description,
    canonical,
    image,
    jsonLd,
  };
}
