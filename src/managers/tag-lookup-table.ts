/**
 * Pure retail object_lookup_table helpers.
 * FindTagPositionInTable / AddObjectToLookupTable.
 */

export type TagLookupNode = { tag: string; id: number };

/** First index where tag >= needle (lower_bound). */
export function findTagPositionInTable(table: TagLookupNode[], tag: string): number {
  const needle = (tag ?? '').toLowerCase();
  let lo = 0;
  let hi = table.length;
  while(lo < hi){
    const mid = (lo + hi) >> 1;
    if(table[mid].tag < needle){
      lo = mid + 1;
    }else{
      hi = mid;
    }
  }
  return lo;
}

/** Insert after last equal-tag entry. */
export function addObjectToLookupTable(table: TagLookupNode[], tag: string, id: number): void {
  const key = (tag ?? '').toLowerCase();
  let i = findTagPositionInTable(table, key);
  while(i < table.length && table[i].tag === key){
    i++;
  }
  table.splice(i, 0, { tag: key, id });
}

/** Remove by tag + id. */
export function removeObjectFromLookupTable(table: TagLookupNode[], tag: string, id: number): boolean {
  const key = (tag ?? '').toLowerCase();
  let i = findTagPositionInTable(table, key);
  while(i < table.length){
    if(table[i].tag !== key) break;
    if(table[i].id === id){
      table.splice(i, 1);
      return true;
    }
    i++;
  }
  return false;
}

/** Remove every entry for this object id. */
export function removeObjectFromLookupTableById(table: TagLookupNode[], id: number): void {
  for(let i = table.length - 1; i >= 0; i--){
    if(table[i].id === id){
      table.splice(i, 1);
    }
  }
}

/**
 * FindObjectByTagOrdinal — return id at firstMatch + nth among equal tags.
 * Returns undefined if not found.
 */
export function findObjectIdByTagOrdinal(
  table: TagLookupNode[],
  tag: string,
  nth: number,
  matchesType?: (id: number) => boolean
): number | undefined {
  const key = (tag ?? '').toLowerCase();
  let i = findTagPositionInTable(table, key);
  let remaining = nth | 0;
  while(i < table.length && table[i].tag === key){
    const id = table[i].id;
    if(!matchesType || matchesType(id)){
      if(remaining <= 0){
        return id;
      }
      remaining--;
    }
    i++;
  }
  return undefined;
}
