import type { ProfileSeoPayload } from '@/apps/common/seo/profileSeo';

const JSON_LD_ID = 'kotor-js-profile-seo-jsonld';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

function upsertJsonLd(jsonLd: Record<string, unknown>) {
  let element = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement('script');
    element.id = JSON_LD_ID;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(jsonLd, null, 2);
}

export function applyProfileSeo(payload: ProfileSeoPayload) {
  document.title = payload.title;

  upsertMeta('name', 'description', payload.description);
  upsertMeta('name', 'robots', 'index, follow');

  upsertLink('canonical', payload.canonical);

  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', 'KotOR.js');
  upsertMeta('property', 'og:locale', 'en_US');
  upsertMeta('property', 'og:title', payload.title);
  upsertMeta('property', 'og:description', payload.description);
  upsertMeta('property', 'og:url', payload.canonical);
  if (payload.image) {
    upsertMeta('property', 'og:image', payload.image);
  }

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', payload.title);
  upsertMeta('name', 'twitter:description', payload.description);
  if (payload.image) {
    upsertMeta('name', 'twitter:image', payload.image);
  }

  upsertJsonLd(payload.jsonLd);
}
