export class BitWise {
  static InstanceOf(value: number, mask: number): boolean {
    if(typeof value === 'undefined') return false;
    return (value & mask) == mask;
  }
}