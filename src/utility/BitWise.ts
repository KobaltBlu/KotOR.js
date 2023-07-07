export class BitWise {
  static InstanceOf(value: number, mask: number): boolean {
    if(typeof value === 'undefined') return false;
    return (value & mask) == mask;
  }

  static InstanceOfObject(value: any, mask: number): any {
    if(typeof value !== 'object') return false;
    return (value?.objectType & mask) == mask ? value : undefined;
  }
}