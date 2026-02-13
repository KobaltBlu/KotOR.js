import React, { createContext, useContext, useEffect, useState } from 'react';

import type { AppCategoriesMap, LauncherProfile } from '../types';

import { ConfigClient } from '../../../utility/ConfigClient';
import { createScopedLogger, LogScope } from '../../../utility/Logger';

const log = createScopedLogger(LogScope.Launcher);

export interface AppProviderValues {
  version: string;
  profileCategories: [AppCategoriesMap, React.Dispatch<React.SetStateAction<AppCategoriesMap>>];
  selectedProfile: [LauncherProfile | undefined, React.Dispatch<React.SetStateAction<LauncherProfile | undefined>>];
  backgroundImage: [string, React.Dispatch<React.SetStateAction<string>>];
  videos: [unknown[], React.Dispatch<React.SetStateAction<unknown[]>>];
  discordWidgetOpen: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
}

const defaultProviderValue: AppProviderValues = {
  version: 'N/A',
  profileCategories: [{} as AppCategoriesMap, () => {}],
  selectedProfile: [undefined, () => {}],
  backgroundImage: ['', () => {}],
  videos: [[], () => {}],
  discordWidgetOpen: [false, () => {}],
};

export const AppContext = createContext<AppProviderValues>(defaultProviderValue);

export function useApp(): AppProviderValues {
  return useContext(AppContext);
}

function rasterizeRemoteImage(img: HTMLImageElement): Promise<ImageBitmap> {
  return new Promise<ImageBitmap>((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      createImageBitmap(canvas)
        .then((bmp) => {
          log.trace('rasterizeRemoteImage() resolved');
          resolve(bmp);
        })
        .catch((err) => {
          log.debug('rasterizeRemoteImage() createImageBitmap failed', err);
          reject(err);
        });
    } else {
      log.warn('rasterizeRemoteImage() no 2d context');
      reject(new Error('No 2d context'));
    }
  });
}

function beautifyBackgroundImage(url: string | undefined = undefined): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (url) {
      const img = new Image();
      img.onload = async () => {
        log.trace('beautifyBackgroundImage() image onload url=%s', url);
        const width = img.width;
        const height = img.height;
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const gradientStart = { x: 0, y: height - height * 0.25 };
        const gradientEnd = { x: width, y: height };
        if (ctx instanceof OffscreenCanvasRenderingContext2D) {
          try {
            const bmp = await rasterizeRemoteImage(img);
            ctx.drawImage(bmp, 0, 0);
            const gradient = ctx.createLinearGradient(0, gradientStart.y, 0, gradientEnd.y);
            gradient.addColorStop(1, 'black');
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(gradientStart.x, gradientStart.y, gradientEnd.x, gradientEnd.y);
            const newBackgroundURL = URL.createObjectURL(
              await canvas.convertToBlob({ type: 'image/webp', quality: 100 })
            );
            log.debug('beautifyBackgroundImage() created blob url');
            resolve(newBackgroundURL);
          } catch (e) {
            log.error('beautifyBackgroundImage() rasterize/draw failed', e);
            reject(e);
          }
        } else {
          log.warn('beautifyBackgroundImage() no OffscreenCanvasRenderingContext2D');
          reject(new Error('No 2d context'));
        }
      };
      img.onerror = (e) => {
        log.error('beautifyBackgroundImage() image onerror', e);
        reject(e);
      };
      img.src = url;
    } else {
      log.debug('beautifyBackgroundImage() no url provided');
      reject(new Error('No url'));
    }
  });
}

export interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = (props) => {
  log.trace('AppProvider render');
  const [profileCategoriesValue, setProfilesCategories] = useState<AppCategoriesMap>({} as AppCategoriesMap);
  const [selectedProfileValue, setSelectedProfile] = useState<LauncherProfile | undefined>(undefined);
  const [backgroundImageValue, setBackgroundImage] = useState<string>('');
  const [videos, setVideos] = useState<unknown[]>([]);
  const [discordWidgetOpen, setDiscordWidgetOpen] = useState<boolean>(false);

  useEffect(() => {
    log.trace('AppProvider useEffect selectedProfile');
    ConfigClient.set(['Launcher', 'selected_profile'], selectedProfileValue?.key || 'kotor');
    if (selectedProfileValue) {
      try {
        beautifyBackgroundImage(selectedProfileValue?.background)
          .then((background: string) => {
            log.debug('AppProvider set background from primary');
            setBackgroundImage(background);
          })
          .catch(() => {
            beautifyBackgroundImage(selectedProfileValue?.background_fallback)
              .then((background: string) => {
                log.debug('AppProvider set background from fallback');
                setBackgroundImage(background);
              })
              .catch(() => {
                log.debug('AppProvider set background raw');
                setBackgroundImage(selectedProfileValue?.background ?? '');
              });
          });
      } catch (e) {
        log.error('AppProvider beautifyBackgroundImage error', e);
        setBackgroundImage(selectedProfileValue?.background ?? '');
      }
    }
  }, [selectedProfileValue]);

  useEffect(() => {
    log.trace('AppProvider useEffect fetch YouTube videos');
    fetch('https://swkotor.net/api/media/youtube/latest')
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Failed to fetch YouTube videos');
      })
      .then((data: { videos?: unknown[] }) => {
        if (data?.videos) {
          log.info('AppProvider loaded %s YouTube videos', String(data.videos.length));
          setVideos([...data.videos]);
        }
      })
      .catch((e) => {
        log.error('AppProvider fetch YouTube videos failed', e);
      });
  }, []);

  const providerValue: AppProviderValues = {
    version: process.env.VERSION || 'N/A',
    profileCategories: [profileCategoriesValue, setProfilesCategories],
    selectedProfile: [selectedProfileValue, setSelectedProfile],
    backgroundImage: [backgroundImageValue, setBackgroundImage],
    videos: [videos, setVideos],
    discordWidgetOpen: [discordWidgetOpen, setDiscordWidgetOpen],
  };

  log.trace('AppProvider providing value');
  return <AppContext.Provider value={providerValue}>{props.children}</AppContext.Provider>;
};
