/**
 * Value type for GFF fields used in Forge form editors (JRL, IFO, GIT, FAC, ARE).
 * getFieldByLabel().getValue() / setValue() accept these for text/number/checkbox bindings.
 */
export type GFFFieldValue = string | number | boolean;
