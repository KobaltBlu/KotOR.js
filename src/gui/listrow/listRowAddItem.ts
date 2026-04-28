/**
 * Index of an existing row for the same **object** payload, or -1 for strings / new payloads.
 * Duplicate strings each get a new row; duplicate object references reuse the row.
 */
export function getExistingListRowIndex(listItems: any[], node: any): number {
  if (typeof node === 'string') {
    return -1;
  }
  return listItems.indexOf(node);
}
