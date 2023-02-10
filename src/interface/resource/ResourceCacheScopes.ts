
export type ResourceCacheScopeResource = Map<string, Buffer>;
export type ResourceCacheScope = Map<number, ResourceCacheScopeResource>;

export interface ResourceCacheScopes {
  override: ResourceCacheScope;
  global:   ResourceCacheScope;
  module:   ResourceCacheScope;
}