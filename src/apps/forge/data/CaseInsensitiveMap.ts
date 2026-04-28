export class CaseInsensitiveMap<T> {
  private map: Map<string, T>;

  constructor(entries?: Array<[string, T]>) {
    this.map = new Map<string, T>();
    if (entries) {
      entries.forEach(([key, value]) => this.set(key, value));
    }
  }

  set(key: string, value: T): this {
    this.map.set(key.toUpperCase(), value);
    return this;
  }

  get(key: string): T | undefined {
    return this.map.get(key.toUpperCase());
  }

  has(key: string): boolean {
    return this.map.has(key.toUpperCase());
  }

  delete(key: string): boolean {
    return this.map.delete(key.toUpperCase());
  }

  clear(): void {
    this.map.clear();
  }

  keys(): IterableIterator<string> {
    return this.map.keys();
  }

  values(): IterableIterator<T> {
    return this.map.values();
  }

  entries(): IterableIterator<[string, T]> {
    return this.map.entries();
  }

  forEach(callback: (value: T, key: string) => void): void {
    this.map.forEach((value, key) => callback(value, key));
  }

  get size(): number {
    return this.map.size;
  }
}
