import { GameEngineType } from "@/enums/engine/GameEngineType";

export type KotORStoreProductKey = "kotor" | "tsl";

export interface KotORStoreProduct {
  key: KotORStoreProductKey;
  title: string;
  steamAppId: number;
  gogProductId: string;
  logoUrl: string;
}

export const KOTOR_STORE_PRODUCTS: KotORStoreProduct[] = [
  {
    key: "kotor",
    title: "Star Wars: Knights of the Old Republic",
    steamAppId: 32370,
    gogProductId: "1207666283",
    logoUrl: "https://steamcdn-a.akamaihd.net/steam/apps/32370/logo.png",
  },
  {
    key: "tsl",
    title: "Star Wars Knights of the Old Republic II: The Sith Lords",
    steamAppId: 208580,
    gogProductId: "1421404581",
    logoUrl: "https://steamcdn-a.akamaihd.net/steam/apps/208580/logo.png",
  },
];

export function getKotorStoreProductByKey(key: KotORStoreProductKey): KotORStoreProduct | undefined {
  return KOTOR_STORE_PRODUCTS.find((p) => p.key === key);
}

export function getKotorStoreProductByGameKey(gameKey: GameEngineType): KotORStoreProduct | undefined {
  const profileKey: KotORStoreProductKey =
    gameKey === GameEngineType.TSL ? "tsl" : "kotor";
  return getKotorStoreProductByKey(profileKey);
}

export function getSteamStoreUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}/`;
}

export function getSteamWidgetEmbedUrl(appId: number): string {
  return `https://store.steampowered.com/widget/${appId}/`;
}
