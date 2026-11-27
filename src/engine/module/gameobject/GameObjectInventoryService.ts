import type { Item } from '@engine/module/Item';
import type { GameObject } from '@engine/module/GameObject';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class GameObjectInventoryService {
  constructor(
    private readonly host: GameObject,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  getInventory(): Item[] {
    return this.host.inventory;
  }

  hasItemByTag(sTag = ''){
    return !!this.host.getItemByTag(sTag);
  }

  addItem(item: Item){
    item.load();
    const tag = (item.getTag() || '').toLowerCase();
    const maxStack = (item.baseItem?.stacking | 0) || 1;
    let remaining = item.getStackSize() | 0;
    let lastMerged: Item = undefined;

    for(let i = 0; i < this.host.inventory.length && remaining > 0; i++){
      const existing = this.host.inventory[i];
      if((existing.getTag() || '').toLowerCase() !== tag) continue;
      const room = maxStack - (existing.getStackSize() | 0);
      if(room <= 0) continue;
      const add = Math.min(room, remaining);
      existing.setStackSize((existing.getStackSize() | 0) + add);
      remaining -= add;
      lastMerged = existing;
    }
    if(remaining <= 0){
      item.setStackSize(0);
      return lastMerged || item;
    }
    item.setStackSize(remaining);
    this.host.inventory.push(item);
    return item;
  }

  removeItem(item: Item, nCount = 1): Item {
    return this.removeItemByTag(item.getTag(), nCount);
  }

  removeItemByTag(sTag = '', nCount = 1): Item {
    const existing = this.host.getItemByTag(sTag);
    if(!existing) return undefined;
    const idx = this.host.inventory.indexOf(existing);
    if(nCount < existing.getStackSize()){
      existing.setStackSize(existing.getStackSize() - nCount);
    }else{
      this.host.inventory.splice(idx, 1);
    }
    return existing.clone();
  }

  getItem(item: Item): Item {
    if(!item) return undefined;
    for(let i = 0; i < this.host.inventory.length; i++){
      if(this.host.inventory[i] == item) return this.host.inventory[i];
    }
    return undefined;
  }

  getItemByTag(sTag = ''): Item {
    const tag = (sTag || '').toLowerCase();
    const inventory = this.host.getInventory();
    for(let i = 0; i < inventory.length; i++){
      const item = inventory[i];
      if((item.getTag() || '').toLowerCase() == tag) return item;
    }
    return undefined;
  }

  getGold(): number {
    return this.host.isPartyMember() ? this.runtime.getGold?.() ?? 0 : 0;
  }

  addGold(nGold = 0): void {
    if(this.host.isPartyMember()) this.runtime.addGold?.(nGold);
  }

  removeGold(nGold = 0): void {
    if(this.host.isPartyMember()) this.runtime.addGold?.(-Math.abs(nGold));
  }
}
