/**
 * Capsule file type utilities.
 */

const MOD_ERF_RIM = /\.(mod|erf|rim)$/i;

export function isModFile(filename: string): boolean {
  return /\.mod$/i.test(filename);
}

export function isErfFile(filename: string): boolean {
  return /\.erf$/i.test(filename);
}

export function isRimFile(filename: string): boolean {
  return /\.rim$/i.test(filename);
}

/** True if file is MOD, ERF, or RIM. */
export function isCapsuleFile(filename: string): boolean {
  return MOD_ERF_RIM.test(filename);
}
