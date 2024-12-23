
export type ResourceCacheScopeResource = Map<string, Uint8Array>;
export type ResourceCacheScope = Map<number, ResourceCacheScopeResource>;

/**
 * IResourceCacheScopes interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IResourceCacheScopes.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IResourceCacheScopes {
  override: ResourceCacheScope;
  global:   ResourceCacheScope;
  module:   ResourceCacheScope;
}