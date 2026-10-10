export interface OccupancyTransitionHooks<T> {
  onEnter(object: T): void;
  onExit(object: T): void;
}

export type OccupancyTransition = 'entered' | 'exited' | 'unchanged';

/**
 * Maintains persistent-zone membership in insertion order.
 */
export class PersistentZoneOccupancy<T> {
  constructor(private readonly objectsInside: T[]) {}

  contains(object: T): boolean {
    return this.objectsInside.indexOf(object) >= 0;
  }

  add(object: T): boolean {
    if(this.contains(object)) return false;
    this.objectsInside.push(object);
    return true;
  }

  remove(object: T): boolean {
    const index = this.objectsInside.indexOf(object);
    if(index < 0) return false;
    this.objectsInside.splice(index, 1);
    return true;
  }

  applyTransition(
    object: T,
    isInside: boolean,
    hooks: OccupancyTransitionHooks<T>
  ): OccupancyTransition {
    if(isInside){
      if(!this.add(object)) return 'unchanged';
      hooks.onEnter(object);
      return 'entered';
    }

    if(!this.remove(object)) return 'unchanged';
    hooks.onExit(object);
    return 'exited';
  }
}
